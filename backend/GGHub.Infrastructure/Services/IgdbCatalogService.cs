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
                // date_format = 0 => gun bazli TAM tarih (gundem ancak bunlari gosterebiliyor).
                // hypes esigi BILEREK yok: IGDB'de buyuk yapimlarda bile bu alan cogu zaman bos
                // (Marvel's Wolverine ornegi) ve esik konunca tam da beklenen oyunlar eleniyordu.
                // Kalite kapisi olarak kapak sarti yeterli; siralama/vitrin zaten populerlige gore.
                var query = new StringBuilder()
                    .Append("fields date, date_format, human, game.id, game.name, game.slug, game.summary, game.hypes, ")
                    .Append("game.total_rating, game.total_rating_count, game.aggregated_rating, game.cover.image_id, game.genres.name, game.genres.slug, ")
                    .Append("game.platforms.name, game.platforms.abbreviation, game.platforms.slug, ")
                    .Append("game.involved_companies.company.name, game.involved_companies.developer, game.involved_companies.publisher, ")
                    .Append("game.websites.url, game.websites.category, ")
                    .Append("game.version_parent.id, game.version_parent.name, game.version_parent.slug, ")
                    .Append("game.parent_game.id, game.parent_game.name, game.parent_game.slug; ")
                    .Append($"where date >= {from} & date <= {to} & date_format = 0 & game.cover != null; ")
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

                // Sayfa basina TEK toplu okuma: eskiden her kayit icin ayri ILIKE sorgusu
                // atiliyordu (500 kayit x uzak Postgres = dakikalar). IgdbId'ler tek sorguda
                // cekilip bellekte eslestiriliyor.
                var pageIgdbIds = rows
                    .Select(r => (r.Game?.VersionParent ?? r.Game?.ParentGame)?.Id ?? r.Game?.Id ?? 0)
                    .Where(id => id > 0)
                    .Distinct()
                    .ToList();
                var knownIgdbIds = (await _context.Games
                    .AsNoTracking()
                    .Where(g => g.IgdbId != null && pageIgdbIds.Contains(g.IgdbId.Value))
                    .Select(g => new { g.IgdbId, g.Released })
                    .ToListAsync(ct))
                    .ToDictionary(x => x.IgdbId!.Value, x => x.Released);

                // Isim eslesmeleri de TEK sorguda: eskiden her yeni oyun icin ayri ILIKE
                // atiliyordu ve 500 kayitlik sayfa uzak Postgres'te dakikalar suruyordu
                // (olculdu: takvim senkronu saatlerce bitmedi). Sayfadaki tum isimler bir kerede
                // cekilip bellekte normalize edilerek eslestiriliyor.
                var pageNames = rows
                    .Select(r => ((r.Game?.VersionParent ?? r.Game?.ParentGame)?.Name ?? r.Game?.Name))
                    .Where(n => !string.IsNullOrWhiteSpace(n))
                    .Select(n => n!.ToLower())
                    .Distinct()
                    .ToList();
                var nameMatches = (await _context.Games
                    .Where(g => pageNames.Contains(g.Name.ToLower()))
                    .ToListAsync(ct))
                    .GroupBy(g => NormalizeName(g.Name))
                    .ToDictionary(g => g.Key, g => g.ToList());

                foreach (var row in rows)
                {
                    if (row.Game == null || row.Date == null || string.IsNullOrWhiteSpace(row.Game.Name)) continue;

                    // Ana oyuna baglanamayan surum kaydi ("EA Sports FC 27: Ultimate Edition")
                    // katalogda ana oyunun kopyasi olarak gorunuyordu; ingest edilmez.
                    var hasParent = row.Game.VersionParent != null || row.Game.ParentGame != null;
                    if (!hasParent && GameTitleMatcher.IsEditionVariant(row.Game.Name)) continue;

                    var released = DateTimeOffset.FromUnixTimeSeconds(row.Date.Value).UtcDateTime.ToString("yyyy-MM-dd");

                    // Surum kaydi ("... Digital Deluxe Edition") ise katalogda ANA oyunu tazele:
                    // buyuk yapimlarda tarih bazen yalnizca surum kaydinda bulunuyor.
                    var game = row.Game;
                    var parent = game.VersionParent ?? game.ParentGame;
                    if (parent != null && !string.IsNullOrWhiteSpace(parent.Name))
                    {
                        game = new IgdbGameDto
                        {
                            Id = parent.Id,
                            Name = parent.Name,
                            Slug = parent.Slug,
                            // Ana oyun kaydinda olmayan zengin alanlar surumden devralinir.
                            Summary = game.Summary,
                            Hypes = game.Hypes,
                            TotalRating = game.TotalRating,
                            TotalRatingCount = game.TotalRatingCount,
                            AggregatedRating = game.AggregatedRating,
                            Cover = game.Cover,
                            Genres = game.Genres,
                            Platforms = game.Platforms,
                            InvolvedCompanies = game.InvolvedCompanies,
                            Websites = game.Websites,
                        };
                    }

                    // Zaten bagli ve tarihi ayni olan kayit icin hicbir sorgu atma (en sik durum).
                    if (knownIgdbIds.TryGetValue(game.Id, out var knownReleased) && knownReleased == released)
                        continue;

                    var outcome = await UpsertAsync(game, released, ct, nameMatches);
                    if (outcome == UpsertOutcome.Added) added++;
                    else if (outcome == UpsertOutcome.Updated) updated++;
                }

                if (rows.Count < _settings.PageSize) break;
                await Task.Delay(_settings.DelayBetweenRequestsMs, ct);
            }

            _logger.LogInformation("[IGDB] Senkron bitti: {Added} yeni, {Updated} guncellendi.", added, updated);
            return (added, updated);
        }

        /// <summary>Anlik arama + ingest yolunda kullanilan ortak alan listesi.</summary>
        private const string GameFields =
            "fields id, name, slug, summary, first_release_date, total_rating, total_rating_count, hypes, " +
            "cover.image_id, genres.name, genres.slug, platforms.name, platforms.abbreviation, platforms.slug, " +
            "involved_companies.company.name, involved_companies.company.slug, involved_companies.developer, " +
            "involved_companies.publisher, websites.url, websites.category;";

        public async Task<int> SearchAndIngestAsync(string term, int maxIngest, CancellationToken ct = default)
        {
            if (!IsConfigured || string.IsNullOrWhiteSpace(term) || maxIngest <= 0) return 0;

            var missCacheKey = $"igdb-search-miss:{term.ToLowerInvariant()}";
            if (_cache.TryGetValue(missCacheKey, out _)) return 0;

            var matches = await QueryGamesAsync($"{GameFields} search \"{term.Replace("\"", string.Empty)}\"; limit 10;", ct);
            if (matches == null || matches.Count == 0)
            {
                _cache.Set(missCacheKey, true, TimeSpan.FromMinutes(15));
                return 0;
            }

            var ingested = 0;
            foreach (var match in matches)
            {
                if (ingested >= maxIngest) break;
                if (string.IsNullOrWhiteSpace(match.Name) || match.Cover?.ImageId == null) continue;

                var existing = await _context.Games.AsNoTracking().FirstOrDefaultAsync(g => g.IgdbId == match.Id, ct);
                if (existing != null) continue;

                var released = match.FirstReleaseDate != null
                    ? DateTimeOffset.FromUnixTimeSeconds(match.FirstReleaseDate.Value).UtcDateTime.ToString("yyyy-MM-dd")
                    : null;

                var outcome = await UpsertAsync(match, released, ct);
                if (outcome == UpsertOutcome.Added) ingested++;
            }

            if (ingested == 0) _cache.Set(missCacheKey, true, TimeSpan.FromMinutes(15));
            return ingested;
        }

        public async Task<Game?> IngestBySlugOrNameAsync(string slugOrName, CancellationToken ct = default)
        {
            if (!IsConfigured || string.IsNullOrWhiteSpace(slugOrName)) return null;

            var safe = slugOrName.Replace("\"", string.Empty);
            // Once slug ile birebir dene (web/mobil linkleri slug tasiyor), sonra serbest arama.
            var matches = await QueryGamesAsync($"{GameFields} where slug = \"{safe}\"; limit 1;", ct);
            if (matches == null || matches.Count == 0)
            {
                var asName = safe.Replace('-', ' ');
                matches = await QueryGamesAsync($"{GameFields} search \"{asName}\"; limit 5;", ct);
            }

            var match = matches?.FirstOrDefault(m => !string.IsNullOrWhiteSpace(m.Name));
            if (match == null) return null;

            var released = match.FirstReleaseDate != null
                ? DateTimeOffset.FromUnixTimeSeconds(match.FirstReleaseDate.Value).UtcDateTime.ToString("yyyy-MM-dd")
                : null;

            await UpsertAsync(match, released, ct);
            return await _context.Games.FirstOrDefaultAsync(g => g.IgdbId == match.Id, ct);
        }

        public async Task EnrichGameAsync(Game game, CancellationToken ct = default)
        {
            // Zaten kontrol edilmis veya kaynagi IGDB olan satirda is yok.
            if (!IsConfigured || game.IgdbCheckedAt != null || game.IgdbId != null) return;

            try
            {
                var safeName = game.Name.Replace("\"", string.Empty);
                var matches = await QueryGamesAsync(
                    $"fields id, name, total_rating, total_rating_count, first_release_date; where name = \"{safeName}\"; limit 5;", ct);

                var match = PickBestMatch(matches, game.Name, game.Released);

                var tracked = await _context.Games.FirstOrDefaultAsync(g => g.Id == game.Id, ct);
                if (tracked == null) return;

                tracked.IgdbCheckedAt = DateTime.UtcNow;

                if (match != null && !await _context.Games.AnyAsync(g => g.IgdbId == match.Id && g.Id != tracked.Id, ct))
                {
                    tracked.IgdbId = match.Id;
                    if (match.TotalRating > 0)
                    {
                        tracked.IgdbRating = Math.Round(match.TotalRating.Value, 1);
                        tracked.IgdbRatingCount = match.TotalRatingCount;
                    }
                }

                await _context.SaveChangesAsync(ct);

                // Cagiran taraf AsNoTracking kopyayla calisiyor olabilir; alanlari ona da yaz.
                game.IgdbId = tracked.IgdbId;
                game.IgdbRating = tracked.IgdbRating;
                game.IgdbRatingCount = tracked.IgdbRatingCount;
                game.IgdbCheckedAt = tracked.IgdbCheckedAt;
            }
            catch (Exception ex)
            {
                // Detay sayfasi IGDB yuzunden ASLA dusmemeli.
                _logger.LogWarning(ex, "[IGDB] Anlik zenginlestirme basarisiz ({Name})", game.Name);
            }
        }

        /// <summary>IGDB games ucuna Apicalypse sorgusu atar. Hata halinde null.</summary>
        private async Task<List<IgdbGameDto>?> QueryGamesAsync(string query, CancellationToken ct)
        {
            var token = await GetAccessTokenAsync(ct);
            if (token == null) return null;

            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, $"{_settings.BaseUrl}games");
                request.Headers.Add("Client-ID", _settings.ClientId);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                request.Content = new StringContent(query, Encoding.UTF8, "text/plain");

                var response = await _httpClient.SendAsync(request, ct);
                if (!response.IsSuccessStatusCode) return null;

                return await response.Content.ReadFromJsonAsync<List<IgdbGameDto>>(cancellationToken: ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[IGDB] Anlik sorgu hatasi");
                return null;
            }
        }

        public async Task<int> EnrichExistingGamesAsync(int batchSize, CancellationToken ct = default)
        {
            if (!IsConfigured) return 0;

            var token = await GetAccessTokenAsync(ct);
            if (token == null) return 0;

            // Kuyruk: IGDB eslesmesi olmayan, populerlige gore en degerli oyunlar once.
            // IgdbId dolduktan sonra satir kuyruktan cikar, boylece is bittikce kuyruk kurur.
            var recheckBefore = DateTime.UtcNow.AddDays(-30);
            var batch = await _context.Games
                .Where(g => g.RawgId > 0
                    && (g.IgdbCheckedAt == null || (g.IgdbId != null && g.IgdbCheckedAt < recheckBefore)))
                .OrderBy(g => g.IgdbCheckedAt == null ? 0 : 1)
                .ThenByDescending(g => g.RawgAdded ?? 0)
                .Take(batchSize)
                .Select(g => new { g.Id, g.Name, g.Released })
                .ToListAsync(ct);

            if (batch.Count == 0) return 0;

            var processed = 0;

            foreach (var item in batch)
            {
                ct.ThrowIfCancellationRequested();

                try
                {
                    // Apicalypse'te tirnak kacisi: ad icindeki " karakteri sorguyu bozar.
                    var safeName = item.Name.Replace("\"", string.Empty);
                    var query = "fields id, name, total_rating, total_rating_count, first_release_date; " +
                                $"where name = \"{safeName}\"; limit 5;";

                    using var request = new HttpRequestMessage(HttpMethod.Post, $"{_settings.BaseUrl}games");
                    request.Headers.Add("Client-ID", _settings.ClientId);
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                    request.Content = new StringContent(query, Encoding.UTF8, "text/plain");

                    var response = await _httpClient.SendAsync(request, ct);
                    if (!response.IsSuccessStatusCode)
                    {
                        // 429 gibi durumlarda kuyrugu yakmadan cik; sonraki kosuda devam eder.
                        _logger.LogWarning("[IGDB] Zenginlestirme durdu ({Status}).", response.StatusCode);
                        break;
                    }

                    var matches = await response.Content.ReadFromJsonAsync<List<IgdbGameDto>>(cancellationToken: ct);
                    var match = PickBestMatch(matches, item.Name, item.Released);

                    var game = await _context.Games.FirstOrDefaultAsync(g => g.Id == item.Id, ct);
                    if (game == null) continue;

                    // Eslesme bulunsun bulunmasin isaretle: kuyruk ancak boyle kuruyor.
                    game.IgdbCheckedAt = DateTime.UtcNow;

                    if (match != null)
                    {
                        // Ayni IGDB kaydi baska bir satira baglanmis olabilir (unique index).
                        var taken = await _context.Games.AnyAsync(g => g.IgdbId == match.Id && g.Id != game.Id, ct);
                        if (!taken)
                        {
                            game.IgdbId = match.Id;
                            if (match.TotalRating > 0)
                            {
                                game.IgdbRating = Math.Round(match.TotalRating.Value, 1);
                                game.IgdbRatingCount = match.TotalRatingCount;
                            }
                        }
                    }

                    await _context.SaveChangesAsync(ct);
                    processed++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[IGDB] Zenginlestirme hatasi ({Name})", item.Name);
                }

                await Task.Delay(_settings.DelayBetweenRequestsMs, ct);
            }

            _logger.LogInformation("[IGDB] Zenginlestirme: {Processed} oyun islendi.", processed);
            return processed;
        }

        /// <summary>Isim ayni olan birden fazla IGDB kaydindan yila en yakin olani secer.</summary>
        private static IgdbGameDto? PickBestMatch(List<IgdbGameDto>? matches, string name, string? released)
        {
            if (matches == null || matches.Count == 0) return null;
            if (matches.Count == 1) return matches[0];

            var year = released != null && released.Length >= 4 && int.TryParse(released[..4], out var y) ? y : (int?)null;
            if (year == null) return matches.OrderByDescending(m => m.TotalRatingCount ?? 0).First();

            return matches
                .OrderBy(m =>
                {
                    if (m.FirstReleaseDate == null) return int.MaxValue;
                    var mYear = DateTimeOffset.FromUnixTimeSeconds(m.FirstReleaseDate.Value).Year;
                    return Math.Abs(mYear - year.Value);
                })
                .ThenByDescending(m => m.TotalRatingCount ?? 0)
                .First();
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

        private async Task<UpsertOutcome> UpsertAsync(
            IgdbGameDto dto, string? released, CancellationToken ct,
            Dictionary<string, List<Game>>? preloadedNameMatches = null)
        {
            var syntheticRawgId = -(IgdbRawgIdOffset + dto.Id);

            var existing = await _context.Games.FirstOrDefaultAsync(g => g.IgdbId == dto.Id, ct);

            // IGDB kaydi yoksa: ayni oyun baska kaynaktan (RAWG/Steam) gelmis olabilir.
            // Isim + yil eslesmesiyle mevcut satiri bul, yeni satir acmak yerine ONU tazele.
            // Toplu senkronda sozluk onceden dolduruldugu icin ekstra sorgu atilmaz.
            existing ??= preloadedNameMatches != null
                ? MatchFromPreloaded(preloadedNameMatches, dto.Name!, released)
                : await FindByNameAndYearAsync(dto.Name!, released, ct);

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

                // IGDB puani her zaman tazelenir: puanlar zamanla degisir ve bu alan
                // yalnizca IGDB'ye ait (baska kaynagin verisini ezmez).
                if (dto.TotalRating > 0 && Math.Abs((existing.IgdbRating ?? 0) - dto.TotalRating.Value) > 0.01)
                {
                    existing.IgdbRating = Math.Round(dto.TotalRating.Value, 1);
                    existing.IgdbRatingCount = dto.TotalRatingCount;
                    dirty = true;
                }

                // Populerlik sinyali yoksa IGDB'ninkini yaz (gundem vitrini bunu kullaniyor).
                var igdbPopularity = dto.Hypes ?? (dto.TotalRatingCount is > 0 ? dto.TotalRatingCount * 3 : null);
                if (igdbPopularity is > 0 && (existing.RawgAdded ?? 0) < igdbPopularity)
                {
                    existing.RawgAdded = igdbPopularity;
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
                // Cikmamis (veya tarihi bilinmeyen) oyunda puan gecersizdir; cikmissa IGDB'nin
                // elestirmen ortalamasi kullanilir.
                Metacritic = released != null
                    && string.CompareOrdinal(released, DateTime.UtcNow.ToString("yyyy-MM-dd")) <= 0
                    && dto.AggregatedRating > 0
                    ? (int)Math.Round(dto.AggregatedRating.Value)
                    : null,
                Rating = dto.TotalRating > 0 ? Math.Round(dto.TotalRating.Value / 20.0, 2) : null,
                IgdbRating = dto.TotalRating > 0 ? Math.Round(dto.TotalRating.Value, 1) : null,
                IgdbRatingCount = dto.TotalRatingCount,
                // Populerlik sinyali: hypes (bekleyen kullanici) yoksa oy sayisindan turetilir;
                // ikisi de yoksa gundem vitrini bu oyunu one cikaramaz (dogru davranis).
                RawgAdded = dto.Hypes ?? (dto.TotalRatingCount is > 0 ? dto.TotalRatingCount * 3 : null),
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

        /// <summary>Onceden yuklenmis isim sozlugunden yil toleransli eslesme secer.</summary>
        private static Game? MatchFromPreloaded(Dictionary<string, List<Game>> byNormalizedName, string name, string? released)
        {
            if (!byNormalizedName.TryGetValue(NormalizeName(name), out var candidates)) return null;

            var year = released != null && released.Length >= 4 && int.TryParse(released[..4], out var y) ? y : (int?)null;

            foreach (var candidate in candidates)
            {
                var candidateYear = candidate.Released != null && candidate.Released.Length >= 4
                    && int.TryParse(candidate.Released[..4], out var cy) ? cy : (int?)null;

                // Tarihi olmayan kayit IGDB'nin tarihiyle tamamlanmali; null yil eslesmeyi engellemez.
                if (year != null && candidateYear != null && year != candidateYear) continue;
                return candidate;
            }

            return null;
        }

        private async Task<Game?> FindByNameAndYearAsync(string name, string? released, CancellationToken ct)
        {
            var candidates = await _context.Games
                .Where(g => EF.Functions.ILike(g.Name, GameTitleMatcher.BuildLikePattern(name)))
                .Take(10)
                .ToListAsync(ct);

            if (candidates.Count == 0) return null;

            var normalized = NormalizeName(name);
            var year = released != null && released.Length >= 4 && int.TryParse(released[..4], out var y) ? y : (int?)null;

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

        /// <summary>
        /// IGDB platform slug'i -> katalog slug'i. IGDB "win", "ps5", "series-x" derken bizim
        /// ikonlar ve filtreler "pc", "playstation5", "xbox-series-x" bekliyor; esleme olmadan
        /// oyun kartlarinda platformlarin cogu gorunmuyordu (olculdu: yalnizca Xbox cikiyordu).
        /// </summary>
        private static readonly Dictionary<string, (string Name, string Slug)> PlatformMap = new(StringComparer.OrdinalIgnoreCase)
        {
            ["win"] = ("PC", "pc"),
            ["pc"] = ("PC", "pc"),
            ["linux"] = ("Linux", "linux"),
            ["mac"] = ("macOS", "macos"),
            ["ps5"] = ("PlayStation 5", "playstation5"),
            ["ps4"] = ("PlayStation 4", "playstation4"),
            ["ps4--1"] = ("PlayStation 4", "playstation4"),
            ["ps3"] = ("PlayStation 3", "playstation3"),
            ["psvita"] = ("PS Vita", "ps-vita"),
            ["series-x"] = ("Xbox Series X", "xbox-series-x"),
            ["series-x-s"] = ("Xbox Series X", "xbox-series-x"),
            ["xboxone"] = ("Xbox One", "xbox-one"),
            ["xbox360"] = ("Xbox 360", "xbox360"),
            ["switch"] = ("Nintendo Switch", "nintendo-switch"),
            ["switch2"] = ("Nintendo Switch 2", "nintendo-switch"),
            ["ios"] = ("iOS", "ios"),
            ["android"] = ("Android", "android"),
        };

        private static string SerializePlatforms(List<IgdbPlatformDto> platforms) =>
            System.Text.Json.JsonSerializer.Serialize(
                platforms.Where(p => p.Name != null)
                    .Select(p => PlatformMap.TryGetValue(p.Slug ?? string.Empty, out var mapped)
                        ? new { Name = mapped.Name, Slug = mapped.Slug }
                        : new { Name = p.Abbreviation ?? p.Name!, Slug = p.Slug ?? SlugifyName(p.Name!) })
                    .GroupBy(p => p.Slug)
                    .Select(g => g.First())
                    .ToList());

        /// <summary>Ortak baslik katlamasi (parantez/TM/surum eki temizler). Bkz. GameTitleMatcher.</summary>
        private static string NormalizeName(string name) => GameTitleMatcher.Normalize(name);

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
