using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

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
            int? currentUserId = null;
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out var parsedUserId))
            {
                currentUserId = parsedUserId;
            }

            var stats = await _statsService.GetUserStatsAsync(username, currentUserId);
            return Ok(stats);
        }
    }
}