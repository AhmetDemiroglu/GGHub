using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Dtos;
using GGHub.Infrastructure.Persistence; 
using GGHub.Infrastructure.Settings;
using Microsoft.EntityFrameworkCore; 
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

        public RawgGameService(IHttpClientFactory httpClientFactory, IOptions<RawgApiSettings> apiSettings, GGHubDbContext context, IGeminiService geminiService, ILogger<RawgGameService> logger)
        {
            _httpClient = httpClientFactory.CreateClient();
            _apiSettings = apiSettings.Value;
            _context = context; 
            _geminiService = geminiService;
            _logger = logger;
        }
        public async Task<Game?> GetGameBySlugOrIdAsync(string idOrSlug)
        {
            bool isId = int.TryParse(idOrSlug, out int rawgId);
            var gameInDb = isId
                ? await _context.Games.AsNoTracking().FirstOrDefaultAsync(g => g.RawgId == rawgId)
                : await _context.Games.AsNoTracking().FirstOrDefaultAsync(g => g.Slug == idOrSlug);

            if (gameInDb != null
                && (DateTime.UtcNow - gameInDb.LastSyncedAt).TotalDays < 1
                && !string.IsNullOrEmpty(gameInDb.DevelopersJson))
            {
                return gameInDb;
            }

            var requestUrl = $"{_apiSettings.BaseUrl}games/{idOrSlug}?key={_apiSettings.ApiKey}";

            try
            {
                var dto = await _httpClient.GetFromJsonAsync<RawgGameSingleDto>(requestUrl);
                if (dto == null) return null;

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
                    gameInDb.Metacritic = dto.Metacritic;
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
                        Metacritic = dto.Metacritic,
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
            catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return null;
            }
        }

        public async Task<PaginatedResult<GameDto>> GetGamesAsync(GameQueryParams queryParams, int? userId = null)
        {
            var requestUrl = $"{_apiSettings.BaseUrl}games?key={_apiSettings.ApiKey}&page={queryParams.Page}&page_size={queryParams.PageSize}";

            if (string.IsNullOrWhiteSpace(queryParams.Search) && string.IsNullOrWhiteSpace(queryParams.Ordering))
            {
                requestUrl += "&metacritic=70,100";
            }

            if (!string.IsNullOrWhiteSpace(queryParams.Search))
            {
                requestUrl += $"&search={queryParams.Search}";
            }

            if (!string.IsNullOrWhiteSpace(queryParams.Ordering) && queryParams.Ordering != "relevance")
            {
                requestUrl += $"&ordering={queryParams.Ordering}";
            }

            if (!string.IsNullOrWhiteSpace(queryParams.Genres)) { requestUrl += $"&genres={queryParams.Genres}"; }
            if (!string.IsNullOrWhiteSpace(queryParams.Platforms)) { requestUrl += $"&platforms={queryParams.Platforms}"; }
            if (!string.IsNullOrWhiteSpace(queryParams.Dates)) { requestUrl += $"&dates={queryParams.Dates}"; }
            else if (queryParams.Ordering == "-released")
            {
                var start = DateTime.UtcNow.AddYears(-10).ToString("yyyy-MM-dd");
                var end = DateTime.UtcNow.AddMonths(24).ToString("yyyy-MM-dd");
                requestUrl += $"&dates={start},{end}";
            }

            var response = await _httpClient.GetFromJsonAsync<PaginatedResponseDto<RawgGameDto>>(requestUrl);

            if (response == null || !response.Results.Any())
            {
                return new PaginatedResult<GameDto>
                {
                    Items = new List<GameDto>(),
                    TotalCount = 0,
                    Page = queryParams.Page,
                    PageSize = queryParams.PageSize
                };
            }

            var rawgIds = response.Results.Select(r => r.Id).Distinct().ToList();

            var wishlistGameIds = new HashSet<int>(); 
            if (userId.HasValue)
            {
                var wishlist = await _context.UserLists
                    .Where(l => l.UserId == userId && l.Type == UserListType.Wishlist)
                    .SelectMany(l => l.UserListGames)
                    .Select(ulg => ulg.Game.RawgId)
                    .ToListAsync();

                foreach (var id in wishlist) wishlistGameIds.Add(id);
            }

            var existingRawgIds = await _context.Games
                .Where(g => rawgIds.Contains(g.RawgId))
                .Select(g => g.RawgId)
                .ToListAsync();

            var newGames = response.Results
                .Where(r => !existingRawgIds.Contains(r.Id))
                .Select(dto => new Game
                {
                    RawgId = dto.Id,
                    Name = dto.Name,
                    Slug = dto.Slug,
                    Released = dto.Released,
                    BackgroundImage = dto.BackgroundImage,
                    Rating = dto.Rating,
                    Metacritic = dto.Metacritic,
                    GenresJson = dto.Genres != null
                        ? System.Text.Json.JsonSerializer.Serialize(dto.Genres.Select(g => new { g.Name, g.Slug }))
                        : null,
                    PlatformsJson = dto.Platforms != null
                        ? System.Text.Json.JsonSerializer.Serialize(dto.Platforms.Select(p => new { p.Platform.Name, p.Platform.Slug }))
                        : null,
                    LastSyncedAt = DateTime.UtcNow
                })
                .ToList();

            if (newGames.Any())
            {
                await _context.Games.AddRangeAsync(newGames);
                await _context.SaveChangesAsync();
            }

            var localRatings = await _context.Games
                .Where(g => rawgIds.Contains(g.RawgId))
                .Select(g => new { g.RawgId, g.AverageRating, g.RatingCount })
                .ToDictionaryAsync(k => k.RawgId, v => new { v.AverageRating, v.RatingCount });

            var gameDtos = response.Results
                .Select(dto =>
                {
                    var stats = localRatings.ContainsKey(dto.Id) ? localRatings[dto.Id] : null;

                    return new GameDto
                    {
                        Id = 0, 
                        RawgId = dto.Id,
                        Slug = dto.Slug,
                        Name = dto.Name,
                        Released = dto.Released,
                        BackgroundImage = dto.BackgroundImage,
                        Rating = dto.Rating,
                        Metacritic = dto.Metacritic,
                        Description = null,
                        CoverImage = null,
                        IsInWishlist = wishlistGameIds.Contains(dto.Id),
                        Platforms = dto.Platforms?.Select(p => new PlatformDto { Name = p.Platform.Name, Slug = p.Platform.Slug }).ToList() ?? new List<PlatformDto>(),
                        Genres = dto.Genres?.Select(g => new GenreDto { Name = g.Name, Slug = g.Slug }).ToList() ?? new List<GenreDto>(),
                        GghubRating = stats?.AverageRating ?? 0,
                        GghubRatingCount = stats?.RatingCount ?? 0
                    };
                })
                .ToList();

            return new PaginatedResult<GameDto>
            {
                Items = gameDtos,
                TotalCount = response.Count,
                Page = queryParams.Page,
                PageSize = queryParams.PageSize
            };
        }
        public async Task<Game> EnsureGameExistsAsync(int rawgId, object? rawgDtoObj = null)
        {
            var rawgDto = rawgDtoObj as RawgGameDto;
            var gameInDb = await _context.Games.FirstOrDefaultAsync(g => g.RawgId == rawgId);

            if (gameInDb != null
                && (DateTime.UtcNow - gameInDb.LastSyncedAt).TotalDays < 1
                && !string.IsNullOrEmpty(gameInDb.GenresJson)
                && !string.IsNullOrEmpty(gameInDb.DevelopersJson))
            {
                return gameInDb;
            }

            RawgGameSingleDto? fullDto = null;
            bool needsApiCall = gameInDb == null
                || string.IsNullOrEmpty(gameInDb.DevelopersJson)
                || (DateTime.UtcNow - gameInDb.LastSyncedAt).TotalDays >= 1;

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
                    if (rawgDto == null) throw new Exception($"RAWG API'sinde {rawgId} ID'li oyun bulunamadı.");
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
                    gameInDb.Metacritic = fullDto.Metacritic;
                    gameInDb.WebsiteUrl = fullDto.Website;
                    gameInDb.EsrbRating = fullDto.EsrbRating?.Name;
                    gameInDb.PlatformsJson = SerializeIfNotNull(fullDto.Platform?.Select(p => new { p.Platform.Name, p.Platform.Slug }).ToList());
                    gameInDb.GenresJson = SerializeIfNotNull(fullDto.Genre?.Select(g => new { g.Name, g.Slug }).ToList());
                    gameInDb.DevelopersJson = SerializeIfNotNull(fullDto.Developers?.Select(d => new { d.Name, d.Slug, d.ImageBackground }).ToList());
                    gameInDb.PublishersJson = SerializeIfNotNull(fullDto.Publishers?.Select(p => new { p.Name, p.Slug }).ToList());
                    gameInDb.StoresJson = SerializeIfNotNull(fullDto.Stores?.Select(s => new { StoreName = s.Store.Name, Domain = s.Store.Domain, Url = s.Url }).ToList());
                }
                else if (rawgDto != null && string.IsNullOrEmpty(gameInDb.GenresJson))
                {
                    gameInDb.GenresJson = SerializeIfNotNull(rawgDto.Genres?.Select(g => new { g.Name, g.Slug }).ToList());
                    gameInDb.PlatformsJson = SerializeIfNotNull(rawgDto.Platforms?.Select(p => new { p.Platform.Name, p.Platform.Slug }).ToList());
                }

                gameInDb.LastSyncedAt = DateTime.UtcNow;
                _context.Games.Update(gameInDb);
                await _context.SaveChangesAsync();
                return gameInDb;
            }
            else
            {
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
                    newGame.Metacritic = fullDto.Metacritic;
                    newGame.WebsiteUrl = fullDto.Website;
                    newGame.EsrbRating = fullDto.EsrbRating?.Name;
                    newGame.PlatformsJson = SerializeIfNotNull(fullDto.Platform?.Select(p => new { p.Platform.Name, p.Platform.Slug }).ToList());
                    newGame.GenresJson = SerializeIfNotNull(fullDto.Genre?.Select(g => new { g.Name, g.Slug }).ToList());
                    newGame.DevelopersJson = SerializeIfNotNull(fullDto.Developers?.Select(d => new { d.Name, d.Slug, d.ImageBackground }).ToList());
                    newGame.PublishersJson = SerializeIfNotNull(fullDto.Publishers?.Select(p => new { p.Name, p.Slug }).ToList());
                    newGame.StoresJson = SerializeIfNotNull(fullDto.Stores?.Select(s => new { StoreName = s.Store.Name, Domain = s.Store.Domain, Url = s.Url }).ToList());
                }
                else if (rawgDto != null)
                {
                    newGame.Name = rawgDto.Name;
                    newGame.Slug = rawgDto.Slug;
                    newGame.Released = rawgDto.Released;
                    newGame.BackgroundImage = rawgDto.BackgroundImage;
                    newGame.Rating = rawgDto.Rating;
                    newGame.Metacritic = rawgDto.Metacritic;
                    newGame.GenresJson = SerializeIfNotNull(rawgDto.Genres?.Select(g => new { g.Name, g.Slug }).ToList());
                    newGame.PlatformsJson = SerializeIfNotNull(rawgDto.Platforms?.Select(p => new { p.Platform.Name, p.Platform.Slug }).ToList());
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
            game.DescriptionTr = translatedText;
            _context.Entry(game).Property(x => x.DescriptionTr).IsModified = true;

            await _context.SaveChangesAsync();

            return translatedText;
        }

        public async Task<List<GameDto>> GetSimilarGamesAsync(int rawgGameId)
        {
            var sourceGame = await _context.Games
                .AsNoTracking()
                .Select(g => new { g.RawgId, g.GenresJson })
                .FirstOrDefaultAsync(g => g.RawgId == rawgGameId);

            string requestUrl;
            List<GenreDto>? genres = null;

            if (sourceGame != null && !string.IsNullOrEmpty(sourceGame.GenresJson))
            {
                try
                {
                    genres = System.Text.Json.JsonSerializer.Deserialize<List<GenreDto>>(sourceGame.GenresJson);
                }
                catch { }
            }

            if (genres != null && genres.Any())
            {
                var genreSlugs = string.Join(",", genres.Select(g => g.Slug).Take(2));
                requestUrl = $"{_apiSettings.BaseUrl}games?key={_apiSettings.ApiKey}&genres={genreSlugs}&ordering=-metacritic&page_size=12";
            }
            else
            {
                var startDate = DateTime.Now.AddYears(-2).ToString("yyyy-MM-dd");
                var endDate = DateTime.Now.ToString("yyyy-MM-dd");
                requestUrl = $"{_apiSettings.BaseUrl}games?key={_apiSettings.ApiKey}&dates={startDate},{endDate}&ordering=-rating&page_size=12";
            }

            try
            {
                var response = await _httpClient.GetFromJsonAsync<PaginatedResponseDto<RawgGameDto>>(requestUrl);

                if (response?.Results == null || !response.Results.Any())
                {
                    return new List<GameDto>();
                }

                var rawgIds = response.Results
                    .Where(r => r.Id != rawgGameId)
                    .Select(r => r.Id)
                    .Distinct()
                    .Take(10)
                    .ToList();

                var rawgResults = response.Results
                    .Where(r => rawgIds.Contains(r.Id))
                    .GroupBy(r => r.Id)
                    .Select(g => g.First())
                    .ToList();

                foreach (var dto in rawgResults)
                {
                    try
                    {
                        await EnsureGameExistsAsync(dto.Id, dto);
                    }
                    catch { }
                }

                var updatedRatings = await _context.Games
                .AsNoTracking()
                .Where(g => rawgIds.Contains(g.RawgId))
                .GroupBy(g => g.RawgId)
                .Select(g => g.First())
                .ToDictionaryAsync(
                    k => k.RawgId,
                    v => new { v.AverageRating, v.RatingCount }
                );

                return rawgResults.Select(dto =>
                {
                    updatedRatings.TryGetValue(dto.Id, out var stats);
                    return new GameDto
                    {
                        RawgId = dto.Id,
                        Name = dto.Name,
                        Slug = dto.Slug,
                        Released = dto.Released,
                        BackgroundImage = dto.BackgroundImage,
                        Rating = dto.Rating,
                        Metacritic = dto.Metacritic,
                        GghubRating = stats?.AverageRating ?? 0,
                        GghubRatingCount = stats?.RatingCount ?? 0
                    };
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[GetSimilarGames] EXCEPTION for RawgId: {RawgId}", rawgGameId);
                throw;
            }
        }
    }
 
}