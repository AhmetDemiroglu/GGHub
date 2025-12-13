using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GGHub.WebAPI.Controllers
{
    [Route("api/gamification")]
    [ApiController]
    public class GamificationController : ControllerBase
    {
        private readonly IGamificationService _gamificationService;

        public GamificationController(IGamificationService gamificationService)
        {
            _gamificationService = gamificationService;
        }

        [HttpGet("stats/{userId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetUserStats(int userId)
        {
            var stats = await _gamificationService.GetUserStatsAsync(userId);
            return Ok(stats);
        }
    }
}