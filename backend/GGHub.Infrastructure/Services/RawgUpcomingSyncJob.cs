using GGHub.Core.Entities;
using GGHub.Infrastructure.Dtos;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// RAWG yakin-gelecek senkronu: bugunden +N aya kadar cikacak oyunlari periyodik ceker.
    /// Amaci Oyun Gundemi'nin gelecek aylarini dolu tutmak. Iki ek gorevi var:
    ///  1. Mevcut satirlarin cikis tarihi/gorseli degistiyse gunceller (tarih ertelemeleri sik).
    ///  2. RAWG-Steam uzlastirma: Steam'den ingest edilmis bir oyunu (RawgId &lt; 0) RAWG da
    ///     indekslediyse satirin RawgId'sini gercek pozitif id'ye cevirir; SteamAppId kalir,
    ///     FK'ler internal GameId oldugu icin listeler/reviewlar etkilenmez.
    /// RAWG erisilemezse kosu sessizce biter; sonraki periyotta tekrar dener.
    /// </summary>
    public class RawgUpcomingSyncJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly RawgUpcomingSyncSettings _settings;
        private readonly RawgApiSettings _apiSettings;
        private readonly RawgImportSettings _importSettings;
        private readonly ILogger<RawgUpcomingSyncJob> _logger;

        public RawgUpcomingSyncJob(
            IServiceScopeFactory scopeFactory,
            IHttpClientFactory httpClientFactory,
            IOptions<RawgUpcomingSyncSettings> settings,
            IOptions<RawgApiSettings> apiSettings,
            IOptions<RawgImportSettings> importSettings,
            ILogger<RawgUpcomingSyncJob> logger)
        {
            _scopeFactory = scopeFactory;
            _httpClientFactory = httpClientFactory;
            _settings = settings.Value;
            _apiSettings = apiSettings.Value;
            _importSettings = importSettings.Value;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_settings.Enabled)
            {
                _logger.LogInformation("[RawgUpcoming] Kapali (Jobs:RawgUpcomingSync:Enabled=false), job calismayacak.");
                return;
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RunOnceAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[RawgUpcoming] Kosu beklenmedik hatayla bitti; sonraki periyotta tekrar denenecek.");
                }

                await Task.Delay(TimeSpan.FromHours(_settings.RunIntervalHours), stoppingToken);
            }
        }

        private async Task RunOnceAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();
            var httpClient = _httpClientFactory.CreateClient();

            var start = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var end = DateTime.UtcNow.AddMonths(_settings.MonthsAhead).ToString("yyyy-MM-dd");

            var added = 0;
            var updated = 0;
            var reconciled = 0;
            var processed = 0;

            for (var page = 1; page <= _settings.MaxPagesPerRun; page++)
            {
                ct.ThrowIfCancellationRequested();

                var url = $"{_apiSettings.BaseUrl}games?key={_apiSettings.ApiKey}" +
                          $"&dates={start},{end}&ordering=-added&page_size={_settings.PageSize}&page={page}";

                PaginatedResponseDto<RawgGameDto>? response;
                try
                {
                    response = await httpClient.GetFromJsonAsync<PaginatedResponseDto<RawgGameDto>>(url, ct);
                }
                catch (Exception ex)
                {
                    // RAWG erisilemez: sessizce bitir, katalog eldeki haliyle servis edilmeye devam eder.
                    _logger.LogWarning(ex, "[RawgUpcoming] RAWG erisilemedi (sayfa {Page}); kosu sonlandirildi.", page);
                    break;
                }

                var results = (response?.Results ?? Enumerable.Empty<RawgGameDto>()).ToList();
                if (results.Count == 0) break;

                foreach (var dto in results)
                {
                    processed++;
                    if (ShouldSkip(dto)) continue;

                    var outcome = await UpsertAsync(context, dto, ct);
                    if (outcome == UpsertOutcome.Added) added++;
                    else if (outcome == UpsertOutcome.Updated) updated++;
                    else if (outcome == UpsertOutcome.Reconciled) reconciled++;
                }

                if (string.IsNullOrEmpty(response?.Next)) break;

                if (_settings.DelayBetweenRequestsMs > 0)
                    await Task.Delay(_settings.DelayBetweenRequestsMs, ct);
            }

            _logger.LogInformation(
                "[RawgUpcoming] Kosu bitti: {Processed} islendi, {Added} yeni, {Updated} guncellendi, {Reconciled} Steam satiri uzlastirildi.",
                processed, added, updated, reconciled);
        }

        private bool ShouldSkip(RawgGameDto dto)
        {
            if (dto.Tba) return true;
            if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Slug)) return true;
            if (string.IsNullOrEmpty(dto.BackgroundImage)) return true;
            if ((dto.Added) < _settings.MinAdded) return true;

            var slugLower = dto.Slug.ToLowerInvariant();
            foreach (var pattern in _importSettings.JunkSlugPatterns)
            {
                if (slugLower.Contains(pattern, StringComparison.OrdinalIgnoreCase)) return true;
            }

            var nameLower = dto.Name.ToLowerInvariant();
            foreach (var pattern in _importSettings.JunkNamePatterns)
            {
                if (nameLower.Contains(pattern, StringComparison.OrdinalIgnoreCase)) return true;
            }

            return false;
        }

        private enum UpsertOutcome { Skipped, Added, Updated, Reconciled }

        private async Task<UpsertOutcome> UpsertAsync(GGHubDbContext context, RawgGameDto dto, CancellationToken ct)
        {
            var existing = await context.Games.FirstOrDefaultAsync(g => g.RawgId == dto.Id, ct);

            if (existing != null)
            {
                // Cikis tarihi ertelemeleri ve gorsel degisimleri gundem icin kritik.
                var dirty = false;
                if (dto.Released != null && existing.Released != dto.Released) { existing.Released = dto.Released; dirty = true; }
                if (dto.BackgroundImage != null && existing.BackgroundImage != dto.BackgroundImage) { existing.BackgroundImage = dto.BackgroundImage; dirty = true; }
                if (dto.Added > 0 && existing.RawgAdded != dto.Added) { existing.RawgAdded = dto.Added; dirty = true; }
                if (string.IsNullOrEmpty(existing.GenresJson) && dto.Genres != null && dto.Genres.Any())
                {
                    existing.GenresJson = JsonSerializer.Serialize(dto.Genres.Select(g => new { g.Name, g.Slug }).ToList());
                    dirty = true;
                }

                if (!dirty) return UpsertOutcome.Skipped;
                await context.SaveChangesAsync(ct);
                return UpsertOutcome.Updated;
            }

            // Steam'den ingest edilmis ayni oyun var mi? (isim+yil eslesmesi)
            var steamRow = await FindSteamOnlyMatchAsync(context, dto, ct);
            if (steamRow != null)
            {
                steamRow.RawgId = dto.Id;
                if (dto.Released != null) steamRow.Released = dto.Released;
                steamRow.RawgAdded = dto.Added;
                steamRow.RawgRatingsCount = dto.RatingsCount;
                if (steamRow.Rating == null) steamRow.Rating = dto.Rating;
                await context.SaveChangesAsync(ct);
                _logger.LogInformation("[RawgUpcoming] Uzlastirildi: {Name} (rawgId={RawgId}, steamAppId={SteamAppId})",
                    steamRow.Name, dto.Id, steamRow.SteamAppId);
                return UpsertOutcome.Reconciled;
            }

            var platforms = dto.Platforms?.Select(p => new { p.Platform.Name, p.Platform.Slug }).ToList();
            var genres = dto.Genres?.Select(g => new { g.Name, g.Slug }).ToList();

            var newGame = new Game
            {
                RawgId = dto.Id,
                Name = dto.Name,
                Slug = dto.Slug,
                Released = dto.Released,
                BackgroundImage = dto.BackgroundImage,
                Rating = dto.Rating,
                // Cikmamis oyunda metacritic gecersizdir; FutureMetacriticCleanupJob da ayni kurali isletir.
                Metacritic = null,
                RawgRatingsCount = dto.RatingsCount,
                RawgAdded = dto.Added,
                ImportSource = "rawg-upcoming",
                ImportedAt = DateTime.UtcNow,
                LastSyncedAt = DateTime.UtcNow,
                PlatformsJson = platforms != null ? JsonSerializer.Serialize(platforms) : null,
                GenresJson = genres != null ? JsonSerializer.Serialize(genres) : null,
            };

            try
            {
                await context.Games.AddAsync(newGame, ct);
                await context.SaveChangesAsync(ct);
                return UpsertOutcome.Added;
            }
            catch (DbUpdateException)
            {
                context.Entry(newGame).State = EntityState.Detached;
                return UpsertOutcome.Skipped;
            }
        }

        private static async Task<Game?> FindSteamOnlyMatchAsync(GGHubDbContext context, RawgGameDto dto, CancellationToken ct)
        {
            var candidates = await context.Games
                .Where(g => g.RawgId < 0 && EF.Functions.ILike(g.Name, dto.Name))
                .Take(5)
                .ToListAsync(ct);

            if (candidates.Count == 0) return null;

            var normalized = NormalizeName(dto.Name);
            var dtoYear = dto.Released != null && dto.Released.Length >= 4
                && int.TryParse(dto.Released[..4], out var y) ? y : (int?)null;

            foreach (var candidate in candidates)
            {
                if (NormalizeName(candidate.Name) != normalized) continue;

                var candidateYear = candidate.Released != null && candidate.Released.Length >= 4
                    && int.TryParse(candidate.Released[..4], out var cy) ? cy : (int?)null;
                if (dtoYear != null && candidateYear != null && dtoYear != candidateYear) continue;

                return candidate;
            }

            return null;
        }

        private static string NormalizeName(string name)
        {
            var sb = new StringBuilder(name.Length);
            foreach (var ch in name.ToLowerInvariant())
            {
                if (char.IsLetterOrDigit(ch)) sb.Append(ch);
            }
            return sb.ToString();
        }
    }
}
