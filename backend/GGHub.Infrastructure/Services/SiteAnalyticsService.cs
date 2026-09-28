using System.Text;
using GGHub.Application.DTOs.Common;
using GGHub.Application.Dtos.SiteAnalytics;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Site geneli davranis/trafik analitigi.
    ///
    /// Iki katman var:
    ///  - OLAY katmani: SiteEvents uzerinde dogrudan LINQ (sayfa, rota, bolum, isi haritasi, etkilesim).
    ///  - OTURUM katmani: oturum basina tek satira indirgenmis ham SQL (<see cref="SessionSql"/>).
    ///    Giris/cikis sayfasi, sure, hemen cikma gibi hesaplar oturum satirinda yapilir; EF'in
    ///    GroupBy icinde "ilk/son eleman" secimini ceviremedigi yerde Postgres'in
    ///    ARRAY_AGG ... FILTER'i kullaniliyor. Sorgu composable: LINQ ile uzerine filtre/gruplama biner.
    /// </summary>
    public class SiteAnalyticsService : ISiteAnalyticsService
    {
        private readonly GGHubDbContext _context;
        private readonly ILogger<SiteAnalyticsService> _logger;

        private static readonly HashSet<string> AllowedEventTypes = new(StringComparer.Ordinal)
        {
            "page_view", "page_leave", "action"
        };

        /// <summary>
        /// Etkilesim adlari whitelist'i. Istemci baska bir ad gonderirse "other" olur; boylece tablo
        /// yazim hatalari ve keyfi adlarla kirlenmez.
        /// </summary>
        private static readonly HashSet<string> AllowedActions = new(StringComparer.Ordinal)
        {
            "search", "review_create", "wishlist_add", "wishlist_remove", "favorite_add", "favorite_remove",
            "list_add", "list_create", "post_create", "login", "register", "share", "follow", "message_send",
            "translate_request", "other"
        };

        /// <summary>
        /// ROTA KATALOGU: sablon -> bolum. Istemcideki normalizer (site-analytics.ts) ayni sablonlari
        /// uretir; ikisi el ile eslenik tutulur. Katalog disi rota "/other" olarak yazilir, boylece
        /// tabloya keyfi yol asla girmez.
        /// </summary>
        private static readonly Dictionary<string, string> RouteSections = new(StringComparer.Ordinal)
        {
            ["/"] = "home",
            ["/discover"] = "discover",
            ["/agenda"] = "agenda",
            ["/games/[id]"] = "games",
            ["/lists"] = "lists",
            ["/lists/[listId]"] = "lists",
            ["/my-lists"] = "lists",
            ["/wishlist"] = "collection",
            ["/favorites"] = "collection",
            ["/posts/[postId]"] = "posts",
            ["/profile"] = "profiles",
            ["/profiles/[username]"] = "profiles",
            ["/reviews/[reviewId]"] = "reviews",
            ["/messages"] = "messages",
            ["/messages/[username]"] = "messages",
            ["/login"] = "auth",
            ["/register"] = "auth",
            ["/forgot-password"] = "auth",
            ["/reset-password"] = "auth",
            ["/about"] = "info",
            ["/ai-bots"] = "info",
            ["/privacy"] = "info",
            ["/terms"] = "info",
            ["/child-safety"] = "info",
            ["/data-deletion"] = "info",
            ["/support"] = "info",
            ["/my-reports"] = "info",
            ["/birthday"] = "info",
            ["/marketing"] = "info",
            ["/download"] = "download",
            ["/download-app"] = "download",
            ["/other"] = "other",
        };

        private static readonly HashSet<string> ContentSections = new(StringComparer.Ordinal)
        {
            "games", "profiles", "lists", "posts", "reviews"
        };

        private static readonly HashSet<string> InAppBrowsers = new(StringComparer.Ordinal)
        {
            "instagram", "facebook", "tiktok"
        };

        public SiteAnalyticsService(GGHubDbContext context, ILogger<SiteAnalyticsService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public static string SectionOf(string route) =>
            RouteSections.TryGetValue(route, out var section) ? section : "other";

        // ------------------------------------------------------------------ yazma

        public async Task CollectAsync(SiteEventForCreationDto dto, SiteEventContext context)
        {
            var eventType = dto.EventType?.Trim();
            if (string.IsNullOrEmpty(eventType) || !AllowedEventTypes.Contains(eventType)) return;
            if (!Guid.TryParse(dto.SessionId, out var sessionId) || sessionId == Guid.Empty) return;

            var route = dto.Route?.Trim() ?? string.Empty;
            if (!RouteSections.ContainsKey(route)) route = "/other";

            string? action = null;
            if (eventType == "action")
            {
                action = dto.ActionName?.Trim();
                if (string.IsNullOrEmpty(action)) return;
                if (!AllowedActions.Contains(action)) action = "other";
            }

            var userAgent = context.UserAgent;

            var entity = new SiteEvent
            {
                EventType = eventType,
                SessionId = sessionId,
                OccurredAt = DateTime.UtcNow,
                UserId = context.UserId,
                IsInternal = context.IsAdmin,
                Route = route,
                // Dinamik segment degeri yalnizca icerik bolumlerinde anlamli; digerlerinde atilir.
                PathKey = ContentSections.Contains(SectionOf(route)) ? Clip(dto.PathKey, 96) : null,
                ActionName = action,
                Locale = Clip(dto.Locale, 8),
                Platform = UserAgentClassifier.Platform(userAgent),
                DeviceType = UserAgentClassifier.DeviceType(userAgent),
                Browser = UserAgentClassifier.Browser(userAgent),
                IsBot = UserAgentClassifier.IsBot(userAgent),
                UtmSource = Clip(dto.UtmSource, 64),
                UtmMedium = Clip(dto.UtmMedium, 64),
                UtmCampaign = Clip(dto.UtmCampaign, 96),
                ClickIdSource = Clip(dto.ClickIdSource, 16),
                ReferrerHost = Clip(dto.ReferrerHost, 128),
                Language = Clip(dto.Language, 16),
                CountryCode = Clip(context.CountryCode, 2)?.ToUpperInvariant(),
                VisitorHash = Clip(context.VisitorHash, 32),
                DwellMs = eventType == "page_leave" ? Clamp(dto.DwellMs, 0, 3_600_000) : null,
                ScrollDepth = eventType == "page_leave" ? Clamp(dto.ScrollDepth, 0, 100) : null,
            };

            _context.SiteEvents.Add(entity);
            await _context.SaveChangesAsync();
        }

        // ------------------------------------------------------------------ ozet

        public async Task<SiteAnalyticsSummaryDto> GetSummaryAsync(SiteAnalyticsFilterParams filter)
        {
            var events = EventQuery(filter);
            var sessions = SessionQuery(filter);

            var pageViews = await events.CountAsync(e => e.EventType == "page_view");
            var actions = await events.CountAsync(e => e.EventType == "action");
            var uniqueVisitors = await events.Where(e => e.VisitorHash != null).Select(e => e.VisitorHash!).Distinct().CountAsync();

            var agg = await sessions
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    Sessions = g.Count(),
                    Registered = g.Count(s => s.UserId != null),
                    RegisteredUsers = g.Where(s => s.UserId != null).Select(s => s.UserId).Distinct().Count(),
                    AvgDuration = g.Average(s => (double?)s.DurationSeconds),
                    AvgPages = g.Average(s => (double?)s.PageViews),
                    AvgScroll = g.Average(s => s.AvgScrollDepth),
                    Bounces = g.Count(s => s.PageViews <= 1),
                    WithAction = g.Count(s => s.Actions > 0),
                    Countries = g.Where(s => s.CountryCode != null).Select(s => s.CountryCode).Distinct().Count(),
                })
                .FirstOrDefaultAsync();

            var fiveMinutesAgo = DateTime.UtcNow.AddMinutes(-5);
            var activeNow = await _context.SiteEvents.AsNoTracking()
                .Where(e => e.OccurredAt >= fiveMinutesAgo && (filter.IncludeBots || !e.IsBot) && (filter.IncludeInternal || !e.IsInternal))
                .Select(e => e.SessionId).Distinct().CountAsync();

            // Elenen trafik sayimi filtreden bagimsiz: "ne kadarini eledik" sorusunun cevabi.
            var unfiltered = EventQuery(filter, forceIncludeBots: true, forceIncludeInternal: true);
            var botHits = await unfiltered.CountAsync(e => e.IsBot);
            var internalHits = await unfiltered.CountAsync(e => e.IsInternal && !e.IsBot);

            var total = agg?.Sessions ?? 0;
            return new SiteAnalyticsSummaryDto
            {
                PageViews = pageViews,
                Sessions = total,
                UniqueVisitors = uniqueVisitors,
                RegisteredSessions = agg?.Registered ?? 0,
                AnonymousSessions = total - (agg?.Registered ?? 0),
                RegisteredUsers = agg?.RegisteredUsers ?? 0,
                AvgSessionSeconds = Math.Round(agg?.AvgDuration ?? 0, 0),
                AvgPagesPerSession = Math.Round(agg?.AvgPages ?? 0, 1),
                AvgScrollDepth = Math.Round(agg?.AvgScroll ?? 0, 0),
                BounceRate = Pct(agg?.Bounces ?? 0, total),
                Actions = actions,
                ActionRate = Pct(agg?.WithAction ?? 0, total),
                Countries = agg?.Countries ?? 0,
                ActiveNow = activeNow,
                BotHits = botHits,
                InternalHits = internalHits,
            };
        }

        public async Task<List<SiteTimePointDto>> GetTimeSeriesAsync(SiteAnalyticsFilterParams filter)
        {
            var rows = await EventQuery(filter)
                .GroupBy(e => e.OccurredAt.Date)
                .Select(g => new SiteTimePointDto
                {
                    Date = g.Key,
                    PageViews = g.Count(e => e.EventType == "page_view"),
                    Sessions = g.Select(e => e.SessionId).Distinct().Count(),
                    UniqueVisitors = g.Where(e => e.VisitorHash != null).Select(e => e.VisitorHash).Distinct().Count(),
                    RegisteredSessions = g.Where(e => e.UserId != null).Select(e => e.SessionId).Distinct().Count(),
                    Actions = g.Count(e => e.EventType == "action"),
                })
                .OrderBy(x => x.Date)
                .ToListAsync();

            return rows;
        }

        public async Task<List<SiteHeatmapCellDto>> GetHeatmapAsync(SiteAnalyticsFilterParams filter, int tzOffsetMinutes)
        {
            // UTC'de grupla, saat dilimini BELLEKTE kaydir: tarih aritmetigini SQL'e cevirme riski
            // yok ve 168 hucre icin bellek maliyeti sifir. Yoneticinin tarayici dilimi kullanilir;
            // "gece 03:00'te yogunluk" gibi bir okuma yalnizca yerel saatte anlamlidir.
            var rows = await EventQuery(filter)
                .Where(e => e.EventType == "page_view")
                .GroupBy(e => new { Dow = (int)e.OccurredAt.DayOfWeek, e.OccurredAt.Hour })
                .Select(g => new
                {
                    g.Key.Dow,
                    g.Key.Hour,
                    PageViews = g.Count(),
                    Sessions = g.Select(e => e.SessionId).Distinct().Count(),
                })
                .ToListAsync();

            var shiftHours = (int)Math.Round(tzOffsetMinutes / 60.0);
            var cells = new Dictionary<(int, int), SiteHeatmapCellDto>();
            foreach (var row in rows)
            {
                var hour = row.Hour + shiftHours;
                var dow = row.Dow; // .NET: 0 = Pazar
                while (hour < 0) { hour += 24; dow = (dow + 6) % 7; }
                while (hour >= 24) { hour -= 24; dow = (dow + 1) % 7; }

                var weekday = (dow + 6) % 7; // Pazartesi = 0
                if (!cells.TryGetValue((weekday, hour), out var cell))
                {
                    cell = new SiteHeatmapCellDto { Weekday = weekday, Hour = hour };
                    cells[(weekday, hour)] = cell;
                }
                cell.PageViews += row.PageViews;
                cell.Sessions += row.Sessions;
            }

            return cells.Values.OrderBy(c => c.Weekday).ThenBy(c => c.Hour).ToList();
        }

        // ------------------------------------------------------------------ rota / bolum

        private sealed class RouteAgg
        {
            public string Route = string.Empty;
            public int PageViews, Sessions, RegisteredUsers, Actions, Entries, Exits, Leaves;
            public double DwellSum, ScrollSum;
            public int ScrollCount;
        }

        private async Task<Dictionary<string, RouteAgg>> AggregateRoutesAsync(SiteAnalyticsFilterParams filter)
        {
            var events = EventQuery(filter);
            var result = new Dictionary<string, RouteAgg>(StringComparer.Ordinal);
            RouteAgg Get(string route)
            {
                if (!result.TryGetValue(route, out var agg)) { agg = new RouteAgg { Route = route }; result[route] = agg; }
                return agg;
            }

            var views = await events.Where(e => e.EventType == "page_view")
                .GroupBy(e => e.Route)
                .Select(g => new
                {
                    Route = g.Key,
                    PageViews = g.Count(),
                    Sessions = g.Select(e => e.SessionId).Distinct().Count(),
                    RegisteredUsers = g.Where(e => e.UserId != null).Select(e => e.UserId).Distinct().Count(),
                })
                .ToListAsync();
            foreach (var v in views) { var a = Get(v.Route); a.PageViews = v.PageViews; a.Sessions = v.Sessions; a.RegisteredUsers = v.RegisteredUsers; }

            var leaves = await events.Where(e => e.EventType == "page_leave")
                .GroupBy(e => e.Route)
                .Select(g => new
                {
                    Route = g.Key,
                    Leaves = g.Count(),
                    DwellSum = g.Sum(e => (double?)e.DwellMs) ?? 0,
                    ScrollSum = g.Sum(e => (double?)e.ScrollDepth) ?? 0,
                    ScrollCount = g.Count(e => e.ScrollDepth != null),
                })
                .ToListAsync();
            foreach (var l in leaves) { var a = Get(l.Route); a.Leaves = l.Leaves; a.DwellSum = l.DwellSum; a.ScrollSum = l.ScrollSum; a.ScrollCount = l.ScrollCount; }

            var actions = await events.Where(e => e.EventType == "action")
                .GroupBy(e => e.Route)
                .Select(g => new { Route = g.Key, Count = g.Count() })
                .ToListAsync();
            foreach (var x in actions) Get(x.Route).Actions = x.Count;

            var sessions = SessionQuery(filter);
            var entries = await sessions.Where(s => s.EntryRoute != null)
                .GroupBy(s => s.EntryRoute!).Select(g => new { Route = g.Key, Count = g.Count() }).ToListAsync();
            foreach (var x in entries) Get(x.Route).Entries = x.Count;

            var exits = await sessions.Where(s => s.ExitRoute != null)
                .GroupBy(s => s.ExitRoute!).Select(g => new { Route = g.Key, Count = g.Count() }).ToListAsync();
            foreach (var x in exits) Get(x.Route).Exits = x.Count;

            return result;
        }

        public async Task<List<SiteRouteStatDto>> GetRoutesAsync(SiteAnalyticsFilterParams filter)
        {
            var aggs = await AggregateRoutesAsync(filter);
            var query = aggs.Values.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(filter.Section))
                query = query.Where(a => SectionOf(a.Route) == filter.Section);

            return query
                .Where(a => a.PageViews > 0)
                .OrderByDescending(a => a.PageViews)
                .Take(40)
                .Select(a => new SiteRouteStatDto
                {
                    Route = a.Route,
                    Section = SectionOf(a.Route),
                    PageViews = a.PageViews,
                    Sessions = a.Sessions,
                    RegisteredUsers = a.RegisteredUsers,
                    AvgDwellSeconds = a.Leaves == 0 ? 0 : Math.Round(a.DwellSum / a.Leaves / 1000.0, 0),
                    AvgScrollDepth = a.ScrollCount == 0 ? 0 : Math.Round(a.ScrollSum / a.ScrollCount, 0),
                    Entries = a.Entries,
                    Exits = a.Exits,
                    Actions = a.Actions,
                })
                .ToList();
        }

        public async Task<List<SiteSectionStatDto>> GetSectionsAsync(SiteAnalyticsFilterParams filter)
        {
            var aggs = await AggregateRoutesAsync(filter);
            var totalViews = aggs.Values.Sum(a => a.PageViews);

            var bySection = aggs.Values
                .GroupBy(a => SectionOf(a.Route))
                .Select(g => new
                {
                    Section = g.Key,
                    PageViews = g.Sum(a => a.PageViews),
                    Leaves = g.Sum(a => a.Leaves),
                    DwellSum = g.Sum(a => a.DwellSum),
                    ScrollSum = g.Sum(a => a.ScrollSum),
                    ScrollCount = g.Sum(a => a.ScrollCount),
                    Exits = g.Sum(a => a.Exits),
                    Actions = g.Sum(a => a.Actions),
                    Routes = g.Select(a => a.Route).ToList(),
                })
                .Where(s => s.PageViews > 0)
                .OrderByDescending(s => s.PageViews)
                .ToList();

            var events = EventQuery(filter).Where(e => e.EventType == "page_view");
            var result = new List<SiteSectionStatDto>();
            foreach (var s in bySection)
            {
                // Boluma ugrayan FARKLI oturum: rota basina toplamak ayni oturumu birden cok kez sayardi.
                var routes = s.Routes;
                var touching = await events.Where(e => routes.Contains(e.Route)).Select(e => e.SessionId).Distinct().CountAsync();
                var users = await events.Where(e => routes.Contains(e.Route) && e.UserId != null).Select(e => e.UserId).Distinct().CountAsync();

                result.Add(new SiteSectionStatDto
                {
                    Section = s.Section,
                    PageViews = s.PageViews,
                    Sessions = touching,
                    RegisteredUsers = users,
                    AvgDwellSeconds = s.Leaves == 0 ? 0 : Math.Round(s.DwellSum / s.Leaves / 1000.0, 0),
                    AvgScrollDepth = s.ScrollCount == 0 ? 0 : Math.Round(s.ScrollSum / s.ScrollCount, 0),
                    ExitRate = Pct(s.Exits, touching),
                    Share = Pct(s.PageViews, totalViews),
                    Actions = s.Actions,
                });
            }

            return result;
        }

        private sealed class TransitionRow
        {
            public string From { get; set; } = string.Empty;
            public string To { get; set; } = string.Empty;
            public int Count { get; set; }
            public int FromTotal { get; set; }
        }

        public async Task<List<SiteTransitionDto>> GetTransitionsAsync(SiteAnalyticsFilterParams filter)
        {
            var (where, args) = BuildSqlWhere(filter, alias: "e", includeSegment: true);

            // LAG penceresi: ayni oturumda ardisik iki sayfa goruntulemesi = bir gecis.
            // Ayni sayfanin yenilenmesi (prev = route) gecis sayilmaz.
            var sql = $"""
                SELECT t.prev AS "From", t."Route" AS "To", COUNT(*)::int AS "Count",
                       SUM(COUNT(*)) OVER (PARTITION BY t.prev)::int AS "FromTotal"
                FROM (
                    SELECT e."Route", LAG(e."Route") OVER (PARTITION BY e."SessionId" ORDER BY e."OccurredAt", e."Id") AS prev
                    FROM "SiteEvents" e
                    WHERE e."EventType" = 'page_view' {where}
                ) t
                WHERE t.prev IS NOT NULL AND t.prev <> t."Route"
                GROUP BY t.prev, t."Route"
                ORDER BY 3 DESC
                LIMIT 30
                """;

            var rows = await _context.Database.SqlQueryRaw<TransitionRow>(sql, args).ToListAsync();
            return rows.Select(r => new SiteTransitionDto
            {
                From = r.From,
                To = r.To,
                Count = r.Count,
                Share = Pct(r.Count, r.FromTotal),
            }).ToList();
        }

        public async Task<List<SiteContentStatDto>> GetTopContentAsync(string section, SiteAnalyticsFilterParams filter)
        {
            if (!ContentSections.Contains(section)) section = "games";
            var routes = RouteSections.Where(kv => kv.Value == section).Select(kv => kv.Key).ToList();

            var events = EventQuery(filter).Where(e => routes.Contains(e.Route) && e.PathKey != null);

            var views = await events.Where(e => e.EventType == "page_view")
                .GroupBy(e => e.PathKey!)
                .Select(g => new
                {
                    Key = g.Key,
                    PageViews = g.Count(),
                    Sessions = g.Select(e => e.SessionId).Distinct().Count(),
                    RegisteredUsers = g.Where(e => e.UserId != null).Select(e => e.UserId).Distinct().Count(),
                })
                .OrderByDescending(x => x.PageViews)
                .Take(15)
                .ToListAsync();

            var keys = views.Select(v => v.Key).ToList();
            var dwell = await events.Where(e => e.EventType == "page_leave" && keys.Contains(e.PathKey!))
                .GroupBy(e => e.PathKey!)
                .Select(g => new { Key = g.Key, Avg = g.Average(e => (double?)e.DwellMs) ?? 0 })
                .ToListAsync();
            var dwellByKey = dwell.ToDictionary(d => d.Key, d => d.Avg);

            return views.Select(v => new SiteContentStatDto
            {
                Section = section,
                Key = v.Key,
                PageViews = v.PageViews,
                Sessions = v.Sessions,
                RegisteredUsers = v.RegisteredUsers,
                AvgDwellSeconds = dwellByKey.TryGetValue(v.Key, out var ms) ? Math.Round(ms / 1000.0, 0) : 0,
            }).ToList();
        }

        public async Task<List<SiteActionStatDto>> GetActionsAsync(SiteAnalyticsFilterParams filter)
        {
            return await EventQuery(filter)
                .Where(e => e.EventType == "action" && e.ActionName != null)
                .GroupBy(e => e.ActionName!)
                .Select(g => new SiteActionStatDto
                {
                    Action = g.Key,
                    Count = g.Count(),
                    Sessions = g.Select(e => e.SessionId).Distinct().Count(),
                    RegisteredUsers = g.Where(e => e.UserId != null).Select(e => e.UserId).Distinct().Count(),
                    AnonymousCount = g.Count(e => e.UserId == null),
                })
                .OrderByDescending(x => x.Count)
                .ToListAsync();
        }

        // ------------------------------------------------------------------ oturum katmani

        public async Task<List<SiteSegmentStatDto>> GetSegmentsAsync(SiteAnalyticsFilterParams filter)
        {
            var rows = await SessionQuery(filter)
                .GroupBy(s => s.UserId != null)
                .Select(g => new
                {
                    Registered = g.Key,
                    Sessions = g.Count(),
                    PageViews = g.Sum(s => s.PageViews),
                    AvgPages = g.Average(s => (double?)s.PageViews) ?? 0,
                    AvgDuration = g.Average(s => (double?)s.DurationSeconds) ?? 0,
                    AvgScroll = g.Average(s => s.AvgScrollDepth) ?? 0,
                    Actions = g.Sum(s => s.Actions),
                    WithAction = g.Count(s => s.Actions > 0),
                    Bounces = g.Count(s => s.PageViews <= 1),
                })
                .ToListAsync();

            return new[] { false, true }.Select(registered =>
            {
                var r = rows.FirstOrDefault(x => x.Registered == registered);
                return new SiteSegmentStatDto
                {
                    Segment = registered ? "registered" : "anonymous",
                    Sessions = r?.Sessions ?? 0,
                    PageViews = r?.PageViews ?? 0,
                    AvgPagesPerSession = Math.Round(r?.AvgPages ?? 0, 1),
                    AvgSessionSeconds = Math.Round(r?.AvgDuration ?? 0, 0),
                    AvgScrollDepth = Math.Round(r?.AvgScroll ?? 0, 0),
                    Actions = r?.Actions ?? 0,
                    ActionRate = Pct(r?.WithAction ?? 0, r?.Sessions ?? 0),
                    BounceRate = Pct(r?.Bounces ?? 0, r?.Sessions ?? 0),
                };
            }).ToList();
        }

        public async Task<List<SiteTopUserDto>> GetTopUsersAsync(SiteAnalyticsFilterParams filter)
        {
            var top = await SessionQuery(filter)
                .Where(s => s.UserId != null)
                .GroupBy(s => s.UserId!.Value)
                .Select(g => new
                {
                    UserId = g.Key,
                    Sessions = g.Count(),
                    PageViews = g.Sum(s => s.PageViews),
                    Actions = g.Sum(s => s.Actions),
                    Seconds = g.Sum(s => s.DurationSeconds),
                    LastSeenAt = g.Max(s => s.LastSeenAt),
                })
                .OrderByDescending(x => x.PageViews + x.Actions * 3)
                .Take(15)
                .ToListAsync();

            if (top.Count == 0) return new List<SiteTopUserDto>();

            var ids = top.Select(t => t.UserId).ToList();
            var users = await _context.Users.AsNoTracking()
                .Where(u => ids.Contains(u.Id))
                .Select(u => new { u.Id, u.Username, u.ProfileImageUrl })
                .ToDictionaryAsync(u => u.Id);

            // En cok gezdigi bolum: rota bazinda say, bellekte boluma indir.
            var routeCounts = await EventQuery(filter)
                .Where(e => e.EventType == "page_view" && e.UserId != null && ids.Contains(e.UserId.Value))
                .GroupBy(e => new { e.UserId, e.Route })
                .Select(g => new { g.Key.UserId, g.Key.Route, Count = g.Count() })
                .ToListAsync();
            var topSection = routeCounts
                .GroupBy(r => r.UserId!.Value)
                .ToDictionary(g => g.Key, g => g.GroupBy(r => SectionOf(r.Route)).OrderByDescending(x => x.Sum(r => r.Count)).First().Key);

            return top.Select(t => new SiteTopUserDto
            {
                UserId = t.UserId,
                Username = users.TryGetValue(t.UserId, out var u) ? u.Username : $"#{t.UserId}",
                ProfileImageUrl = users.TryGetValue(t.UserId, out var u2) ? u2.ProfileImageUrl : null,
                Sessions = t.Sessions,
                PageViews = t.PageViews,
                Actions = t.Actions,
                TotalMinutes = Math.Round(t.Seconds / 60.0, 1),
                LastSeenAt = t.LastSeenAt,
                TopSection = topSection.TryGetValue(t.UserId, out var s) ? s : null,
            }).ToList();
        }

        public async Task<List<SiteEntryExitDto>> GetEntryPagesAsync(SiteAnalyticsFilterParams filter)
        {
            var sessions = SessionQuery(filter);
            var total = await sessions.CountAsync();
            var rows = await sessions.Where(s => s.EntryRoute != null)
                .GroupBy(s => s.EntryRoute!)
                .Select(g => new { Route = g.Key, Sessions = g.Count(), Bounces = g.Count(s => s.PageViews <= 1) })
                .OrderByDescending(x => x.Sessions)
                .Take(15)
                .ToListAsync();

            return rows.Select(r => new SiteEntryExitDto
            {
                Route = r.Route,
                Sessions = r.Sessions,
                BounceRate = Pct(r.Bounces, r.Sessions),
                Share = Pct(r.Sessions, total),
            }).ToList();
        }

        public async Task<List<SiteEntryExitDto>> GetExitPagesAsync(SiteAnalyticsFilterParams filter)
        {
            var sessions = SessionQuery(filter);
            var total = await sessions.CountAsync();
            var rows = await sessions.Where(s => s.ExitRoute != null)
                .GroupBy(s => s.ExitRoute!)
                .Select(g => new { Route = g.Key, Sessions = g.Count(), Bounces = g.Count(s => s.PageViews <= 1) })
                .OrderByDescending(x => x.Sessions)
                .Take(15)
                .ToListAsync();

            return rows.Select(r => new SiteEntryExitDto
            {
                Route = r.Route,
                Sessions = r.Sessions,
                BounceRate = Pct(r.Bounces, r.Sessions),
                Share = Pct(r.Sessions, total),
            }).ToList();
        }

        public async Task<List<SiteBreakdownDto>> GetBreakdownAsync(string dimension, SiteAnalyticsFilterParams filter)
        {
            var sessions = SessionQuery(filter);

            // Boyut seciciler DERLENMIS ifadeler: kullanicidan gelen dizge sorguya gomulmez.
            System.Linq.Expressions.Expression<Func<SessionRow, string>> selector = dimension switch
            {
                "country" => s => s.CountryCode ?? "(bilinmiyor)",
                "device" => s => s.DeviceType ?? "(bilinmiyor)",
                "browser" => s => s.Browser ?? "(bilinmiyor)",
                "platform" => s => s.Platform ?? "(bilinmiyor)",
                "language" => s => s.Language ?? "(bilinmiyor)",
                "locale" => s => s.Locale ?? "(bilinmiyor)",
                "referrer" => s => s.ReferrerHost ?? "(dogrudan)",
                _ => s => s.UtmSource != null ? s.UtmSource
                        : s.ClickIdSource != null ? s.ClickIdSource
                        : (s.Browser == "instagram" || s.Browser == "facebook" || s.Browser == "tiktok") ? s.Browser!
                        : s.ReferrerHost != null ? s.ReferrerHost
                        : "direct",
            };

            var rows = await sessions
                .GroupBy(selector)
                .Select(g => new
                {
                    Key = g.Key,
                    Sessions = g.Count(),
                    PageViews = g.Sum(s => s.PageViews),
                    UniqueVisitors = g.Where(s => s.VisitorHash != null).Select(s => s.VisitorHash).Distinct().Count(),
                    AvgDuration = g.Average(s => (double?)s.DurationSeconds) ?? 0,
                    Bounces = g.Count(s => s.PageViews <= 1),
                    Registered = g.Count(s => s.UserId != null),
                })
                .OrderByDescending(x => x.Sessions)
                .Take(20)
                .ToListAsync();

            return rows.Select(r => new SiteBreakdownDto
            {
                Key = r.Key,
                Sessions = r.Sessions,
                PageViews = r.PageViews,
                UniqueVisitors = r.UniqueVisitors,
                AvgSessionSeconds = Math.Round(r.AvgDuration, 0),
                BounceRate = Pct(r.Bounces, r.Sessions),
                RegisteredShare = Pct(r.Registered, r.Sessions),
            }).ToList();
        }

        public async Task<PaginatedResult<SiteSessionDto>> GetSessionsAsync(SiteAnalyticsFilterParams filter)
        {
            var sessions = SessionQuery(filter);
            var total = await sessions.CountAsync();

            var rows = await sessions
                .OrderByDescending(s => s.LastSeenAt)
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            var userIds = rows.Where(r => r.UserId != null).Select(r => r.UserId!.Value).Distinct().ToList();
            var users = userIds.Count == 0
                ? new Dictionary<int, (string Username, string? Image)>()
                : await _context.Users.AsNoTracking()
                    .Where(u => userIds.Contains(u.Id))
                    .Select(u => new { u.Id, u.Username, u.ProfileImageUrl })
                    .ToDictionaryAsync(u => u.Id, u => (Username: u.Username, Image: u.ProfileImageUrl));

            var items = rows.Select(r => new SiteSessionDto
            {
                SessionId = r.SessionId,
                StartedAt = r.StartedAt,
                LastSeenAt = r.LastSeenAt,
                DurationSeconds = r.DurationSeconds,
                PageViews = r.PageViews,
                Actions = r.Actions,
                UserId = r.UserId,
                Username = r.UserId != null && users.TryGetValue(r.UserId.Value, out var u) ? u.Username : null,
                ProfileImageUrl = r.UserId != null && users.TryGetValue(r.UserId.Value, out var u2) ? u2.Image : null,
                Channel = r.UtmSource ?? r.ClickIdSource ?? (r.Browser != null && InAppBrowsers.Contains(r.Browser) ? r.Browser : null) ?? r.ReferrerHost ?? "direct",
                CountryCode = r.CountryCode,
                DeviceType = r.DeviceType,
                Browser = r.Browser,
                Platform = r.Platform,
                EntryRoute = r.EntryRoute,
                ExitRoute = r.ExitRoute,
                AvgScrollDepth = r.AvgScrollDepth.HasValue ? Math.Round(r.AvgScrollDepth.Value, 0) : null,
                IsBot = r.IsBot,
                IsInternal = r.IsInternal,
            }).ToList();

            return new PaginatedResult<SiteSessionDto>
            {
                Items = items,
                TotalCount = total,
                Page = filter.Page,
                PageSize = filter.PageSize,
            };
        }

        public async Task<List<SiteSessionStepDto>> GetSessionStepsAsync(Guid sessionId)
        {
            return await _context.SiteEvents.AsNoTracking()
                .Where(e => e.SessionId == sessionId)
                .OrderBy(e => e.OccurredAt).ThenBy(e => e.Id)
                .Take(200)
                .Select(e => new SiteSessionStepDto
                {
                    OccurredAt = e.OccurredAt,
                    EventType = e.EventType,
                    Route = e.Route,
                    PathKey = e.PathKey,
                    ActionName = e.ActionName,
                    DwellMs = e.DwellMs,
                    ScrollDepth = e.ScrollDepth,
                })
                .ToListAsync();
        }

        public async Task<int> PurgeOlderThanAsync(DateTime cutoffUtc, int batchSize, CancellationToken cancellationToken)
        {
            var totalDeleted = 0;
            while (!cancellationToken.IsCancellationRequested)
            {
                var deleted = await _context.SiteEvents
                    .Where(e => e.OccurredAt < cutoffUtc)
                    .OrderBy(e => e.Id)
                    .Take(batchSize)
                    .ExecuteDeleteAsync(cancellationToken);

                totalDeleted += deleted;
                if (deleted < batchSize) break;
            }
            return totalDeleted;
        }

        // ------------------------------------------------------------------ sorgu yardimcilari

        private IQueryable<SiteEvent> EventQuery(SiteAnalyticsFilterParams filter, bool forceIncludeBots = false, bool forceIncludeInternal = false)
        {
            var query = _context.SiteEvents.AsNoTracking();
            var (start, end) = Range(filter);
            query = query.Where(e => e.OccurredAt >= start && e.OccurredAt < end);

            if (!forceIncludeBots && !filter.IncludeBots) query = query.Where(e => !e.IsBot);
            if (!forceIncludeInternal && !filter.IncludeInternal) query = query.Where(e => !e.IsInternal);
            if (!string.IsNullOrWhiteSpace(filter.DeviceType)) query = query.Where(e => e.DeviceType == filter.DeviceType);
            if (!string.IsNullOrWhiteSpace(filter.Platform)) query = query.Where(e => e.Platform == filter.Platform);
            if (!string.IsNullOrWhiteSpace(filter.CountryCode)) query = query.Where(e => e.CountryCode == filter.CountryCode.ToUpperInvariant());
            if (filter.Segment == "registered") query = query.Where(e => e.UserId != null);
            else if (filter.Segment == "anonymous") query = query.Where(e => e.UserId == null);

            return query;
        }

        /// <summary>Oturum basina tek satir. Ham SQL: EF GroupBy icinde sirali ilk/son secimini ceviremez.</summary>
        private IQueryable<SessionRow> SessionQuery(SiteAnalyticsFilterParams filter)
        {
            var (where, args) = BuildSqlWhere(filter, alias: "e", includeSegment: false);

            var sql = $"""
                SELECT e."SessionId",
                       MIN(e."OccurredAt") AS "StartedAt",
                       MAX(e."OccurredAt") AS "LastSeenAt",
                       COUNT(*) FILTER (WHERE e."EventType" = 'page_view')::int AS "PageViews",
                       COUNT(*) FILTER (WHERE e."EventType" = 'action')::int AS "Actions",
                       MAX(e."UserId") AS "UserId",
                       BOOL_OR(e."IsInternal") AS "IsInternal",
                       BOOL_OR(e."IsBot") AS "IsBot",
                       MAX(e."CountryCode") AS "CountryCode",
                       MAX(e."DeviceType") AS "DeviceType",
                       MAX(e."Browser") AS "Browser",
                       MAX(e."Platform") AS "Platform",
                       MAX(e."VisitorHash") AS "VisitorHash",
                       MAX(e."UtmSource") AS "UtmSource",
                       MAX(e."ClickIdSource") AS "ClickIdSource",
                       MAX(e."ReferrerHost") AS "ReferrerHost",
                       MAX(e."Language") AS "Language",
                       MAX(e."Locale") AS "Locale",
                       (ARRAY_AGG(e."Route" ORDER BY e."OccurredAt", e."Id") FILTER (WHERE e."EventType" = 'page_view'))[1] AS "EntryRoute",
                       (ARRAY_AGG(e."Route" ORDER BY e."OccurredAt" DESC, e."Id" DESC) FILTER (WHERE e."EventType" = 'page_view'))[1] AS "ExitRoute",
                       AVG(e."ScrollDepth")::float8 AS "AvgScrollDepth",
                       GREATEST(
                           EXTRACT(EPOCH FROM (MAX(e."OccurredAt") - MIN(e."OccurredAt"))),
                           COALESCE(SUM(e."DwellMs") FILTER (WHERE e."EventType" = 'page_leave'), 0) / 1000.0
                       )::int AS "DurationSeconds"
                FROM "SiteEvents" e
                WHERE 1 = 1 {where}
                GROUP BY e."SessionId"
                """;

            var rows = _context.Database.SqlQueryRaw<SessionRow>(sql, args);

            // Segment OTURUM seviyesinde: anonim baslayip giris yapan oturumda ilk olaylarin UserId'si
            // bostur; olay seviyesinde filtrelemek oturumun yarisini dusururdu.
            if (filter.Segment == "registered") rows = rows.Where(s => s.UserId != null);
            else if (filter.Segment == "anonymous") rows = rows.Where(s => s.UserId == null);

            return rows;
        }

        /// <summary>
        /// Ham SQL icin WHERE parcasi. Kullanici degerleri YALNIZCA parametre olarak girer ({n});
        /// metne yalnizca sabit parcalar eklenir.
        /// </summary>
        private static (string Where, object[] Args) BuildSqlWhere(SiteAnalyticsFilterParams filter, string alias, bool includeSegment)
        {
            var (start, end) = Range(filter);
            var sb = new StringBuilder();
            var args = new List<object>();

            sb.Append($" AND {alias}.\"OccurredAt\" >= {{{args.Count}}}"); args.Add(start);
            sb.Append($" AND {alias}.\"OccurredAt\" < {{{args.Count}}}"); args.Add(end);

            if (!filter.IncludeBots) sb.Append($" AND NOT {alias}.\"IsBot\"");
            if (!filter.IncludeInternal) sb.Append($" AND NOT {alias}.\"IsInternal\"");

            if (!string.IsNullOrWhiteSpace(filter.DeviceType)) { sb.Append($" AND {alias}.\"DeviceType\" = {{{args.Count}}}"); args.Add(filter.DeviceType); }
            if (!string.IsNullOrWhiteSpace(filter.Platform)) { sb.Append($" AND {alias}.\"Platform\" = {{{args.Count}}}"); args.Add(filter.Platform); }
            if (!string.IsNullOrWhiteSpace(filter.CountryCode)) { sb.Append($" AND {alias}.\"CountryCode\" = {{{args.Count}}}"); args.Add(filter.CountryCode.ToUpperInvariant()); }

            if (includeSegment)
            {
                if (filter.Segment == "registered") sb.Append($" AND {alias}.\"UserId\" IS NOT NULL");
                else if (filter.Segment == "anonymous") sb.Append($" AND {alias}.\"UserId\" IS NULL");
            }

            return (sb.ToString(), args.ToArray());
        }

        private static (DateTime Start, DateTime End) Range(SiteAnalyticsFilterParams filter)
        {
            var start = DateTime.SpecifyKind((filter.StartDate ?? DateTime.UtcNow.AddDays(-29)).Date, DateTimeKind.Utc);
            // Bitis gunu DAHIL.
            var end = DateTime.SpecifyKind((filter.EndDate ?? DateTime.UtcNow).Date.AddDays(1), DateTimeKind.Utc);
            return (start, end);
        }

        private static double Pct(int part, int total) => total == 0 ? 0 : Math.Round(part * 100.0 / total, 1);

        private static string? Clip(string? value, int max)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            var trimmed = value.Trim();
            return trimmed.Length <= max ? trimmed : trimmed[..max];
        }

        private static int? Clamp(int? value, int min, int max) =>
            value is null ? null : Math.Clamp(value.Value, min, max);

        /// <summary>SqlQueryRaw satiri; kolon adlari SQL'deki takma adlarla birebir.</summary>
        public sealed class SessionRow
        {
            public Guid SessionId { get; set; }
            public DateTime StartedAt { get; set; }
            public DateTime LastSeenAt { get; set; }
            public int PageViews { get; set; }
            public int Actions { get; set; }
            public int? UserId { get; set; }
            public bool IsInternal { get; set; }
            public bool IsBot { get; set; }
            public string? CountryCode { get; set; }
            public string? DeviceType { get; set; }
            public string? Browser { get; set; }
            public string? Platform { get; set; }
            public string? VisitorHash { get; set; }
            public string? UtmSource { get; set; }
            public string? ClickIdSource { get; set; }
            public string? ReferrerHost { get; set; }
            public string? Language { get; set; }
            public string? Locale { get; set; }
            public string? EntryRoute { get; set; }
            public string? ExitRoute { get; set; }
            public double? AvgScrollDepth { get; set; }
            public int DurationSeconds { get; set; }
        }
    }
}
