using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Infrastructure.Dtos;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Globalization;
using System.Net.Http.Json;
using System.Text;

namespace GGHub.Infrastructure.Services
{
    public class SteamCatalogService : ISteamCatalogService
    {
        private readonly HttpClient _httpClient;
        private readonly SteamCatalogSettings _settings;
        private readonly GGHubDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly ILogger<SteamCatalogService> _logger;

        // Steam tur adi -> RAWG slug esleme; boylece Steam kaynakli oyunlar mevcut tur
        // filtrelerinde (GenresJson LIKE '%"Slug":"action"%') gorunur.
        private static readonly Dictionary<string, (string Name, string Slug)> GenreMap = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Action"] = ("Action", "action"),
            ["Adventure"] = ("Adventure", "adventure"),
            ["Casual"] = ("Casual", "casual"),
            ["Indie"] = ("Indie", "indie"),
            ["Massively Multiplayer"] = ("Massively Multiplayer", "massively-multiplayer"),
            ["Racing"] = ("Racing", "racing"),
            ["RPG"] = ("RPG", "role-playing-games-rpg"),
            ["Simulation"] = ("Simulation", "simulation"),
            ["Sports"] = ("Sports", "sports"),
            ["Strategy"] = ("Strategy", "strategy"),
            ["Puzzle"] = ("Puzzle", "puzzle"),
            ["Arcade"] = ("Arcade", "arcade"),
        };

        // "Early Access" / "Free To Play" gibi etiketler tur degildir; katalog turu olarak yazma.
        private static readonly HashSet<string> IgnoredGenres = new(StringComparer.OrdinalIgnoreCase)
        {
            "Early Access", "Free To Play", "Free to Play",
        };

        public SteamCatalogService(
            IHttpClientFactory httpClientFactory,
            IOptions<SteamCatalogSettings> settings,
            GGHubDbContext context,
            IMemoryCache cache,
            ILogger<SteamCatalogService> logger)
        {
            _httpClient = httpClientFactory.CreateClient("Steam");
            _settings = settings.Value;
            _context = context;
            _cache = cache;
            _logger = logger;
        }

        public async Task<int> SearchAndIngestAsync(string term, int maxIngest, CancellationToken ct = default)
        {
            if (!_settings.OnDemandEnabled || string.IsNullOrWhiteSpace(term) || maxIngest <= 0)
                return 0;

            var normalizedTerm = NormalizeName(term);
            var missCacheKey = $"steam-search-miss:{normalizedTerm}";
            if (_cache.TryGetValue(missCacheKey, out _))
                return 0;

            try
            {
                var url = $"{_settings.BaseUrl}storesearch/?term={Uri.EscapeDataString(term)}&cc={_settings.Country}&l={_settings.Language}";
                var response = await _httpClient.GetFromJsonAsync<SteamStoreSearchResponseDto>(url, ct);

                var candidates = (response?.Items ?? new List<SteamStoreSearchItemDto>())
                    .Where(i => i.Type == "app" && i.Id > 0 && !string.IsNullOrWhiteSpace(i.Name))
                    .Take(10)
                    .ToList();

                if (candidates.Count == 0)
                {
                    _cache.Set(missCacheKey, true, TimeSpan.FromMinutes(_settings.SearchMissCacheMinutes));
                    return 0;
                }

                var candidateIds = candidates.Select(c => c.Id).ToList();
                var existingAppIds = await _context.Games
                    .AsNoTracking()
                    .Where(g => g.SteamAppId != null && candidateIds.Contains(g.SteamAppId.Value))
                    .Select(g => g.SteamAppId!.Value)
                    .ToListAsync(ct);
                var existingSet = existingAppIds.ToHashSet();

                var ingested = 0;
                foreach (var candidate in candidates)
                {
                    if (ingested >= maxIngest) break;
                    if (existingSet.Contains(candidate.Id)) continue;

                    var game = await IngestAppAsync(candidate.Id, ct);
                    if (game != null && game.SteamAppId == candidate.Id && game.ImportSource == "steam")
                        ingested++;

                    // On-demand yol KULLANICI ARAMASININ icinde kosuyor: job'in 1.5 sn'lik
                    // pacing'i burada aramayi istemci timeout'unun (15 sn) disina itiyordu.
                    // En fazla 4 istek atildigi icin 250 ms nezaket arasi yeterli.
                    await Task.Delay(250, ct);
                }

                if (ingested == 0)
                    _cache.Set(missCacheKey, true, TimeSpan.FromMinutes(_settings.SearchMissCacheMinutes));

                return ingested;
            }
            catch (Exception ex)
            {
                // Arama akisi Steam yuzunden asla dusmemeli; sessizce DB-only davranisa donulur.
                _logger.LogWarning(ex, "[SteamCatalog] storesearch basarisiz (term={Term})", term);
                _cache.Set(missCacheKey, true, TimeSpan.FromMinutes(_settings.SearchMissCacheMinutes));
                return 0;
            }
        }

