using GGHub.Application.DTOs.Common;
using GGHub.Application.Dtos.DownloadAnalytics;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services
{
    public class DownloadAnalyticsService : IDownloadAnalyticsService
    {
        private readonly GGHubDbContext _context;
        private readonly ILogger<DownloadAnalyticsService> _logger;

        /// <summary>Whitelist. Dışındaki bir tip gelirse satır hiç yazılmaz.</summary>
        private static readonly HashSet<string> AllowedEventTypes = new(StringComparer.Ordinal)
        {
            "page_view", "auto_redirect", "redirect_cancel", "store_click", "web_click"
        };

        private static readonly HashSet<string> AllowedTargets = new(StringComparer.Ordinal)
        {
            "app_store", "google_play", "web"
        };

        /// <summary>Mağazaya ulaşmış sayılan olaylar (huninin dönüşüm adımı).</summary>
        private static readonly string[] StoreReachEvents = { "auto_redirect", "store_click" };

        public DownloadAnalyticsService(GGHubDbContext context, ILogger<DownloadAnalyticsService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task CollectAsync(DownloadEventForCreationDto dto, DownloadEventContext context)
        {
            var eventType = dto.EventType?.Trim();
            if (string.IsNullOrEmpty(eventType) || !AllowedEventTypes.Contains(eventType))
            {
                _logger.LogDebug("download-analytics: bilinmeyen olay tipi atlandi ({EventType})", eventType);
                return;
            }

            if (!Guid.TryParse(dto.VisitId, out var visitId))
            {
                _logger.LogDebug("download-analytics: gecersiz visitId atlandi");
                return;
            }

            var userAgent = context.UserAgent;
            var target = dto.Target?.Trim();

            var entity = new DownloadPageEvent
            {
                EventType = eventType,
                VisitId = visitId,
                OccurredAt = DateTime.UtcNow,

                // Platform istemciden de gelir ama UA'dan YENIDEN turetiliyor:
                // istemciden gelen hicbir siniflandirmaya guvenilmez.
                Platform = UserAgentClassifier.Platform(userAgent),
                DeviceType = UserAgentClassifier.DeviceType(userAgent),
                Browser = UserAgentClassifier.Browser(userAgent),
                IsBot = UserAgentClassifier.IsBot(userAgent),

                // Metinler REDDEDILMEZ, kesilir: uzun bir kampanya adi yuzunden
                // butun olayi kaybetmek olcumu daha cok bozar.
                UtmSource = Clip(dto.UtmSource, 64),
                UtmMedium = Clip(dto.UtmMedium, 64),
                UtmCampaign = Clip(dto.UtmCampaign, 96),
                UtmContent = Clip(dto.UtmContent, 96),
                UtmTerm = Clip(dto.UtmTerm, 96),
                ClickIdSource = Clip(dto.ClickIdSource, 16),
                ReferrerHost = Clip(dto.ReferrerHost, 128),
                Language = Clip(dto.Language, 16),
                CountryCode = Clip(context.CountryCode, 2)?.ToUpperInvariant(),
                VisitorHash = Clip(context.VisitorHash, 32),

                Target = target is not null && AllowedTargets.Contains(target) ? target : null,
                DwellMs = Clamp(dto.DwellMs, 0, 3_600_000),
                SecondsLeft = Clamp(dto.SecondsLeft, 0, 60),
            };

            _context.DownloadPageEvents.Add(entity);
            await _context.SaveChangesAsync();
        }

        public async Task<DownloadAnalyticsSummaryDto> GetSummaryAsync(DownloadAnalyticsFilterParams filter)
        {
            var query = BuildQuery(filter);

            // Tek tarama, bellekte grupla: olay tipi basina birden cok COUNT sorgusu
            // atmak yerine tipe gore tek gruplama uzak DB'de belirgin sekilde ucuz.
            var byType = await query
                .GroupBy(e => e.EventType)
                .Select(g => new { Type = g.Key, Count = g.Count() })
                .ToListAsync();

            var byTarget = await query
                .Where(e => e.Target != null)
                .GroupBy(e => e.Target!)
                .Select(g => new { Target = g.Key, Count = g.Count() })
                .ToListAsync();

            var uniqueVisits = await query.Select(e => e.VisitId).Distinct().CountAsync();
            var uniqueVisitors = await query.Where(e => e.VisitorHash != null)
                .Select(e => e.VisitorHash!).Distinct().CountAsync();

            // Mağazaya ULAŞAN ZİYARET sayısı (olay değil): bir ziyaret hem otomatik
            // yönlendirilip hem tıklarsa iki kez sayılmamalı.
            var storeReachVisits = await query
                .Where(e => StoreReachEvents.Contains(e.EventType))
                .Select(e => e.VisitId).Distinct().CountAsync();

            // Bot sayımı filtreden bağımsız olmalı: "ne kadarını eledik" sorusunun cevabı.
            var botHits = await BuildQuery(filter, forceIncludeBots: true).CountAsync(e => e.IsBot);

            int Count(string type) => byType.FirstOrDefault(x => x.Type == type)?.Count ?? 0;
            int TargetCount(string target) => byTarget.FirstOrDefault(x => x.Target == target)?.Count ?? 0;

            return new DownloadAnalyticsSummaryDto
            {
                PageViews = Count("page_view"),
                UniqueVisits = uniqueVisits,
                UniqueVisitors = uniqueVisitors,
                AutoRedirects = Count("auto_redirect"),
                StoreClicks = Count("store_click"),
                WebClicks = Count("web_click"),
                Cancels = Count("redirect_cancel"),
                AppStoreTotal = TargetCount("app_store"),
                GooglePlayTotal = TargetCount("google_play"),
                StoreReachRate = uniqueVisits == 0 ? 0 : Math.Round(storeReachVisits * 100.0 / uniqueVisits, 1),
                BotHits = botHits,
            };
        }

        public async Task<List<DownloadAnalyticsTimePointDto>> GetTimeSeriesAsync(DownloadAnalyticsFilterParams filter)
        {
            var query = BuildQuery(filter);

            var rows = await query
                .GroupBy(e => e.OccurredAt.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    PageViews = g.Count(e => e.EventType == "page_view"),
                    UniqueVisits = g.Select(e => e.VisitId).Distinct().Count(),
                    StoreReach = g.Where(e => e.EventType == "auto_redirect" || e.EventType == "store_click")
                                  .Select(e => e.VisitId).Distinct().Count(),
                })
                .OrderBy(x => x.Date)
                .ToListAsync();

            return rows.Select(r => new DownloadAnalyticsTimePointDto
            {
                Date = r.Date,
                PageViews = r.PageViews,
                UniqueVisits = r.UniqueVisits,
                StoreReach = r.StoreReach,
            }).ToList();
        }

        public async Task<List<DownloadAnalyticsBreakdownDto>> GetBreakdownAsync(string dimension, DownloadAnalyticsFilterParams filter)
        {
            var query = BuildQuery(filter);

            // Boyut seciciler DERLENMIS ifadeler: kullanicidan gelen dizge asla
            // sorguya gomulmez, yalnizca bu switch'ten bir dala eslesir.
            System.Linq.Expressions.Expression<Func<DownloadPageEvent, string>> selector = dimension switch
            {
                "utmSource" => e => e.UtmSource ?? "(bilinmiyor)",
                "utmMedium" => e => e.UtmMedium ?? "(bilinmiyor)",
                "utmCampaign" => e => e.UtmCampaign ?? "(bilinmiyor)",
                "utmContent" => e => e.UtmContent ?? "(bilinmiyor)",
                "platform" => e => e.Platform ?? "(bilinmiyor)",
                "country" => e => e.CountryCode ?? "(bilinmiyor)",
                "browser" => e => e.Browser ?? "(bilinmiyor)",
                "referrer" => e => e.ReferrerHost ?? "(dogrudan)",
                // Kanal onceligi: utm_source > clickIdSource > uygulama ici tarayici
                // > referrer > direct. KOLONA YAZILMAZ, sorgu aninda turetilir; kural
                // yanlis cikarsa migration olmadan geriye donuk duzeltilir.
                _ => e => e.UtmSource != null ? e.UtmSource
                        : e.ClickIdSource != null ? e.ClickIdSource
                        : (e.Browser == "instagram" || e.Browser == "facebook" || e.Browser == "tiktok") ? e.Browser
                        : e.ReferrerHost != null ? e.ReferrerHost
                        : "direct",
            };

            var rows = await query
                .GroupBy(selector)
                .Select(g => new
                {
                    Key = g.Key,
                    PageViews = g.Count(e => e.EventType == "page_view"),
                    UniqueVisits = g.Select(e => e.VisitId).Distinct().Count(),
                    StoreReach = g.Where(e => e.EventType == "auto_redirect" || e.EventType == "store_click")
                                  .Select(e => e.VisitId).Distinct().Count(),
                })
                .OrderByDescending(x => x.UniqueVisits)
                .Take(20)
                .ToListAsync();

            return rows.Select(r => new DownloadAnalyticsBreakdownDto
            {
                Key = r.Key,
                PageViews = r.PageViews,
                UniqueVisits = r.UniqueVisits,
                StoreReach = r.StoreReach,
                ConversionRate = r.UniqueVisits == 0 ? 0 : Math.Round(r.StoreReach * 100.0 / r.UniqueVisits, 1),
            }).ToList();
        }

        public async Task<DownloadAnalyticsFunnelDto> GetFunnelAsync(DownloadAnalyticsFilterParams filter)
        {
            var query = BuildQuery(filter);

            // Huni ZIYARET seviyesindedir; olay saymak ayni ziyareti birden cok
            // adimda sisirirdi.
            async Task<int> VisitsWith(string type) =>
                await query.Where(e => e.EventType == type).Select(e => e.VisitId).Distinct().CountAsync();

            var visits = await query.Select(e => e.VisitId).Distinct().CountAsync();
            var autoRedirect = await VisitsWith("auto_redirect");
            var cancelled = await VisitsWith("redirect_cancel");
            var manualClick = await VisitsWith("store_click");
            var webVersion = await VisitsWith("web_click");

            var reachedStore = await query
                .Where(e => StoreReachEvents.Contains(e.EventType))
                .Select(e => e.VisitId).Distinct().CountAsync();

            // Otomatik yonlendirmeye uygun ziyaret = mobil platform tespit edilmis olan.
            var eligible = await query
                .Where(e => e.EventType == "page_view" && (e.Platform == "ios" || e.Platform == "android"))
                .Select(e => e.VisitId).Distinct().CountAsync();

            var anyAction = await query
                .Where(e => e.EventType != "page_view")
                .Select(e => e.VisitId).Distinct().CountAsync();

            return new DownloadAnalyticsFunnelDto
            {
                Visits = visits,
                AutoRedirectEligible = eligible,
                ReachedStore = reachedStore,
                Cancelled = cancelled,
                ManualStoreClick = manualClick,
                WebVersion = webVersion,
                NoAction = Math.Max(0, visits - anyAction),
            };
        }

        public async Task<PaginatedResult<DownloadPageEventDto>> GetEventsAsync(DownloadAnalyticsFilterParams filter)
        {
            var query = BuildQuery(filter);
            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(e => e.OccurredAt)
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(e => new DownloadPageEventDto
                {
                    Id = e.Id,
                    EventType = e.EventType,
                    VisitId = e.VisitId,
                    OccurredAt = e.OccurredAt,
                    Channel = e.UtmSource != null ? e.UtmSource
                            : e.ClickIdSource != null ? e.ClickIdSource
                            : (e.Browser == "instagram" || e.Browser == "facebook" || e.Browser == "tiktok") ? e.Browser
                            : e.ReferrerHost != null ? e.ReferrerHost
                            : "direct",
                    Platform = e.Platform,
                    DeviceType = e.DeviceType,
                    Browser = e.Browser,
                    CountryCode = e.CountryCode,
                    UtmSource = e.UtmSource,
                    UtmCampaign = e.UtmCampaign,
                    ReferrerHost = e.ReferrerHost,
                    Target = e.Target,
                    IsBot = e.IsBot,
                })
                .ToListAsync();

            return new PaginatedResult<DownloadPageEventDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = filter.Page,
                PageSize = filter.PageSize,
            };
        }

        public async Task<int> PurgeOlderThanAsync(DateTime cutoffUtc, int batchSize, CancellationToken cancellationToken)
        {
            // Partili silme: tek buyuk DELETE uzun kilit alir ve ingest'i bloklar.
            var totalDeleted = 0;
            while (!cancellationToken.IsCancellationRequested)
            {
                var deleted = await _context.DownloadPageEvents
                    .Where(e => e.OccurredAt < cutoffUtc)
                    .OrderBy(e => e.Id)
                    .Take(batchSize)
                    .ExecuteDeleteAsync(cancellationToken);

                totalDeleted += deleted;
                if (deleted < batchSize) break;
            }

            return totalDeleted;
        }

        private IQueryable<DownloadPageEvent> BuildQuery(DownloadAnalyticsFilterParams filter, bool forceIncludeBots = false)
        {
            var query = _context.DownloadPageEvents.AsNoTracking();

            if (filter.StartDate.HasValue)
            {
                var start = DateTime.SpecifyKind(filter.StartDate.Value.Date, DateTimeKind.Utc);
                query = query.Where(e => e.OccurredAt >= start);
            }

            if (filter.EndDate.HasValue)
            {
                // Bitiş günü DAHİL olmalı; kullanıcı "1-7 Temmuz" derken 7'yi de kastediyor.
                var end = DateTime.SpecifyKind(filter.EndDate.Value.Date.AddDays(1), DateTimeKind.Utc);
                query = query.Where(e => e.OccurredAt < end);
            }

            if (!filter.IncludeBots && !forceIncludeBots)
                query = query.Where(e => !e.IsBot);

            if (!string.IsNullOrWhiteSpace(filter.UtmSource))
                query = query.Where(e => e.UtmSource == filter.UtmSource);

            if (!string.IsNullOrWhiteSpace(filter.UtmCampaign))
                query = query.Where(e => e.UtmCampaign == filter.UtmCampaign);

            if (!string.IsNullOrWhiteSpace(filter.Platform))
                query = query.Where(e => e.Platform == filter.Platform);

            if (!string.IsNullOrWhiteSpace(filter.CountryCode))
                query = query.Where(e => e.CountryCode == filter.CountryCode);

            return query;
        }

        private static string? Clip(string? value, int maxLength)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            var trimmed = value.Trim();
            return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
        }

        private static int? Clamp(int? value, int min, int max) =>
            value is null ? null : Math.Clamp(value.Value, min, max);
    }
}
