using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

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
            var activities = await _activityService.GetUserActivityFeedAsync(username);
            return Ok(activities);
        }
    }
}