        public async Task<Game?> IngestAppAsync(int steamAppId, CancellationToken ct = default, int? popularityHint = null)
        {
            if (steamAppId <= 0) return null;

            var existing = await _context.Games.FirstOrDefaultAsync(g => g.SteamAppId == steamAppId, ct);
            if (existing != null)
            {
                // Zaten bagli satirda bile tarih tazelenmeli: ertelemeler sik ve RAWG'in
                // "yil sonu" placeholder'lari (orn. 2026-12-31) gercek tarihi gizliyor.
                await RefreshReleaseDateFromSteamAsync(existing, steamAppId, popularityHint, ct);
                return existing;
            }

            SteamAppDataDto? data;
            try
            {
                var url = $"{_settings.BaseUrl}appdetails?appids={steamAppId}&cc={_settings.Country}&l={_settings.Language}";
                var envelope = await _httpClient.GetFromJsonAsync<Dictionary<string, SteamAppDetailsEnvelopeDto>>(url, ct);
                data = envelope != null && envelope.TryGetValue(steamAppId.ToString(), out var entry) && entry.Success
                    ? entry.Data
                    : null;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[SteamCatalog] appdetails basarisiz (appId={AppId})", steamAppId);
                return null;
            }

            // Yalnizca gercek oyunlar: dlc/demo/music/soundtrack katalogda gurultu olur.
            if (data == null || data.Type != "game" || string.IsNullOrWhiteSpace(data.Name))
                return null;

            var released = ParseReleaseDate(data.ReleaseDate);
            var releaseYear = released != null ? int.Parse(released[..4], CultureInfo.InvariantCulture) : (int?)null;

            // Isim+yil ile mevcut bir RAWG satiri varsa yeni satir acma; appid'yi ona bagla
            // ve tarihini Steam'in (yayinci verisi) tarihiyle tazele.
            var linked = await TryLinkToExistingGameAsync(data.Name, releaseYear, steamAppId, released, popularityHint, ct);
            if (linked != null) return linked;

            var newGame = BuildGame(data, released);
            if (popularityHint is > 0) newGame.RawgAdded = popularityHint;

            // Slug carpismasina karsi deterministik son ek (Slug'da unique index yok ama
            // lookup dogrulugu icin tekil kalmali).
            if (await _context.Games.AnyAsync(g => g.Slug == newGame.Slug, ct))
                newGame.Slug = $"{newGame.Slug}-steam-{steamAppId}";

            try
            {
                await _context.Games.AddAsync(newGame, ct);
                await _context.SaveChangesAsync(ct);
                _logger.LogInformation("[SteamCatalog] Yeni oyun ingest edildi: {Name} (appId={AppId})", newGame.Name, steamAppId);
                return newGame;
            }
            catch (DbUpdateException)
            {
                // Yarista baska bir istek ayni oyunu eklemis olabilir.
                _context.Entry(newGame).State = EntityState.Detached;
                return await _context.Games.FirstOrDefaultAsync(g => g.SteamAppId == steamAppId, ct);
            }
        }

