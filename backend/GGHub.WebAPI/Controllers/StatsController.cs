using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace GGHub.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StatsController : ControllerBase
    {
        private readonly IStatsService _statsService;

        public StatsController(IStatsService statsService)
        {
            _statsService = statsService;
        }

        [HttpGet("user/{username}")]
        public async Task<IActionResult> GetUserStats(string username)
        {
            var stats = await _statsService.GetUserStatsAsync(username);
            return Ok(stats);
        }
    }
}