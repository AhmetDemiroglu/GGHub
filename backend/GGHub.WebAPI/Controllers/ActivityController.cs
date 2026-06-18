using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace GGHub.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ActivitiesController : ControllerBase
    {
        private readonly IActivityService _activityService;

        public ActivitiesController(IActivityService activityService)
        {
            _activityService = activityService;
        }

        [HttpGet("user/{username}")]
        public async Task<IActionResult> GetUserActivity(string username)
        {
            int? currentUserId = null;
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out var parsedUserId))
            {
                currentUserId = parsedUserId;
            }

            var activities = await _activityService.GetUserActivityFeedAsync(username, currentUserId);
            return Ok(activities);
        }

        [HttpGet("feed")]
        [Authorize]
        public async Task<IActionResult> GetPersonalizedFeed([FromQuery] int limit = 10)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var feed = await _activityService.GetPersonalizedFeedAsync(userId, limit);
            return Ok(feed);
        }
    }
}