        public async Task<IReadOnlyList<int>> GetComingSoonAppIdsAsync(int count, CancellationToken ct = default)
        {
            // Kaynak SIRASI onemli: popularwishlist en cok istek listesine eklenen CIKMAMIS
            // oyunlari verir, yani buyuk yapimlari (Deadlock, Fable, CONTROL Resonant, Total War...).
            // popularcomingsoon tek basina kullanildiginda liste indie spam'iyle doluyordu ve
            // kullanicinin bekledigi AAA cikislari katalogda hic gorunmuyordu.
            var filters = new[] { "popularwishlist", "popularcomingsoon" };
            const int pageSize = 50;

            var ids = new List<int>();
            var seen = new HashSet<int>();

            foreach (var filter in filters)
            {
                for (var start = 0; start < count && ids.Count < count * filters.Length; start += pageSize)
                {
                    ct.ThrowIfCancellationRequested();
                    try
                    {
                        // Resmi olmayan ama yillardir stabil uc: arama sonuc parcasini JSON zarfinda
                        // dondurur; results_html icindeki data-ds-appid attribute'lari appid listesidir.
                        var url = $"https://store.steampowered.com/search/results/?query&start={start}&count={pageSize}" +
                                  $"&filter={filter}&infinite=1&cc={_settings.Country}&l={_settings.Language}";
                        var response = await _httpClient.GetFromJsonAsync<SteamSearchResultsDto>(url, ct);
                        var html = response?.ResultsHtml;
                        if (string.IsNullOrEmpty(html)) break;

                        var pageIds = System.Text.RegularExpressions.Regex.Matches(html, "data-ds-appid=\"(\\d+)\"")
                            .Select(m => int.TryParse(m.Groups[1].Value, out var id) ? id : 0)
                            .Where(id => id > 0)
                            .ToList();

                        if (pageIds.Count == 0) break;

                        foreach (var id in pageIds)
                        {
                            if (seen.Add(id)) ids.Add(id);
                        }

                        await Task.Delay(500, ct);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "[SteamCatalog] {Filter} aramasi basarisiz (start={Start})", filter, start);
                        break;
                    }
                }
            }

