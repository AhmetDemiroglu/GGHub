using GGHub.Application.Dtos;
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

        /// <summary>
        /// Akis. IKI parametre destekleniyor ve bu BILEREK boyle:
        ///
        ///   ?tab=posts|reviews|discover  -> yeni istemciler (3 sekme)
        ///   ?type=0|1|2                  -> mağazadaki iOS 1.0.5 / Android 1.0.7
        ///
        /// Eski yol kaldirilamaz: yayindaki surumler onu cagiriyor. Ayrica eski
        /// yol Post/Repost tipli kart URETMIYOR, dolayisiyla o surumler
        /// bilmedikleri bir tiple karsilasip bos kart cizmiyor.
        ///
        /// Ikisi birden gelirse tab kazanir (yeni istemci, bilincli secim).
        /// </summary>
        [HttpGet("feed")]
        [Authorize]
        public async Task<IActionResult> GetPersonalizedFeed(
            [FromQuery] int limit = 10,
            [FromQuery] DateTime? cursor = null,
            [FromQuery] ActivityType? type = null,
            [FromQuery] string? tab = null)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            if (!string.IsNullOrWhiteSpace(tab))
            {
                var resolved = tab.ToLowerInvariant() switch
                {
                    "reviews" => FeedTab.Reviews,
                    "discover" => FeedTab.Discover,
                    _ => FeedTab.Posts
                };

                return Ok(await _activityService.GetFeedAsync(userId, resolved, limit, cursor));
            }

            var feed = await _activityService.GetPersonalizedFeedAsync(userId, limit, cursor, type);
            return Ok(feed);
        }
    }
}
