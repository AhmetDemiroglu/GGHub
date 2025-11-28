using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace GGHub.WebAPI.Controllers
{
    [Route("api/games")]
    [ApiController]
    public class GamesController : ControllerBase
    {
        private readonly IGameService _gameService;
        private readonly IReviewService _reviewService;

        public GamesController(IGameService gameService, IReviewService reviewService) 
        {
            _gameService = gameService;
            _reviewService = reviewService;
        }
        [HttpGet]
        public async Task<IActionResult> GetGames([FromQuery] GameQueryParams queryParams)
        {
            int? userId = null;
            if (User.Identity != null && User.Identity.IsAuthenticated)
            {
                var claim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (claim != null && int.TryParse(claim.Value, out int parsedId))
                {
                    userId = parsedId;
                }
            }

            var games = await _gameService.GetGamesAsync(queryParams, userId);
            return Ok(games);
        }
        [HttpGet("{idOrSlug}")]
        public async Task<IActionResult> GetGameById(string idOrSlug)
        {
            var game = await _gameService.GetGameBySlugOrIdAsync(idOrSlug);
            if (game == null) return NotFound();

            var ratingSummary = await _reviewService.GetGameRatingSummaryAsync(game.Id);

            var gameDto = new GameDto
            {
                Id = game.Id,
                RawgId = game.RawgId,
                Slug = game.Slug,
                Name = game.Name,
                Released = game.Released,
                BackgroundImage = game.BackgroundImage,
                Rating = game.Rating,
                Metacritic = game.Metacritic,
                Description = game.Description,
                DescriptionTr = game.DescriptionTr,
                CoverImage = game.CoverImage,
                WebsiteUrl = game.WebsiteUrl,
                EsrbRating = game.EsrbRating,
                GghubRating = ratingSummary.Average,
                GghubRatingCount = ratingSummary.Count,

                Platforms = !string.IsNullOrEmpty(game.PlatformsJson)
                    ? System.Text.Json.JsonSerializer.Deserialize<List<PlatformDto>>(game.PlatformsJson) ?? new()
                    : new(),

                Genres = !string.IsNullOrEmpty(game.GenresJson)
                    ? System.Text.Json.JsonSerializer.Deserialize<List<GenreDto>>(game.GenresJson) ?? new()
                    : new(),

                Developers = !string.IsNullOrEmpty(game.DevelopersJson)
                    ? System.Text.Json.JsonSerializer.Deserialize<List<DeveloperDto>>(game.DevelopersJson) ?? new()
                    : new(),

                Publishers = !string.IsNullOrEmpty(game.PublishersJson)
                    ? System.Text.Json.JsonSerializer.Deserialize<List<PublisherDto>>(game.PublishersJson) ?? new()
                    : new(),

                Stores = !string.IsNullOrEmpty(game.StoresJson)
                    ? System.Text.Json.JsonSerializer.Deserialize<List<StoreDto>>(game.StoresJson) ?? new()
                    : new()
            };

            return Ok(gameDto);
        }

        [HttpPost("{id}/translate")]
        public async Task<IActionResult> TranslateGameDescription(int id)
        {
            var translatedText = await _gameService.TranslateGameDescriptionAsync(id);
            return Ok(new { descriptionTr = translatedText });
        }

        [HttpGet("{id}/suggested")]
        public IActionResult GetSimilarGames(int id)
        {
            try
            {
                var result = _gameService.GetSimilarGamesAsync(id).Result;
                return Ok(new { Count = result.Count, Data = result });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    Error = ex.Message,
                    InnerError = ex.InnerException?.Message,
                    StackTrace = ex.StackTrace
                });
            }
        }
    }
}