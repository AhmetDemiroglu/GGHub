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

namespace GGHub.Infrastructure.Services
{
    public class RawgGameService : IGameService
    {
        private readonly HttpClient _httpClient;
        private readonly RawgApiSettings _apiSettings;
        private readonly GGHubDbContext _context;
        private readonly IGeminiService _geminiService;

        public RawgGameService(IHttpClientFactory httpClientFactory, IOptions<RawgApiSettings> apiSettings, GGHubDbContext context, IGeminiService geminiService)
        {
            _httpClient = httpClientFactory.CreateClient();
            _apiSettings = apiSettings.Value;
            _context = context; 
            _geminiService = geminiService;
        }
        public async Task<Game?> GetGameBySlugOrIdAsync(string idOrSlug)
        {
            bool isId = int.TryParse(idOrSlug, out int rawgId);
            var gameInDb = isId
                ? await _context.Games.FirstOrDefaultAsync(g => g.RawgId == rawgId)
                : await _context.Games.FirstOrDefaultAsync(g => g.Slug == idOrSlug);

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

            var rawgIds = response.Results.Select(r => r.Id).ToList();

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
        public async Task<Game> GetOrCreateGameByRawgIdAsync(int rawgId)
        {
            var gameInDb = await _context.Games.FirstOrDefaultAsync(g => g.RawgId == rawgId);

            if (gameInDb != null)
            {
                return gameInDb;
            }

            var requestUrl = $"{_apiSettings.BaseUrl}games/{rawgId}?key={_apiSettings.ApiKey}";
            var dto = await _httpClient.GetFromJsonAsync<RawgGameSingleDto>(requestUrl);

            if (dto == null)
                throw new Exception($"RAWG API'sinde {rawgId} ID'li oyun bulunamadı.");

            var descriptionRaw = dto.Description ?? string.Empty;
            var descriptionParts = descriptionRaw.Split(new[] { "\n\n" }, StringSplitOptions.None);
            var englishDescription = descriptionParts.FirstOrDefault();

            var platforms = dto.Platform?.Select(p => new { p.Platform.Name, p.Platform.Slug }).ToList();
            var genres = dto.Genre?.Select(g => new { g.Name, g.Slug }).ToList();
            var developers = dto.Developers?.Select(d => new { d.Name, d.Slug, d.ImageBackground }).ToList();
            var publishers = dto.Publishers?.Select(p => new { p.Name, p.Slug }).ToList();
            var stores = dto.Stores?.Select(s => new { StoreName = s.Store.Name, Domain = s.Store.Domain, Url = s.Url }).ToList();

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
            await _context.SaveChangesAsync();

            return newGame;
        }

        public async Task<string> TranslateGameDescriptionAsync(int gameId)
        {
            var game = await _context.Games.FindAsync(gameId);
            if (game == null) return "Oyun bulunamadı.";
            if (!string.IsNullOrWhiteSpace(game.DescriptionTr))
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
    }
}