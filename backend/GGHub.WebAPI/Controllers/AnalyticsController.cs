using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GGHub.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous]
    public class AnalyticsController : ControllerBase
    {
        private readonly IAnalyticsService _analyticsService;
        public AnalyticsController(IAnalyticsService analyticsService)
        {
            _analyticsService = analyticsService;
        }

        [HttpGet("top-users")]
        public async Task<IActionResult> GetTopUsers(int count = 5)
        {
            var users = await _analyticsService.GetMostFollowedUsersAsync(count > 10 ? 10 : count);
            return Ok(users);
        }

        [HttpGet("top-lists")]
        public async Task<IActionResult> GetTopLists(int count = 5)
        {
            var lists = await _analyticsService.GetMostPopularListsAsync(count > 10 ? 10 : count);
            return Ok(lists);
        }

        [HttpGet("top-games")]
        public async Task<IActionResult> GetTopRatedGames(int count = 5)
        {
            var games = await _analyticsService.GetHighestRatedGamesAsync(count > 10 ? 10 : count);
            return Ok(games);
        }
    }
}