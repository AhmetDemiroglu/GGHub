using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
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

        public RawgGameService(IHttpClientFactory httpClientFactory, IOptions<RawgApiSettings> apiSettings, GGHubDbContext context)
        {
            _httpClient = httpClientFactory.CreateClient();
            _apiSettings = apiSettings.Value;
            _context = context; 
        }
        public async Task<Game?> GetGameBySlugOrIdAsync(string idOrSlug)
        {
            bool isId = int.TryParse(idOrSlug, out int rawgId);
            var gameInDb = isId
                ? await _context.Games.FirstOrDefaultAsync(g => g.RawgId == rawgId)
                : await _context.Games.FirstOrDefaultAsync(g => g.Slug == idOrSlug);

            if (gameInDb != null && (DateTime.UtcNow - gameInDb.LastSyncedAt).TotalDays < 1)
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
                    LastSyncedAt = DateTime.UtcNow
                };

                await _context.Games.AddAsync(newGame);
                await _context.SaveChangesAsync();

                return newGame;
            }
            catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return null;
            }
        }

        public async Task<PaginatedResult<GameDto>> GetGamesAsync(GameQueryParams queryParams)
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

            var gameDtos = response.Results
                .Where(dto =>
                {
                    if (!string.IsNullOrWhiteSpace(dto.Released) &&
                        DateTime.TryParse(dto.Released, out var releaseDate) &&
                        releaseDate.Year <= 2025)
                    {
                        return (dto.Metacritic.HasValue && dto.Metacritic > 0) ||
                               (dto.Rating.HasValue && dto.Rating > 0);
                    }
                    return true;
                })
                .Select(dto => new GameDto
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
                    Platforms = dto.Platforms?.Select(p => new PlatformDto { Name = p.Platform.Name, Slug = p.Platform.Slug }).ToList() ?? new List<PlatformDto>(),
                    Genres = dto.Genres?.Select(g => new GenreDto { Name = g.Name, Slug = g.Slug }).ToList() ?? new List<GenreDto>()
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
                LastSyncedAt = DateTime.UtcNow
            };

            await _context.Games.AddAsync(newGame);
            await _context.SaveChangesAsync();

            return newGame;
        }
    }
}