            return ids;
        }

        public async Task<IReadOnlyList<int>> GetFeaturedAppIdsAsync(CancellationToken ct = default)
        {
            try
            {
                var url = $"{_settings.BaseUrl}featuredcategories?cc={_settings.Country}&l={_settings.Language}";
                var response = await _httpClient.GetFromJsonAsync<SteamFeaturedCategoriesDto>(url, ct);

                var ids = new List<int>();
                if (response?.NewReleases?.Items != null)
                    ids.AddRange(response.NewReleases.Items.Select(i => i.Id));
                if (response?.ComingSoon?.Items != null)
                    ids.AddRange(response.ComingSoon.Items.Select(i => i.Id));

                return ids.Where(id => id > 0).Distinct().ToList();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[SteamCatalog] featuredcategories basarisiz");
                return Array.Empty<int>();
            }
        }

        /// <summary>
        /// Steam'in tarihi mevcut kaydin tarihine tercih edilmeli mi? Kural: Steam tam tarih
        /// verdiyse ve mevcut kayit ya tarihsizse ya da taraflardan biri GELECEK tarihliyse
        /// (yani erteleme/placeholder ihtimali varsa) evet. Cikmis eski kayitlarin tarihine
        /// dokunulmaz; oradaki fark cogunlukla bolgesel yeniden yayimdir.
        /// </summary>
        private static bool ShouldPreferSteamDate(string? currentReleased, string? steamReleased)
        {
            if (string.IsNullOrEmpty(steamReleased)) return false;
            if (string.IsNullOrEmpty(currentReleased)) return true;
            if (currentReleased == steamReleased) return false;

            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            return string.CompareOrdinal(currentReleased, today) > 0
                || string.CompareOrdinal(steamReleased, today) > 0;
        }

        /// <summary>SteamAppId'si zaten bagli satirlarda tarihi/populerligi tazeler.</summary>
        private async Task RefreshReleaseDateFromSteamAsync(Game existing, int steamAppId, int? popularityHint, CancellationToken ct)
        {
            // Cikmis ve tarihi makul gorunen kayitlar icin ekstra istek atmaya gerek yok.
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var needsCheck = string.IsNullOrEmpty(existing.Released)
                || string.CompareOrdinal(existing.Released, today) > 0;
            if (!needsCheck && popularityHint is not > 0) return;

            string? steamReleased = null;
            if (needsCheck)
            {
                try
                {
                    var url = $"{_settings.BaseUrl}appdetails?appids={steamAppId}&cc={_settings.Country}&l={_settings.Language}";
                    var envelope = await _httpClient.GetFromJsonAsync<Dictionary<string, SteamAppDetailsEnvelopeDto>>(url, ct);
                    if (envelope != null && envelope.TryGetValue(steamAppId.ToString(), out var entry) && entry.Success)
                        steamReleased = ParseReleaseDate(entry.Data?.ReleaseDate);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[SteamCatalog] Tarih tazeleme basarisiz (appId={AppId})", steamAppId);
                    return;
                }
            }

            var dirty = false;
            if (ShouldPreferSteamDate(existing.Released, steamReleased))
            {
                existing.Released = steamReleased;
                dirty = true;
                _logger.LogInformation("[SteamCatalog] Cikis tarihi Steam'den guncellendi: {Name} -> {Date}", existing.Name, steamReleased);
            }
            if (popularityHint is > 0 && (existing.RawgAdded ?? 0) < popularityHint)
            {
                existing.RawgAdded = popularityHint;
                dirty = true;
            }

            if (dirty) await _context.SaveChangesAsync(ct);
        }

        private async Task<Game?> TryLinkToExistingGameAsync(string name, int? releaseYear, int steamAppId, string? steamReleased, int? popularityHint, CancellationToken ct)
        {
            // ILIKE ile dar bir aday kumesi cek, normalize edilmis isimle bellek icinde karsilastir.
            var candidates = await _context.Games
                .Where(g => EF.Functions.ILike(g.Name, GameTitleMatcher.BuildLikePattern(name)))
                .Take(10)
                .ToListAsync(ct);

            var normalized = NormalizeName(name);
            foreach (var candidate in candidates)
            {
                if (NormalizeName(candidate.Name) != normalized) continue;

                // Yil bilgisi iki tarafta da varsa uyusmali; yoksa isim eslesmesi yeterli sayilir
                // (ayni isimli farkli oyunlar cogunlukla farkli yillardadir).
                var candidateYear = candidate.Released != null && candidate.Released.Length >= 4
                    && int.TryParse(candidate.Released[..4], out var y) ? y : (int?)null;
                if (releaseYear != null && candidateYear != null && releaseYear != candidateYear) continue;

                var dirty = false;
                if (candidate.SteamAppId == null)
                {
                    candidate.SteamAppId = steamAppId;
                    dirty = true;
                    _logger.LogInformation("[SteamCatalog] Mevcut oyuna appid baglandi: {Name} (appId={AppId})", candidate.Name, steamAppId);
                }

                // Steam'in tarihi yayincinin kendi verisidir: RAWG'in bos veya placeholder
                // ("2026-12-31" = yil icinde, gun belirsiz) tarihinden daha guveniliridir.
                // CONTROL Resonant vakasi: RAWG 31 Aralik diyordu, Steam 24 Eylul.
                if (ShouldPreferSteamDate(candidate.Released, steamReleased))
                {
                    candidate.Released = steamReleased;
                    dirty = true;
                    _logger.LogInformation("[SteamCatalog] Cikis tarihi Steam'den guncellendi: {Name} -> {Date}", candidate.Name, steamReleased);
                }

                if (popularityHint is > 0 && (candidate.RawgAdded ?? 0) < popularityHint)
                {
                    candidate.RawgAdded = popularityHint;
                    dirty = true;
                }

                if (dirty) await _context.SaveChangesAsync(ct);
                return candidate;

            }

            return null;
        }

        private Game BuildGame(SteamAppDataDto data, string? released)
        {
            var appId = data.SteamAppId;

            var platforms = new List<object>();
            if (data.Platforms?.Windows == true) platforms.Add(new { Name = "PC", Slug = "pc" });
            if (data.Platforms?.Mac == true) platforms.Add(new { Name = "macOS", Slug = "macos" });
            if (data.Platforms?.Linux == true) platforms.Add(new { Name = "Linux", Slug = "linux" });

            var genres = (data.Genres ?? new List<SteamGenreDto>())
                .Where(g => !string.IsNullOrWhiteSpace(g.Description) && !IgnoredGenres.Contains(g.Description!))
                .Select(g => GenreMap.TryGetValue(g.Description!, out var mapped)
                    ? new { Name = mapped.Name, Slug = mapped.Slug }
                    : new { Name = g.Description!, Slug = Slugify(g.Description!) })
                .GroupBy(g => g.Slug)
                .Select(g => g.First())
                .ToList();

            var developers = (data.Developers ?? new List<string>())
                .Where(d => !string.IsNullOrWhiteSpace(d))
                .Select(d => new { Name = d, Slug = Slugify(d), ImageBackground = (string?)null })
                .ToList();

            var publishers = (data.Publishers ?? new List<string>())
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Select(p => new { Name = p, Slug = Slugify(p) })
                .ToList();

            var stores = new List<object>
            {
                new { StoreName = "Steam", Domain = "store.steampowered.com", Url = $"https://store.steampowered.com/app/{appId}" }
            };

            // Cikmamis oyunda metacritic puani gecersizdir (RAWG yolundaki SanitizeMetacritic ile ayni kural).
            var isFuture = data.ReleaseDate?.ComingSoon == true
                || (released != null && string.Compare(released, DateTime.UtcNow.ToString("yyyy-MM-dd")) > 0);
            var metacritic = isFuture ? null : data.Metacritic?.Score;

            var slug = Slugify(data.Name!);

            string? Serialize<T>(List<T> list) => list.Count > 0 ? System.Text.Json.JsonSerializer.Serialize(list) : null;

            return new Game
            {
                RawgId = -appId,
                SteamAppId = appId,
                Slug = slug,
                Name = data.Name!,
                Released = released,
                BackgroundImage = data.HeaderImage,
                Description = data.ShortDescription,
                WebsiteUrl = data.Website,
                Metacritic = metacritic,
                MetacriticUrl = data.Metacritic?.Url,
                PlatformsJson = Serialize(platforms),
                GenresJson = Serialize(genres),
                DevelopersJson = Serialize(developers),
                PublishersJson = Serialize(publishers),
                StoresJson = Serialize(stores),
                ImportSource = "steam",
                ImportedAt = DateTime.UtcNow,
                LastSyncedAt = DateTime.UtcNow,
                // DetailSyncedAt bilerek null degil: bu kolon RAWG backfill kuyrugunun isaretidir
                // ve o kuyruk RawgId > 0 filtresiyle Steam satirlarini zaten atlar. Steam verisi
                // appdetails'ten tam geldigi icin ayrica backfill gerekmez.
                DetailSyncedAt = DateTime.UtcNow,
            };
        }

        /// <summary>
        /// "24 Jan, 2024", "Jan 24, 2024", "2024-01-24" gibi tam tarihleri "yyyy-MM-dd"e cevirir.
        /// "Q4 2026", "2026", "To be announced" gibi belirsiz degerler null kalir: oyun yine
        /// aranabilir/katalogda olur, yalnizca tarih filtreli listelerde gorunmez.
        /// </summary>
        private static string? ParseReleaseDate(SteamReleaseDateDto? releaseDate)
        {
            var raw = releaseDate?.Date?.Trim();
            if (string.IsNullOrEmpty(raw)) return null;

            string[] formats = { "d MMM, yyyy", "MMM d, yyyy", "d MMMM, yyyy", "MMMM d, yyyy", "yyyy-MM-dd" };
            if (DateTime.TryParseExact(raw, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
                return parsed.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

            return null;
        }

        /// <summary>Ortak baslik katlamasi (parantez/TM/surum eki temizler). Bkz. GameTitleMatcher.</summary>
        private static string NormalizeName(string name) => GameTitleMatcher.Normalize(name);

        private static string Slugify(string value)
        {
            var sb = new StringBuilder(value.Length);
            var lastWasDash = true; // bastaki tireleri engelle
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
