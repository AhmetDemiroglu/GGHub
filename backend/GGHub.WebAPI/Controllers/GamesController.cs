using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using GGHub.Application.Dtos;

namespace GGHub.WebAPI.Controllers
{
    [Route("api/games")]
    [ApiController]
    public class GamesController : ControllerBase
    {
        private readonly IGameService _gameService;
        public GamesController(IGameService gameService)
        {
            _gameService = gameService;
        }
        [HttpGet]
        public async Task<IActionResult> GetGames([FromQuery] GameQueryParams queryParams)
        {
            var games = await _gameService.GetGamesAsync(queryParams);
            return Ok(games);
        }
        [HttpGet("{idOrSlug}")]
        public async Task<IActionResult> GetGameById(string idOrSlug)
        {
            var game = await _gameService.GetGameBySlugOrIdAsync(idOrSlug);
            if (game == null) return NotFound();
            return Ok(game);
        }
        [HttpGet("test-auth")] 
        [Authorize]
        public IActionResult TestAuth()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var username = User.FindFirst(ClaimTypes.Name)?.Value;

            return Ok($"Başarıyla giriş yaptın! Kullanıcı ID: {userId}, Kullanıcı Adı: {username}");
        }
    }
}