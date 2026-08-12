using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;
using GGHub.Application.Exceptions;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Dtos;
using GGHub.Infrastructure.Localization;
using GGHub.Infrastructure.Persistence; 
using GGHub.Infrastructure.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using System.Net.Http.Json;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services
{
    public class RawgGameService : IGameService
    {
        private readonly HttpClient _httpClient;
        private readonly RawgApiSettings _apiSettings;
        private readonly GGHubDbContext _context;
        private readonly IGeminiService _geminiService;
        private readonly ILogger<RawgGameService> _logger;
        private readonly IMemoryCache _cache;
        private readonly ISteamCatalogService _steamCatalog;
        private readonly SteamCatalogSettings _steamSettings;

        public RawgGameService(IHttpClientFactory httpClientFactory, IOptions<RawgApiSettings> apiSettings, GGHubDbContext context, IGeminiService geminiService, ILogger<RawgGameService> logger, IMemoryCache cache, ISteamCatalogService steamCatalog, IOptions<SteamCatalogSettings> steamSettings)
        {
            // "Rawg" adli client: kisa timeout + retry + circuit breaker (WebAPI Program.cs).
            // Worker gibi bu adi kaydetmeyen host'larda CreateClient bos varsayilan client dondurur,
            // davranis eskisi gibi kalir.
            _httpClient = httpClientFactory.CreateClient("Rawg");
            _apiSettings = apiSettings.Value;
            _context = context;
            _geminiService = geminiService;
            _logger = logger;
            _cache = cache;
            _steamCatalog = steamCatalog;
            _steamSettings = steamSettings.Value;
        }
        public async Task<Game?> GetGameBySlugOrIdAsync(string idOrSlug)
        {
            bool isId = int.TryParse(idOrSlug, out int rawgId);
            var gameInDb = isId
                ? await _context.Games.AsNoTracking().FirstOrDefaultAsync(g => g.RawgId == rawgId)
                : await _context.Games.AsNoTracking().FirstOrDefaultAsync(g => g.Slug == idOrSlug);

            // Sentetik negatif id'ler (Steam: -appId, IGDB: -(1e9 + igdbId)) icin RAWG'a ASLA
            // gidilmez: veri ingest sirasinda tam alinmistir ve RAWG bu id'leri tanimaz.
            // Satir uzlastirma sonrasi gercek RawgId'ye gecmis olabilir, o yuzden kaynak
            // kolonlarindan da aranir (eski linkler olmemeli).
            if (isId && rawgId < 0)
            {
                if (gameInDb == null)
                {
                    var positiveId = -rawgId;
                    gameInDb = positiveId > IgdbCatalogService.IgdbRawgIdOffset
                        ? await _context.Games.AsNoTracking().FirstOrDefaultAsync(g => g.IgdbId == positiveId - IgdbCatalogService.IgdbRawgIdOffset)
                        : await _context.Games.AsNoTracking().FirstOrDefaultAsync(g => g.SteamAppId == positiveId);
                }
                return gameInDb;
            }
            if (gameInDb != null && gameInDb.RawgId < 0)
            {
                return gameInDb;
            }

            // DB-first: detay verisi bir kez dolmussa yastan bagimsiz HEMEN don. Eski kural
            // (LastSyncedAt < 1 gun) neredeyse hic saglanmiyordu cunku backfill job bilerek
            // LastSyncedAt yazmiyor; sonuc olarak her detay istegi RAWG'a canli gidiyordu ve
            // RAWG'in coktugu gun DB'de kayitli oyunlarin sayfalari da dusuyordu.
            // Tazelik sorumlulugu Worker'in (Metacritic/backfill joblari); istek yolu degil.
            if (gameInDb != null
                && (gameInDb.DetailSyncedAt != null || !string.IsNullOrEmpty(gameInDb.DevelopersJson)))
            {
                return gameInDb;
            }

            var requestUrl = $"{_apiSettings.BaseUrl}games/{idOrSlug}?key={_apiSettings.ApiKey}";

            RawgGameSingleDto? dto;
            try
            {
                dto = await _httpClient.GetFromJsonAsync<RawgGameSingleDto>(requestUrl);
            }
            catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                // RAWG kesin olarak "yok" dedi: 404 semantigi korunur.
                return null;
            }
            catch (Exception ex)
            {
                // Timeout, circuit breaker, 5xx, bozuk JSON... hepsi ayni anlama gelir:
                // katalog su an erisilemez. DB'de bayat da olsa kopya varsa onu don;
                // yoksa 404 (yalan) yerine 503'e map'lenecek tipli istisna firlat.
                _logger.LogWarning(ex, "[RawgGameService] RAWG erisilemedi ({IdOrSlug}); DB kopyasina dusuluyor.", idOrSlug);
                if (gameInDb != null) return gameInDb;
                throw new ExternalCatalogUnavailableException($"RAWG erisilemedi: {idOrSlug}", ex);
            }

            if (dto == null) return null;

            {

                var descriptionRaw = dto.Description ?? string.Empty;
                var descriptionParts = descriptionRaw.Split(new[] { "\n\n" }, StringSplitOptions.None);
                var englishDescription = descriptionParts.FirstOrDefault();
                var platforms = dto.Platform?.Select(p => new { p.Platform.Name, p.Platform.Slug }).ToList();
                var genres = dto.Genre?.Select(g => new { g.Name, g.Slug }).ToList();
                var developers = dto.Developers?.Select(d => new { d.Name, d.Slug, d.ImageBackground }).ToList();
                var publishers = dto.Publishers?.Select(p => new { p.Name, p.Slug }).ToList();
                var stores = dto.Stores?.Select(s => new { StoreName = s.Store.Name, Domain = s.Store.Domain, Url = s.Url }).ToList();

                if (gameInDb != null)
                {
                    gameInDb.Name = dto.Name;
                    gameInDb.Description = englishDescription;
                    gameInDb.Rating = dto.Rating;
                    var sanitizedMetacritic = SanitizeMetacritic(dto.Metacritic, dto.Released);
                    if (sanitizedMetacritic != null)
                    {
                        gameInDb.Metacritic = sanitizedMetacritic;
                    }
                    else if (dto.Metacritic != null && IsFutureRelease(dto.Released))
                    {
                        // Gelecek tarihli oyunda RAWG'den gelen metacritic puanı geçerli olamaz;
                        // varsa DB'de duranı da temizle.
                        gameInDb.Metacritic = null;
                    }
                    gameInDb.Released = dto.Released;
                    gameInDb.BackgroundImage = dto.BackgroundImage;
                    gameInDb.CoverImage = dto.CoverImage;
                    gameInDb.LastSyncedAt = DateTime.UtcNow;
                    gameInDb.PlatformsJson = platforms != null ? System.Text.Json.JsonSerializer.Serialize(platforms) : null;
                    gameInDb.GenresJson = genres != null ? System.Text.Json.JsonSerializer.Serialize(genres) : null;
                    gameInDb.DevelopersJson = developers != null ? System.Text.Json.JsonSerializer.Serialize(developers) : null;
                    gameInDb.PublishersJson = publishers != null ? System.Text.Json.JsonSerializer.Serialize(publishers) : null;
                    gameInDb.StoresJson = stores != null ? System.Text.Json.JsonSerializer.Serialize(stores) : null;
                    gameInDb.WebsiteUrl = dto.Website;
                    gameInDb.EsrbRating = dto.EsrbRating?.Name;

                    _context.Games.Update(gameInDb);
                }
                else
                {
                    var newGame = new Game
                    {
                        RawgId = dto.Id,
                        Name = dto.Name,
                        Slug = dto.Slug,
                        Description = englishDescription,
                        Released = dto.Released,
                        BackgroundImage = dto.BackgroundImage,
                        CoverImage = dto.CoverImage,
                        Rating = dto.Rating,
                        Metacritic = SanitizeMetacritic(dto.Metacritic, dto.Released),
                        LastSyncedAt = DateTime.UtcNow,

                        PlatformsJson = platforms != null ? System.Text.Json.JsonSerializer.Serialize(platforms) : null,
                        GenresJson = genres != null ? System.Text.Json.JsonSerializer.Serialize(genres) : null,
                        DevelopersJson = developers != null ? System.Text.Json.JsonSerializer.Serialize(developers) : null,
                        PublishersJson = publishers != null ? System.Text.Json.JsonSerializer.Serialize(publishers) : null,
                        StoresJson = stores != null ? System.Text.Json.JsonSerializer.Serialize(stores) : null,
                        WebsiteUrl = dto.Website,
                        EsrbRating = dto.EsrbRating?.Name
                    };
                    await _context.Games.AddAsync(newGame);
                    gameInDb = newGame;
                }

                await _context.SaveChangesAsync();
                return gameInDb;
            }
        }

        /// <summary>
        /// Local DB üzerinden oyun arama. RAWG live API artık kullanılmıyor;
        /// import job arka planda DB'yi büyütmeye devam ediyor.
        /// Birincil kullanım: "listeye oyun ekle" modalı gibi search use-case'leri.
        /// Discover feed için GET /api/games/discover endpoint'ini kullanın.
        /// </summary>
        public async Task<PaginatedResult<GameDto>> GetGamesAsync(GameQueryParams queryParams, int? userId = null)
        {
            var query = _context.Games.AsNoTracking()
                .Where(g => g.BackgroundImage != null);

            if (!string.IsNullOrWhiteSpace(queryParams.Search))
                query = query.Where(g => EF.Functions.ILike(g.Name, $"%{queryParams.Search}%"));

            if (!string.IsNullOrWhiteSpace(queryParams.Genres))
            {
                var slug = NormalizeFilterSlug(queryParams.Genres.Trim(), DiscoverService.GenreIdToSlug);
                if (!string.IsNullOrEmpty(slug))
                    query = query.Where(g => g.GenresJson != null && EF.Functions.Like(g.GenresJson, $"%\"Slug\":\"{slug}\"%"));
            }

            if (!string.IsNullOrWhiteSpace(queryParams.Platforms))
            {
                var slug = NormalizeFilterSlug(queryParams.Platforms.Trim(), DiscoverService.PlatformIdToSlug);
                if (!string.IsNullOrEmpty(slug))
                    query = query.Where(g => g.PlatformsJson != null && EF.Functions.Like(g.PlatformsJson, $"%\"Slug\":\"{slug}\"%"));
            }

            if (!string.IsNullOrWhiteSpace(queryParams.Dates))
            {
                var parts = queryParams.Dates.Split(',');
                if (parts.Length == 2)
                {
                    var start = parts[0].Trim();
                    var end   = parts[1].Trim();
                    if (!string.IsNullOrEmpty(start))
                        query = query.Where(g => g.Released != null && string.Compare(g.Released, start) >= 0);
                    if (!string.IsNullOrEmpty(end))
                        query = query.Where(g => g.Released != null && string.Compare(g.Released, end) <= 0);
                }
            }

            int totalCount = await query.CountAsync();

            // On-demand Steam tamamlama: arama DB'de yeterli sonuc bulamadiysa (ilk sayfada)
            // Steam magazasinda ara, eksik oyunlari ingest et ve DB sorgusunu BIR kez tekrarla.
            // "Anomaly President" sinifi vaka: oyun Steam'de gercek, RAWG kataloğunda yok.
            // SearchAndIngestAsync hatalari sessizce yutar; arama asla Steam yuzunden dusmez.
            if (!string.IsNullOrWhiteSpace(queryParams.Search)
                && queryParams.Page == 1
                && totalCount < 3
                && _steamSettings.OnDemandEnabled)
            {
                var ingestedCount = await _steamCatalog.SearchAndIngestAsync(queryParams.Search.Trim(), _steamSettings.OnDemandMaxIngest);
                if (ingestedCount > 0)
                {
                    totalCount = await query.CountAsync();
                }
            }

            IOrderedQueryable<Game> ordered = queryParams.Ordering switch
            {
                "-metacritic" => query.OrderByDescending(g => g.Metacritic ?? 0).ThenByDescending(g => g.Rating ?? 0),
                "-released"   => query.OrderByDescending(g => g.Released ?? "0000-00-00"),
                "-added"      => query.OrderByDescending(g => g.RawgAdded ?? 0),
                "-rating"     => query.OrderByDescending(g => g.Rating ?? 0),
                "name"        => query.OrderBy(g => g.Name),
                _             => query.OrderByDescending(g => g.Rating ?? 0).ThenByDescending(g => g.RawgAdded ?? 0),
            };

            var games = await ordered
                .Skip((queryParams.Page - 1) * queryParams.PageSize)
                .Take(queryParams.PageSize)
                .Select(g => new
                {
                    g.Id, g.RawgId, g.Slug, g.Name, g.Released,
                    g.BackgroundImage, g.Rating, g.Metacritic,
                    g.AverageRating, g.RatingCount, g.IgdbRating, g.IgdbRatingCount,
                    g.GenresJson, g.PlatformsJson,
                })
                .ToListAsync();

            var wishlistSet = new HashSet<int>();
            if (userId.HasValue)
            {
                var ids = await _context.UserLists
                    .Where(l => l.UserId == userId && l.Type == UserListType.Wishlist)
                    .SelectMany(l => l.UserListGames)
                    .Select(ulg => ulg.Game.RawgId)
                    .ToListAsync();
                wishlistSet = new HashSet<int>(ids);
            }

            var items = games.Select(g => new GameDto
            {
                Id                = g.Id,
                RawgId            = g.RawgId,
                Slug              = g.Slug,
                Name              = g.Name,
                Released          = g.Released,
                BackgroundImage   = g.BackgroundImage,
                Rating            = g.Rating,
                Metacritic        = g.Metacritic,
                GghubRating       = g.AverageRating,
                GghubRatingCount  = g.RatingCount,
                IgdbRating        = g.IgdbRating,
                IgdbRatingCount   = g.IgdbRatingCount,
                IsInWishlist      = wishlistSet.Contains(g.RawgId),
                Platforms         = DeserializePlatforms(g.PlatformsJson),
                Genres            = DeserializeGenres(g.GenresJson),
            }).ToList();

            return new PaginatedResult<GameDto>
            {
                Items      = items,
                TotalCount = totalCount,
                Page       = queryParams.Page,
                PageSize   = queryParams.PageSize,
            };
        }

        private static string NormalizeFilterSlug(string value, IReadOnlyDictionary<string, string> idToSlug)
        {
            if (int.TryParse(value, out _))
                return idToSlug.TryGetValue(value, out var mapped) ? mapped : string.Empty;
            return value;
        }

        private static List<PlatformDto> DeserializePlatforms(string? json)
        {
            if (string.IsNullOrEmpty(json)) return new List<PlatformDto>();
            try { return System.Text.Json.JsonSerializer.Deserialize<List<PlatformDto>>(json) ?? new(); }
            catch { return new(); }
        }

        private static List<GenreDto> DeserializeGenres(string? json)
        {
            if (string.IsNullOrEmpty(json)) return new List<GenreDto>();
            try { return System.Text.Json.JsonSerializer.Deserialize<List<GenreDto>>(json) ?? new(); }
            catch { return new(); }
        }
        public async Task<Game> EnsureGameExistsAsync(int rawgId, object? rawgDtoObj = null)
        {
            var rawgDto = rawgDtoObj as RawgGameDto;
            var gameInDb = await _context.Games.FirstOrDefaultAsync(g => g.RawgId == rawgId);

            // Steam kaynakli oyun (RawgId < 0): RAWG'a gidilmez. Satir yoksa Steam'den ingest
            // denenir (ornegin baska ortamda eklenmis bir oyunun linki paylasildiysa).
            if (rawgId < 0)
            {
                var positiveId = -rawgId;

                // IGDB araligi (1e9 offset): satir zaten ingest edilmis olmali, canli cagri yok.
                if (positiveId > IgdbCatalogService.IgdbRawgIdOffset)
                {
                    gameInDb ??= await _context.Games.FirstOrDefaultAsync(g => g.IgdbId == positiveId - IgdbCatalogService.IgdbRawgIdOffset);
                    if (gameInDb != null) return gameInDb;
                    throw new ExternalCatalogUnavailableException($"IGDB kaynakli oyun bulunamadi: rawgId={rawgId}");
                }

                gameInDb ??= await _context.Games.FirstOrDefaultAsync(g => g.SteamAppId == positiveId);
                if (gameInDb != null) return gameInDb;

                var ingested = await _steamCatalog.IngestAppAsync(positiveId);
                if (ingested != null) return ingested;

                throw new ExternalCatalogUnavailableException($"Steam kaynakli oyun bulunamadi: rawgId={rawgId}");
            }

            // Review/wishlist/liste ekleme icin oyunun DB'de temel verisiyle var olmasi yeter.
            // Eski 24 saatlik tazelik sarti, RAWG'in coktugu gunlerde bu akislari da
            // gereksiz yere RAWG'a bagimli kiliyordu; kayit varsa hemen don.
            if (gameInDb != null && !string.IsNullOrEmpty(gameInDb.GenresJson))
            {
                return gameInDb;
            }

            RawgGameSingleDto? fullDto = null;

            bool needsApiCall =
                gameInDb == null
                || string.IsNullOrEmpty(gameInDb.GenresJson);

            if (needsApiCall)
            {
                var requestUrl = $"{_apiSettings.BaseUrl}games/{rawgId}?key={_apiSettings.ApiKey}";
                try
                {
                    fullDto = await _httpClient.GetFromJsonAsync<RawgGameSingleDto>(requestUrl);
                }
                catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    if (gameInDb != null) return gameInDb;
                    if (rawgDto == null) throw new Exception(AppText.Get("rawg.gameNotFoundById", new Dictionary<string, object?> { ["rawgId"] = rawgId }));
                }
                catch (Exception ex)
                {
                    // RAWG erisilemez (timeout, breaker, 5xx...). DB kaydi varsa onunla devam;
                    // liste ozetinden (rawgDto) oyun kurulabiliyorsa fullDto olmadan devam;
                    // ikisi de yoksa 503'e map'lenecek tipli istisna.
                    _logger.LogWarning(ex, "[RawgGameService] RAWG erisilemedi (EnsureGameExists rawgId={RawgId}).", rawgId);
                    if (gameInDb != null) return gameInDb;
                    if (rawgDto == null) throw new ExternalCatalogUnavailableException($"RAWG erisilemedi: rawgId={rawgId}", ex);
                }
            }

            string? SerializeIfNotNull<T>(T? data) => data != null ? System.Text.Json.JsonSerializer.Serialize(data) : null;

            if (gameInDb != null)
            {
                if (fullDto != null)
                {
                    var descriptionParts = (fullDto.Description ?? "").Split(new[] { "\n\n" }, StringSplitOptions.None);

                    gameInDb.Name = fullDto.Name;
                    gameInDb.Slug = fullDto.Slug;
                    gameInDb.Description = descriptionParts.FirstOrDefault();
                    gameInDb.Released = fullDto.Released;
                    gameInDb.BackgroundImage = fullDto.BackgroundImage;
                    gameInDb.CoverImage = fullDto.CoverImage;
                    gameInDb.Rating = fullDto.Rating;
                    gameInDb.WebsiteUrl = fullDto.Website;
                    gameInDb.EsrbRating = fullDto.EsrbRating?.Name;

                    gameInDb.PlatformsJson = SerializeIfNotNull(fullDto.Platform?.Select(p => new { p.Platform.Name, p.Platform.Slug }).ToList());
                    gameInDb.GenresJson = SerializeIfNotNull(fullDto.Genre?.Select(g => new { g.Name, g.Slug }).ToList());
                    gameInDb.DevelopersJson = SerializeIfNotNull(fullDto.Developers?.Select(d => new { d.Name, d.Slug, d.ImageBackground }).ToList());
                    gameInDb.PublishersJson = SerializeIfNotNull(fullDto.Publishers?.Select(p => new { p.Name, p.Slug }).ToList());
                    gameInDb.StoresJson = SerializeIfNotNull(fullDto.Stores?.Select(s => new { StoreName = s.Store.Name, Domain = s.Store.Domain, Url = s.Url }).ToList());

                    if (gameInDb.Metacritic == null)
                        gameInDb.Metacritic = SanitizeMetacritic(fullDto.Metacritic, fullDto.Released);
                    else if (IsFutureRelease(fullDto.Released))
                        gameInDb.Metacritic = null;
                }
                else if (rawgDto != null && string.IsNullOrEmpty(gameInDb.GenresJson))
                {
                    gameInDb.GenresJson = SerializeIfNotNull(rawgDto.Genres?.Select(g => new { g.Name, g.Slug }).ToList());
                    gameInDb.PlatformsJson = SerializeIfNotNull(rawgDto.Platforms?.Select(p => new { p.Platform.Name, p.Platform.Slug }).ToList());

                    if (gameInDb.Metacritic == null)
                        gameInDb.Metacritic = SanitizeMetacritic(rawgDto.Metacritic, rawgDto.Released);
                    else if (IsFutureRelease(rawgDto.Released))
                        gameInDb.Metacritic = null;
                }

                gameInDb.LastSyncedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return gameInDb;
            }

            var newGame = new Game
            {
                RawgId = rawgId,
                LastSyncedAt = DateTime.UtcNow
            };

            if (fullDto != null)
            {
                var descriptionParts = (fullDto.Description ?? "").Split(new[] { "\n\n" }, StringSplitOptions.None);

                newGame.Name = fullDto.Name;
                newGame.Slug = fullDto.Slug;
                newGame.Description = descriptionParts.FirstOrDefault();
                newGame.Released = fullDto.Released;
                newGame.BackgroundImage = fullDto.BackgroundImage;
                newGame.CoverImage = fullDto.CoverImage;
                newGame.Rating = fullDto.Rating;
                newGame.WebsiteUrl = fullDto.Website;
                newGame.EsrbRating = fullDto.EsrbRating?.Name;

                newGame.PlatformsJson = SerializeIfNotNull(fullDto.Platform?.Select(p => new { p.Platform.Name, p.Platform.Slug }).ToList());
                newGame.GenresJson = SerializeIfNotNull(fullDto.Genre?.Select(g => new { g.Name, g.Slug }).ToList());
                newGame.DevelopersJson = SerializeIfNotNull(fullDto.Developers?.Select(d => new { d.Name, d.Slug, d.ImageBackground }).ToList());
                newGame.PublishersJson = SerializeIfNotNull(fullDto.Publishers?.Select(p => new { p.Name, p.Slug }).ToList());
                newGame.StoresJson = SerializeIfNotNull(fullDto.Stores?.Select(s => new { StoreName = s.Store.Name, Domain = s.Store.Domain, Url = s.Url }).ToList());

                newGame.Metacritic = SanitizeMetacritic(fullDto.Metacritic, fullDto.Released);
            }
            else if (rawgDto != null)
            {
                newGame.Name = rawgDto.Name;
                newGame.Slug = rawgDto.Slug;
                newGame.Released = rawgDto.Released;
                newGame.BackgroundImage = rawgDto.BackgroundImage;
                newGame.Rating = rawgDto.Rating;

                newGame.GenresJson = SerializeIfNotNull(rawgDto.Genres?.Select(g => new { g.Name, g.Slug }).ToList());
                newGame.PlatformsJson = SerializeIfNotNull(rawgDto.Platforms?.Select(p => new { p.Platform.Name, p.Platform.Slug }).ToList());

                newGame.Metacritic = SanitizeMetacritic(rawgDto.Metacritic, rawgDto.Released);
            }

            try
            {
                await _context.Games.AddAsync(newGame);
                await _context.SaveChangesAsync();
                return newGame;
            }
            catch (DbUpdateException)
            {
                _context.Entry(newGame).State = EntityState.Detached;
                gameInDb = await _context.Games.FirstOrDefaultAsync(g => g.RawgId == rawgId);
                if (gameInDb == null) throw;
                return gameInDb;
            }
        }

        public async Task<Game> GetOrCreateGameByRawgIdAsync(int rawgId)
        {
            return await EnsureGameExistsAsync(rawgId);
        }

        public async Task<string> TranslateGameDescriptionAsync(int gameId)
        {
            var game = await _context.Games.FindAsync(gameId);
            if (game == null) return "Oyun bulunamadı.";

            if (!string.IsNullOrWhiteSpace(game.DescriptionTr) &&
                !string.Equals(game.DescriptionTr, game.Description, StringComparison.OrdinalIgnoreCase))
            {
                return game.DescriptionTr;
            }
            if (string.IsNullOrWhiteSpace(game.Description))
            {
                return "Çevrilecek açıklama bulunamadı.";
            }

            var translatedText = await _geminiService.TranslateHtmlDescriptionAsync(game.Description);

            // null = ceviri uretilemedi. Iki kural birden:
            //  1) Hicbir sey YAZMA. Eskiden hata halinde Ingilizce metnin kendisi donuyordu ve
            //     DescriptionTr'ye "Turkce ceviri" diye Ingilizce yaziliyordu.
            //  2) Cagirana basarili gibi gorunme. Ingilizce metni 200 ile dondurmek, UI'in
            //     "Ceviri tamamlandi" demesine ama ekranda hicbir seyin degismemesine yol aciyordu.
            //     Firlatiyoruz ki uc durust bir hata donebilsin.
            if (string.IsNullOrWhiteSpace(translatedText) ||
                string.Equals(translatedText, game.Description, StringComparison.OrdinalIgnoreCase))
            {
                throw new GeminiTranslationFailedException(
                    $"Ceviri uretilemedi (gameId={gameId}).");
            }

            game.DescriptionTr = translatedText;
            _context.Entry(game).Property(x => x.DescriptionTr).IsModified = true;

            await _context.SaveChangesAsync();

            return translatedText;
        }

        /// <summary>
        /// Benzer oyunlar, tamamen yerel DB'den. Eski surum RAWG'in tur listesine canli
        /// gidiyordu ve DB fallback'i olmadigi icin RAWG coktugunde bu uc da dusuyordu.
        /// DB'deki kalite-filtreli katalog ayni isi gorur: kaynak oyunun ilk turune gore
        /// en yuksek puanli 10 oyun. Sonuc 6 saat cache'lenir.
        /// </summary>
        public async Task<List<GameDto>> GetSimilarGamesAsync(int rawgGameId)
        {
            var cacheKey = $"similar-games:{rawgGameId}";
            if (_cache.TryGetValue(cacheKey, out List<GameDto>? cached) && cached != null)
            {
                return cached;
            }

            var sourceGame = await _context.Games
                .AsNoTracking()
                .Where(g => g.RawgId == rawgGameId)
                .Select(g => new { g.RawgId, g.GenresJson })
                .FirstOrDefaultAsync();

            if (sourceGame == null)
            {
                return new List<GameDto>();
            }

            var genres = DeserializeGenres(sourceGame.GenresJson);
            var firstGenreSlug = genres.FirstOrDefault()?.Slug;

            var query = _context.Games
                .AsNoTracking()
                .Where(g => g.RawgId != rawgGameId
                    && g.BackgroundImage != null
                    && (g.Metacritic >= 60 || g.Rating >= 3.5));

            if (!string.IsNullOrEmpty(firstGenreSlug))
            {
                query = query.Where(g => g.GenresJson != null && EF.Functions.Like(g.GenresJson, $"%\"Slug\":\"{firstGenreSlug}\"%"));
            }
            else
            {
                // Kaynak oyunun turu bilinmiyorsa son 2 yilin populer oyunlarina dus.
                var startDate = DateTime.UtcNow.AddYears(-2).ToString("yyyy-MM-dd");
                query = query.Where(g => g.Released != null && string.Compare(g.Released, startDate) >= 0);
            }

            var similar = await query
                .OrderByDescending(g => g.Metacritic ?? 0)
                .ThenByDescending(g => g.Rating ?? 0)
                .Take(10)
                .Select(g => new
                {
                    g.Id, g.RawgId, g.Name, g.Slug, g.Released,
                    g.BackgroundImage, g.Rating, g.Metacritic,
                    g.AverageRating, g.RatingCount, g.IgdbRating, g.IgdbRatingCount,
                })
                .ToListAsync();

            var result = similar.Select(g => new GameDto
            {
                Id = g.Id,
                RawgId = g.RawgId,
                Name = g.Name,
                Slug = g.Slug,
                Released = g.Released,
                BackgroundImage = g.BackgroundImage,
                Rating = g.Rating,
                Metacritic = g.Metacritic,
                GghubRating = g.AverageRating,
                GghubRatingCount = g.RatingCount,
                IgdbRating = g.IgdbRating,
                IgdbRatingCount = g.IgdbRatingCount
            }).ToList();

            _cache.Set(cacheKey, result, TimeSpan.FromHours(6));
            return result;
        }

        /// <summary>
        /// Henüz çıkmamış oyunlarda metacritic puanı geçersizdir. RAWG arada böyle hatalı
        /// metadata döndürebiliyor. Released gelecek tarihliyse null'a indirir.
        /// </summary>
        private static int? SanitizeMetacritic(int? rawMetacritic, string? released)
        {
            if (rawMetacritic == null) return null;
            if (IsFutureRelease(released)) return null;
            return rawMetacritic;
        }

        private static bool IsFutureRelease(string? released)
        {
            if (string.IsNullOrEmpty(released)) return false;
            var todayIso = DateTime.UtcNow.ToString("yyyy-MM-dd");
            return string.Compare(released, todayIso) > 0;
        }
    }

}
