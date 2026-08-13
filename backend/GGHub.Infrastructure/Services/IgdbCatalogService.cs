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

        /// <summary>Gelecek tarihli cikislar bu araliktan eski dogrulandiysa yeniden sorulur.</summary>
        private static DateTime _verifyBefore => DateTime.UtcNow.AddDays(-7);

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

            var nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var from = DateTimeOffset.UtcNow.AddMonths(-_settings.MonthsBehind).ToUnixTimeSeconds();
            var to = DateTimeOffset.UtcNow.AddMonths(_settings.MonthsAhead).ToUnixTimeSeconds();

            var added = 0;
            var updated = 0;

            // IKI GECIS: once BUGUNDEN ILERISI (tarih artan), sonra YAKIN GECMIS (tarih azalan).
            // Tek gecisli "tum pencere, tarih artan" tasarimda tarama en eski aydan basliyordu ve
            // kosu basi limit dolunca bugune hic ulasamiyordu; olculdu: Temmuz 2026 haftalarca
            // bos kaldi. Ikiye bolununce hem gundemin gelecegi hem yakin gecmis hizla doluyor.
            var passes = new[]
            {
                (Where: $"date >= {nowUnix} & date <= {to}", Sort: "date asc"),
                (Where: $"date >= {from} & date < {nowUnix}", Sort: "date desc"),
            };

            foreach (var pass in passes)
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
                    .Append("game.platforms.name, game.platforms.abbreviation, game.platforms.slug, game.screenshots.image_id, ")
                    .Append("game.involved_companies.company.name, game.involved_companies.developer, game.involved_companies.publisher, ")
                    .Append("game.websites.url, game.websites.category, ")
                    .Append("game.version_parent.id, game.version_parent.name, game.version_parent.slug, ")
                    .Append("game.parent_game.id, game.parent_game.name, game.parent_game.slug; ")
                    .Append($"where {pass.Where} & date_format = 0 & game.cover != null; ")
                    .Append($"sort {pass.Sort}; ")
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

                // Slug cakisma kontrolu icin de tek toplu okuma (bkz. UpsertAsync/takenSlugs).
                var pageSlugCandidates = rows
                    .Select(r => (r.Game?.VersionParent ?? r.Game?.ParentGame)?.Slug ?? r.Game?.Slug)
                    .Where(s => !string.IsNullOrWhiteSpace(s))
                    .Select(s => s!)
                    .Distinct()
                    .ToList();
                var pageSlugs = (await _context.Games
                    .AsNoTracking()
                    .Where(g => pageSlugCandidates.Contains(g.Slug))
                    .Select(g => g.Slug)
                    .ToListAsync(ct))
                    .ToHashSet();

                // Sayfa icinde eklenen IGDB id'leri (ayni oyunun platform satirlari icin).
                var pageAdded = new HashSet<int>();

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

                    var outcome = await UpsertAsync(game, released, ct, nameMatches, deferSave: true, takenSlugs: pageSlugs, pageAddedIgdbIds: pageAdded);
                    if (outcome == UpsertOutcome.Added) added++;
                    else if (outcome == UpsertOutcome.Updated) updated++;
                }

                // Sayfa sonunda TEK yazma: biriken yeni kayitlar ve guncellemeler birlikte gider.
                try
                {
                    await _context.SaveChangesAsync(ct);
                }
                catch (DbUpdateException ex)
                {
                    // Bir satir catisirsa (yaris, unique index) sayfanin tamami kaybolmasin:
                    // izleyiciyi temizleyip sonraki sayfaya devam edilir.
                    _logger.LogWarning("[IGDB] Sayfa yazilamadi, atlaniyor (sayfa {Page}): {Error}", page, ex.InnerException?.Message ?? ex.Message);
                }
                finally
                {
                    _context.ChangeTracker.Clear();
                }

                // Ilerleme logu: eskiden yalnizca kosu BITINCE log basiliyordu ve senkron
                // saatlerce sessiz kaldigi icin "takildi mi ilerliyor mu" anlasilamiyordu.
                if (page % 5 == 0 || rows.Count < _settings.PageSize)
                {
                    var firstDate = rows.First().Human ?? "?";
                    var lastDate = rows.Last().Human ?? "?";
                    _logger.LogInformation("[IGDB] {Sort} sayfa {Page}: {Count} kayit ({First} -> {Last}), toplam +{Added}/~{Updated}",
                        pass.Sort, page, rows.Count, firstDate, lastDate, added, updated);
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
            "cover.image_id, screenshots.image_id, genres.name, genres.slug, platforms.name, platforms.abbreviation, platforms.slug, " +
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

                // Surum kayitlari ("... Ultimate Edition") katalogda ana oyunun kopyasi olur.
                // Toplu senkronda zaten eleniyordu; ANLIK arama yolunda elenmedigi icin
                // kullanici "fc 27" arayinca kopyalar geri geliyordu.
                if (GameTitleMatcher.IsEditionVariant(match.Name)) continue;

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
                    $"fields id, name, total_rating, total_rating_count, first_release_date, platforms.name, platforms.abbreviation, platforms.slug; where name = \"{safeName}\"; limit 5;", ct);

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

        /// <summary>
        /// Kullanilan populerlik kaynaklari ve agirliklari. Tip kimlikleri IGDB'nin
        /// popularity_types ucundan alindi:
        ///   2  = Want to Play  (IGDB, PLATFORM BAGIMSIZ - beklenti; GTA VI gibi konsol
        ///        ozel yapimlar ancak burada temsil ediliyor)
        ///   3  = Playing       (IGDB, su an oynanan)
        ///   1  = Visits        (IGDB, sayfa ilgisi)
        ///   34 = 24hr Hours Watched (Twitch, gunluk konusulurluk)
        /// Steam kaynakli tipler (5, 9, 10) BILEREK yok: Steam sinyalini zaten dogrudan
        /// magaza listelerinden aliyoruz ve burada da kullanmak PC'yi iki kez agirliklandirip
        /// konsol yapimlarini geriye itiyordu.
        /// </summary>
        private static readonly (int Type, double Weight)[] PopularityTypes =
        {
            (2, 1.0),
            (3, 0.8),
            (1, 0.5),
            (34, 0.6),
        };

        public async Task<Dictionary<int, double>> GetPopularitySignalsAsync(int limitPerType, CancellationToken ct = default)
        {
            var result = new Dictionary<int, double>();
            if (!IsConfigured) return result;

            var token = await GetAccessTokenAsync(ct);
            if (token == null) return result;

            foreach (var (type, weight) in PopularityTypes)
            {
                ct.ThrowIfCancellationRequested();
                try
                {
                    var query = $"fields game_id, value, popularity_type; where popularity_type = {type}; " +
                                $"sort value desc; limit {Math.Min(limitPerType, 500)};";

                    using var request = new HttpRequestMessage(HttpMethod.Post, $"{_settings.BaseUrl}popularity_primitives");
                    request.Headers.Add("Client-ID", _settings.ClientId);
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                    request.Content = new StringContent(query, Encoding.UTF8, "text/plain");

                    var response = await _httpClient.SendAsync(request, ct);
                    if (!response.IsSuccessStatusCode) continue;

                    var rows = await response.Content.ReadFromJsonAsync<List<IgdbPopularityDto>>(cancellationToken: ct);
                    if (rows == null || rows.Count == 0) continue;

                    // Degerler 0..1 arasinda ve kaynaklar arasi olcek farkli; her kaynagi kendi
                    // en yuksek degerine gore 0..100'e normalize edip agirlikla topluyoruz.
                    var max = rows.Max(r => r.Value);
                    if (max <= 0) continue;

                    foreach (var row in rows)
                    {
                        var normalized = row.Value / max * 100.0 * weight;
                        result[row.GameId] = result.GetValueOrDefault(row.GameId) + normalized;
                    }

                    await Task.Delay(_settings.DelayBetweenRequestsMs, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[IGDB] Populerlik sinyali alinamadi (tip {Type})", type);
                }
            }

            return result;
        }

        public async Task<int> RepairShiftedReleaseDatesAsync(int batchSize, CancellationToken ct = default)
        {
            if (!IsConfigured) return 0;

            var todayIso = DateTime.UtcNow.ToString("yyyy-MM-dd");

            // IGDB senkronunun DOKUNDUGU tum pencere dogrulanir: yalnizca gelecek tarihlileri
            // kontrol etmek yetmedi, cunku release_dates'in GECMIS gecisi de eski oyunlara
            // yanlis tarih yazmisti (Path of Exile 2013 -> Tem 2026, CoD: Black Ops 2010 -> Tem 2026:
            // bunlar o oyunlarin yeni platform surumlerinin tarihleriydi).
            // Pencere = son 18 ay + gelecek. Disindaki eski katalog RAWG'dan tek kaynakli geldi,
            // orada bozulma yok.
            var windowStart = DateTime.UtcNow.AddMonths(-18).ToString("yyyy-MM-dd");
            var suspects = await _context.Games
                .Where(g => g.IgdbId != null
                    && g.Released != null
                    && string.Compare(g.Released, windowStart) >= 0
                    && (g.ReleaseDateVerifiedAt == null || g.ReleaseDateVerifiedAt < _verifyBefore))
                .OrderByDescending(g => g.RawgAdded ?? 0)
                .Take(batchSize)
                .ToListAsync(ct);

            if (suspects.Count == 0) return 0;

            var idList = string.Join(",", suspects.Select(s => s.IgdbId!.Value));
            var truth = await QueryGamesAsync($"fields id, first_release_date; where id = ({idList}); limit {suspects.Count};", ct);
            if (truth == null || truth.Count == 0) return 0;

            var firstReleaseById = truth
                .Where(t => t.FirstReleaseDate != null)
                .ToDictionary(t => t.Id, t => DateTimeOffset.FromUnixTimeSeconds(t.FirstReleaseDate!.Value).UtcDateTime.ToString("yyyy-MM-dd"));

            var fixedCount = 0;
            var now = DateTime.UtcNow;
            foreach (var game in suspects)
            {
                // Dogrulandi olarak isaretle: kuyruk boylece kuruyor, aksi halde ayni kayitlar
                // her kosuda yeniden sorgulanip yeni oyunlara sira gelmiyor.
                game.ReleaseDateVerifiedAt = now;

                if (!firstReleaseById.TryGetValue(game.IgdbId!.Value, out var correct)) continue;
                if (correct == game.Released) continue;

                _logger.LogInformation("[IGDB] Tarih onarildi: {Name} {Wrong} -> {Correct}", game.Name, game.Released, correct);
                game.Released = correct;
                fixedCount++;
            }

            await _context.SaveChangesAsync(ct);
            return fixedCount;
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
                    var query = "fields id, name, total_rating, total_rating_count, first_release_date, " +
                                "platforms.name, platforms.abbreviation, platforms.slug; " +
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
                            // Platformlari tamamla (birlestirerek): RAWG kaydinda eksik kalan
                            // konsol platformlari boylece geri geliyor.
                            if (match.Platforms?.Count > 0)
                                game.PlatformsJson = MergePlatformJson(game.PlatformsJson, SerializePlatforms(match.Platforms));
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
            Dictionary<string, List<Game>>? preloadedNameMatches = null, bool deferSave = false,
            HashSet<string>? takenSlugs = null, HashSet<int>? pageAddedIgdbIds = null)
        {
            var syntheticRawgId = -(IgdbRawgIdOffset + dto.Id);

            // IGDB ayni oyun icin HER PLATFORMA ayri release_date satiri donduruyor (PS5, PC,
            // Xbox...). Toplu yazmada bu satirlarin ikincisi ayni IgdbId ile ikinci kez
            // eklenmeye calisiyor ve unique index ihlali TUM sayfayi dusuruyordu.
            if (pageAddedIgdbIds != null && pageAddedIgdbIds.Contains(dto.Id))
                return UpsertOutcome.Skipped;

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

                // TARIH KURALI (agir bir veri kaybindan sonra yazildi):
                // IGDB release_dates ucu bir oyunun HER PLATFORM/SURUM cikisi icin ayri satir
                // dondurur. Onceki surum "farkliysa yaz" diyordu ve Elden Ring'in Switch 2
                // surumunun tarihi (28 Agu 2026) ana kayda yazilip 2022 cikisli oyun "gelecekte
                // cikacak" gorunuyordu (ayni sekilde S.T.A.L.K.E.R. 2 vb.).
                // Dogru kural: CIKMIS bir oyunun tarihine ASLA dokunma; yalnizca tarihi hic
                // olmayan veya henuz cikmamis kayitlarda guncelle (erteleme senaryosu).
                var todayIso = DateTime.UtcNow.ToString("yyyy-MM-dd");
                var existingAlreadyOut = existing.Released != null
                    && string.CompareOrdinal(existing.Released, todayIso) <= 0;

                if (existing.Released == null && released != null)
                {
                    existing.Released = released;
                    dirty = true;
                }
                else if (!existingAlreadyOut && released != null
                    && string.CompareOrdinal(released, todayIso) > 0
                    && existing.Released != released)
                {
                    // Henuz cikmamis oyun + yeni tarih de gelecekte => gercek erteleme/one cekme.
                    existing.Released = released;
                    dirty = true;
                }

                if (string.IsNullOrEmpty(existing.BackgroundImage) && dto.Cover?.ImageId != null)
                {
                    existing.BackgroundImage = BackgroundUrl(dto);
                    dirty = true;
                }
                if (string.IsNullOrEmpty(existing.GenresJson) && dto.Genres?.Count > 0)
                {
                    existing.GenresJson = SerializeGenres(dto.Genres);
                    dirty = true;
                }
                // Platformlar BIRLESTIRILIR, uzerine YAZILMAZ. Uzerine yazan ilk surum agir bir
                // veri kaybina yol acti: bir oyunun IGDB kaydinda yalnizca yeni bir surumun
                // platformu bulunabiliyor ve mevcut tam liste siliniyordu (olculdu: Elden Ring
                // "switch-2" tek platformuna dustu).
                if (dto.Platforms?.Count > 0)
                {
                    var merged = MergePlatformJson(existing.PlatformsJson, SerializePlatforms(dto.Platforms));
                    if (existing.PlatformsJson != merged)
                    {
                        existing.PlatformsJson = merged;
                        dirty = true;
                    }
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

                // Toplu senkronda yazma sayfa sonuna ertelenir (bkz. deferSave).
                if (deferSave) return UpsertOutcome.Updated;

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

            // Slug cakismasi: toplu senkronda sayfa basinda cekilen kume kullanilir. Her yeni
            // kayit icin ayri AnyAsync atmak sayfa basina 500 sorgu demekti ve senkronun hic
            // bitmemesinin ana sebeplerinden biriydi.
            var slugTaken = takenSlugs != null
                ? takenSlugs.Contains(slug)
                : await _context.Games.AnyAsync(g => g.Slug == slug, ct);
            if (slugTaken) slug = $"{slug}-igdb-{dto.Id}";
            takenSlugs?.Add(slug);

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
                BackgroundImage = BackgroundUrl(dto),
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

            // Toplu senkronda kayit HEMEN yazilmaz: her oyun icin ayri SaveChanges uzak
            // Postgres'te kosuyu saatlere cikariyordu (olculdu: takvim senkronu hic bitmedi).
            // Sayfa sonunda tek seferde yazilir.
            if (deferSave)
            {
                await _context.Games.AddAsync(newGame, ct);
                pageAddedIgdbIds?.Add(dto.Id);
                return UpsertOutcome.Added;
            }

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

        /// <summary>
        /// Kart/hero arka plani icin GENIS gorsel. IGDB'nin kapagi dikeydir (264x374); onu
        /// "t_screenshot_big" ile istemek 16:9 alanlarda kirpik ve bos gorunmesine yol aciyordu.
        /// Oyunun ekran goruntusu varsa o kullanilir, yoksa kapaga dusulur.
        /// </summary>
        private static string? BackgroundUrl(IgdbGameDto dto)
        {
            var shot = dto.Screenshots?.FirstOrDefault(s => !string.IsNullOrWhiteSpace(s.ImageId))?.ImageId;
            if (shot != null) return CoverUrl(shot, "t_screenshot_big");
            return dto.Cover?.ImageId != null ? CoverUrl(dto.Cover.ImageId, "t_cover_big") : null;
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
            // IGDB iki yazimi da kullaniyor; tireli varyant haritalanmadigi icin katalogda
            // ham "switch-2" slug'i kaliyordu ve platform ikonu hic gorunmuyordu.
            ["switch2"] = ("Nintendo Switch 2", "nintendo-switch"),
            ["switch-2"] = ("Nintendo Switch 2", "nintendo-switch"),
            ["ios"] = ("iOS", "ios"),
            ["android"] = ("Android", "android"),
        };

        /// <summary>
        /// Iki platform JSON listesini Slug'a gore tekillestirerek birlestirir. Kaynaklarin
        /// hicbiri tek basina tam listeye sahip degil (Steam yalnizca PC, IGDB kaydi bazen tek
        /// surumun platformu); birlestirmek tek dogru davranis.
        /// </summary>
        private static string MergePlatformJson(string? existingJson, string incomingJson)
        {
            if (string.IsNullOrEmpty(existingJson)) return incomingJson;

            try
            {
                var current = System.Text.Json.JsonSerializer.Deserialize<List<PlatformEntry>>(existingJson) ?? new();
                var incoming = System.Text.Json.JsonSerializer.Deserialize<List<PlatformEntry>>(incomingJson) ?? new();

                var merged = current.Concat(incoming)
                    .Where(p => !string.IsNullOrWhiteSpace(p.Slug))
                    .GroupBy(p => p.Slug!, StringComparer.OrdinalIgnoreCase)
                    .Select(g => g.First())
                    .ToList();

                return merged.Count == 0 ? existingJson : System.Text.Json.JsonSerializer.Serialize(merged);
            }
            catch
            {
                return existingJson;
            }
        }

        private sealed class PlatformEntry
        {
            public string? Name { get; set; }
            public string? Slug { get; set; }
        }

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
