using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Infrastructure.Dtos;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// IGDB v4 istemcisi + katalog senkronu. Twitch client-credentials ile token alir
    /// (token ~60 gun gecerli, bellekte cache'lenir), release_dates ucundan pencere icindeki
    /// cikislari ceker ve DB'ye upsert eder.
    ///
    /// ID kurali: IGDB satirlarinda RawgId = -(1_000_000_000 + IgdbId). Steam'in -SteamAppId
    /// araligiyla cakismaz; istemciler rawgId'yi opak sayi olarak tasidigi icin wishlist,
    /// favori ve liste akislari degismeden calisir.
    /// </summary>
    public class IgdbCatalogService : IIgdbCatalogService
    {
        /// <summary>IGDB satirlarinin sentetik RawgId tabani (bkz. Game.IgdbId).</summary>
        public const int IgdbRawgIdOffset = 1_000_000_000;

        private const string TokenCacheKey = "igdb-access-token";

        private readonly HttpClient _httpClient;
        private readonly IgdbSettings _settings;
        private readonly GGHubDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly ILogger<IgdbCatalogService> _logger;

        public IgdbCatalogService(
            IHttpClientFactory httpClientFactory,
            IOptions<IgdbSettings> settings,
            GGHubDbContext context,
            IMemoryCache cache,
            ILogger<IgdbCatalogService> logger)
        {
            _httpClient = httpClientFactory.CreateClient("Igdb");
            _settings = settings.Value;
            _context = context;
            _cache = cache;
            _logger = logger;
        }

        public bool IsConfigured =>
            _settings.Enabled
            && !string.IsNullOrWhiteSpace(_settings.ClientId)
            && !string.IsNullOrWhiteSpace(_settings.ClientSecret);

        public async Task<(int Added, int Updated)> SyncReleaseWindowAsync(CancellationToken ct = default)
        {
            if (!IsConfigured)
            {
                _logger.LogInformation("[IGDB] Kimlik bilgileri yok, senkron atlandi.");
                return (0, 0);
            }

            var token = await GetAccessTokenAsync(ct);
            if (token == null) return (0, 0);

            var from = DateTimeOffset.UtcNow.AddMonths(-_settings.MonthsBehind).ToUnixTimeSeconds();
            var to = DateTimeOffset.UtcNow.AddMonths(_settings.MonthsAhead).ToUnixTimeSeconds();

            var added = 0;
            var updated = 0;

            for (var page = 0; page < _settings.MaxPagesPerRun; page++)
            {
                ct.ThrowIfCancellationRequested();

                // Apicalypse sorgusu. category=0 => tam tarih (gun bazli); gundem sayfasi
                // ancak tam tarihli cikislari gosterebiliyor. Hypes esigi cop kayitlari eler.
                var query = new StringBuilder()
                    .Append("fields date, category, game.id, game.name, game.slug, game.summary, game.hypes, ")
                    .Append("game.total_rating, game.aggregated_rating, game.cover.image_id, game.genres.name, game.genres.slug, ")
                    .Append("game.platforms.name, game.platforms.abbreviation, game.platforms.slug, ")
                    .Append("game.involved_companies.company.name, game.involved_companies.developer, game.involved_companies.publisher, ")
                    .Append("game.websites.url, game.websites.category; ")
                    .Append($"where date >= {from} & date <= {to} & category = 0 & game.hypes >= {_settings.MinHypes} & game.cover != null; ")
                    .Append("sort date asc; ")
                    .Append($"limit {_settings.PageSize}; offset {page * _settings.PageSize};")
                    .ToString();

                List<IgdbReleaseDateDto>? rows;
                try
                {
                    using var request = new HttpRequestMessage(HttpMethod.Post, $"{_settings.BaseUrl}release_dates");
                    request.Headers.Add("Client-ID", _settings.ClientId);
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                    request.Content = new StringContent(query, Encoding.UTF8, "text/plain");

                    var response = await _httpClient.SendAsync(request, ct);
                    if (!response.IsSuccessStatusCode)
                    {
                        var body = await response.Content.ReadAsStringAsync(ct);
                        _logger.LogWarning("[IGDB] Sorgu basarisiz ({Status}): {Body}", response.StatusCode, body);
                        break;
                    }

                    rows = await response.Content.ReadFromJsonAsync<List<IgdbReleaseDateDto>>(cancellationToken: ct);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[IGDB] Istek hatasi (sayfa {Page})", page);
                    break;
                }

                if (rows == null || rows.Count == 0) break;

                foreach (var row in rows)
                {
                    if (row.Game == null || row.Date == null || string.IsNullOrWhiteSpace(row.Game.Name)) continue;

                    var released = DateTimeOffset.FromUnixTimeSeconds(row.Date.Value).UtcDateTime.ToString("yyyy-MM-dd");
                    var outcome = await UpsertAsync(row.Game, released, ct);
                    if (outcome == UpsertOutcome.Added) added++;
                    else if (outcome == UpsertOutcome.Updated) updated++;
                }

                if (rows.Count < _settings.PageSize) break;
                await Task.Delay(_settings.DelayBetweenRequestsMs, ct);
            }

            _logger.LogInformation("[IGDB] Senkron bitti: {Added} yeni, {Updated} guncellendi.", added, updated);
            return (added, updated);
        }

        private async Task<string?> GetAccessTokenAsync(CancellationToken ct)
        {
            if (_cache.TryGetValue(TokenCacheKey, out string? cached) && !string.IsNullOrEmpty(cached))
                return cached;

            try
            {
                var url = $"{_settings.TokenUrl}?client_id={Uri.EscapeDataString(_settings.ClientId)}" +
                          $"&client_secret={Uri.EscapeDataString(_settings.ClientSecret)}&grant_type=client_credentials";
                var response = await _httpClient.PostAsync(url, null, ct);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("[IGDB] Token alinamadi ({Status}). ClientId/Secret dogru mu?", response.StatusCode);
                    return null;
                }

                var dto = await response.Content.ReadFromJsonAsync<IgdbTokenResponseDto>(cancellationToken: ct);
                if (string.IsNullOrEmpty(dto?.AccessToken)) return null;

                // Sona ermeden bir gun once yenile.
                var lifetime = TimeSpan.FromSeconds(Math.Max(dto.ExpiresIn - 86400, 3600));
                _cache.Set(TokenCacheKey, dto.AccessToken, lifetime);
                return dto.AccessToken;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[IGDB] Token istegi hatasi");
                return null;
            }
        }

        private enum UpsertOutcome { Skipped, Added, Updated }

        private async Task<UpsertOutcome> UpsertAsync(IgdbGameDto dto, string released, CancellationToken ct)
        {
            var syntheticRawgId = -(IgdbRawgIdOffset + dto.Id);

            var existing = await _context.Games.FirstOrDefaultAsync(g => g.IgdbId == dto.Id, ct);

            // IGDB kaydi yoksa: ayni oyun baska kaynaktan (RAWG/Steam) gelmis olabilir.
            // Isim + yil eslesmesiyle mevcut satiri bul, yeni satir acmak yerine ONU tazele.
            existing ??= await FindByNameAndYearAsync(dto.Name!, released, ct);

            if (existing != null)
            {
                var dirty = false;
                if (existing.IgdbId == null) { existing.IgdbId = dto.Id; dirty = true; }

                // Tarih: IGDB'nin tam tarihi, tarihi olmayan veya farkli olan kayda yazilir.
                // Buyuk yapimlarda erteleme sik oldugu icin guncel tarih onceliklidir.
                if (existing.Released != released) { existing.Released = released; dirty = true; }

                if (string.IsNullOrEmpty(existing.BackgroundImage) && dto.Cover?.ImageId != null)
                {
                    existing.BackgroundImage = CoverUrl(dto.Cover.ImageId, "t_screenshot_big");
                    dirty = true;
                }
                if (string.IsNullOrEmpty(existing.GenresJson) && dto.Genres?.Count > 0)
                {
                    existing.GenresJson = SerializeGenres(dto.Genres);
                    dirty = true;
                }
                if (string.IsNullOrEmpty(existing.PlatformsJson) && dto.Platforms?.Count > 0)
                {
                    existing.PlatformsJson = SerializePlatforms(dto.Platforms);
                    dirty = true;
                }
                if (string.IsNullOrEmpty(existing.Description) && !string.IsNullOrWhiteSpace(dto.Summary))
                {
                    existing.Description = dto.Summary;
                    dirty = true;
                }

                if (!dirty) return UpsertOutcome.Skipped;

                try
                {
                    await _context.SaveChangesAsync(ct);
                    return UpsertOutcome.Updated;
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogWarning(ex, "[IGDB] Guncelleme catismasi: {Name}", dto.Name);
                    _context.Entry(existing).State = EntityState.Detached;
                    return UpsertOutcome.Skipped;
                }
            }

            var slug = !string.IsNullOrWhiteSpace(dto.Slug) ? dto.Slug! : SlugifyName(dto.Name!);
            if (await _context.Games.AnyAsync(g => g.Slug == slug, ct))
                slug = $"{slug}-igdb-{dto.Id}";

            var developers = (dto.InvolvedCompanies ?? new List<IgdbInvolvedCompanyDto>())
                .Where(c => c.Developer && c.Company?.Name != null)
                .Select(c => new { Name = c.Company!.Name!, Slug = c.Company.Slug ?? SlugifyName(c.Company.Name!), ImageBackground = (string?)null })
                .ToList();
            var publishers = (dto.InvolvedCompanies ?? new List<IgdbInvolvedCompanyDto>())
                .Where(c => c.Publisher && c.Company?.Name != null)
                .Select(c => new { Name = c.Company!.Name!, Slug = c.Company.Slug ?? SlugifyName(c.Company.Name!) })
                .ToList();

            var officialSite = dto.Websites?.FirstOrDefault(w => w.Category == 1)?.Url;

            var newGame = new Game
            {
                RawgId = syntheticRawgId,
                IgdbId = dto.Id,
                Slug = slug,
                Name = dto.Name!,
                Released = released,
                BackgroundImage = dto.Cover?.ImageId != null ? CoverUrl(dto.Cover.ImageId, "t_screenshot_big") : null,
                CoverImage = dto.Cover?.ImageId != null ? CoverUrl(dto.Cover.ImageId, "t_cover_big") : null,
                Description = dto.Summary,
                WebsiteUrl = officialSite,
                // Cikmamis oyunda puan gecersizdir; cikmissa IGDB'nin elestirmen ortalamasi kullanilir.
                Metacritic = string.CompareOrdinal(released, DateTime.UtcNow.ToString("yyyy-MM-dd")) <= 0 && dto.AggregatedRating > 0
                    ? (int)Math.Round(dto.AggregatedRating.Value)
                    : null,
                Rating = dto.TotalRating > 0 ? Math.Round(dto.TotalRating.Value / 20.0, 2) : null,
                RawgAdded = dto.Hypes,
                GenresJson = dto.Genres?.Count > 0 ? SerializeGenres(dto.Genres) : null,
                PlatformsJson = dto.Platforms?.Count > 0 ? SerializePlatforms(dto.Platforms) : null,
                DevelopersJson = developers.Count > 0 ? System.Text.Json.JsonSerializer.Serialize(developers) : null,
                PublishersJson = publishers.Count > 0 ? System.Text.Json.JsonSerializer.Serialize(publishers) : null,
                ImportSource = "igdb",
                ImportedAt = DateTime.UtcNow,
                LastSyncedAt = DateTime.UtcNow,
                // RAWG detay backfill kuyrugu zaten RawgId > 0 filtreli; IGDB verisi tam geldigi
                // icin ayrica isaretliyoruz.
                DetailSyncedAt = DateTime.UtcNow,
            };

            try
            {
                await _context.Games.AddAsync(newGame, ct);
                await _context.SaveChangesAsync(ct);
                return UpsertOutcome.Added;
            }
            catch (DbUpdateException)
            {
                _context.Entry(newGame).State = EntityState.Detached;
                return UpsertOutcome.Skipped;
            }
        }

        private async Task<Game?> FindByNameAndYearAsync(string name, string released, CancellationToken ct)
        {
            var candidates = await _context.Games
                .Where(g => EF.Functions.ILike(g.Name, name))
                .Take(10)
                .ToListAsync(ct);

            if (candidates.Count == 0) return null;

            var normalized = NormalizeName(name);
            var year = released.Length >= 4 && int.TryParse(released[..4], out var y) ? y : (int?)null;

            foreach (var candidate in candidates)
            {
                if (NormalizeName(candidate.Name) != normalized) continue;

                var candidateYear = candidate.Released != null && candidate.Released.Length >= 4
                    && int.TryParse(candidate.Released[..4], out var cy) ? cy : (int?)null;

                // Tarihi olmayan kayit (ornek: RAWG'dan tarihsiz gelmis "Marvel's Wolverine")
                // IGDB'nin tarihiyle tamamlanmali; bu yuzden null yil eslesmeyi engellemez.
                if (year != null && candidateYear != null && year != candidateYear) continue;

                return candidate;
            }

            return null;
        }

        private static string CoverUrl(string imageId, string size) =>
            $"https://images.igdb.com/igdb/image/upload/{size}/{imageId}.jpg";

        private static string SerializeGenres(List<IgdbNamedDto> genres) =>
            System.Text.Json.JsonSerializer.Serialize(
                genres.Where(g => g.Name != null)
                    .Select(g => new { Name = g.Name!, Slug = g.Slug ?? SlugifyName(g.Name!) })
                    .ToList());

        private static string SerializePlatforms(List<IgdbPlatformDto> platforms) =>
            System.Text.Json.JsonSerializer.Serialize(
                platforms.Where(p => p.Name != null)
                    .Select(p => new { Name = p.Abbreviation ?? p.Name!, Slug = p.Slug ?? SlugifyName(p.Name!) })
                    .ToList());

        private static string NormalizeName(string name)
        {
            var sb = new StringBuilder(name.Length);
            foreach (var ch in name.ToLowerInvariant())
            {
                if (char.IsLetterOrDigit(ch)) sb.Append(ch);
            }
            return sb.ToString();
        }

        private static string SlugifyName(string value)
        {
            var sb = new StringBuilder(value.Length);
            var lastWasDash = true;
            foreach (var ch in value.ToLowerInvariant())
            {
                if (char.IsLetterOrDigit(ch) && ch < 128)
                {
                    sb.Append(ch);
                    lastWasDash = false;
                }
                else if (!lastWasDash)
                {
                    sb.Append('-');
                    lastWasDash = true;
                }
            }
            var slug = sb.ToString().Trim('-');
            return string.IsNullOrEmpty(slug) ? "game" : slug;
        }
    }
}
