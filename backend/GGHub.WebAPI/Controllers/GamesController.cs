using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

namespace GGHub.WebAPI.Controllers
{
    [Route("api/games")]
    [ApiController]
    public class GamesController : ControllerBase
    {
        private readonly IGameService _gameService;
        private readonly IDiscoverService _discoverService;
        private readonly IReviewService _reviewService;
        private readonly ILogger<GamesController> _logger;

        public GamesController(
            IGameService gameService,
            IDiscoverService discoverService,
            IReviewService reviewService,
            ILogger<GamesController> logger)
        {
            _gameService = gameService;
            _discoverService = discoverService;
            _reviewService = reviewService;
            _logger = logger;
        }

        /// <summary>
        /// DB-merkezli discover feed. RAWG live API kullanmaz.
        /// Filtresiz modda kalite skoru + haftalık rotasyon; filtreli modda deterministik sıralama.
        /// </summary>
        [HttpGet("discover")]
        public async Task<IActionResult> DiscoverGames([FromQuery] DiscoverQueryParams queryParams)
        {
            int? userId = null;
            if (User.Identity?.IsAuthenticated == true)
            {
                var claim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (claim != null && int.TryParse(claim.Value, out int parsedId))
                    userId = parsedId;
            }

            var result = await _discoverService.DiscoverAsync(queryParams, userId);
            return Ok(result);
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

        /// <summary>
        /// Oyun aciklamasini Turkce'ye cevirir (Gemini). Cevrilmis aciklama zaten
        /// GET /api/games/{slug} yanitinda herkese donuyor; bu uc yalnizca HENUZ cevrilmemis bir
        /// oyun icin YENI ceviri tetiklemek istendiginde gerekli ve her cagrisi para harciyor.
        /// Bu yuzden kimlik + kullanici basina saatlik limit istiyor. Toplu ceviriyi zaten
        /// GGHub.Worker'daki DescriptionTranslationJob yapiyor.
        /// </summary>
        [HttpPost("{id}/translate")]
        [Authorize]
        [EnableRateLimiting("TranslatePolicy")]
        public async Task<IActionResult> TranslateGameDescription(int id)
        {
            try
            {
                var translatedText = await _gameService.TranslateGameDescriptionAsync(id);
                return Ok(new { descriptionTr = translatedText });
            }
            catch (Exception ex) when (
                ex is GeminiBudgetExceededException ||
                ex is GeminiQuotaExceededException ||
                ex is GeminiTranslationFailedException)
            {
                // Uc kok sebep de kullanici acisindan ayni: ceviri simdi yapilamiyor.
                // Ham 429'u, butce rakamini veya saglayici adini disari sizdirmiyoruz; kullaniciyi
                // ilgilendirmez ve altyapi hakkinda bilgi verir. 503 doguru kod: gecici durum.
                // ONEMLI: burasi eskiden Ingilizce metni 200 ile donduruyordu ve UI "Ceviri
                // tamamlandi" deyip hicbir seyi degistirmiyordu; sessiz yalan yerine durust hata.
                _logger.LogWarning(ex, "[Games] Ceviri basarisiz (gameId={GameId})", id);

                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "Çeviri servisi şu anda yoğun. Lütfen daha sonra tekrar deneyin."
                });
            }
        }

        [HttpGet("{id}/suggested")]
        public async Task<IActionResult> GetSimilarGames(int id)
        {
            try
            {
                var result = await _gameService.GetSimilarGamesAsync(id);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    Error = ex.Message,
                    InnerError = ex.InnerException?.Message,
                    StackTrace = ex.StackTrace?.Substring(0, Math.Min(500, ex.StackTrace?.Length ?? 0))
                });
            }
        }
    }
}