using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Localization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace GGHub.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SearchController : ControllerBase
    {
        private readonly ISearchService _searchService;

        public SearchController(ISearchService searchService)
        {
            _searchService = searchService;
        }

        [HttpGet]
        public async Task<IActionResult> Search([FromQuery] string query)
        {
            if (string.IsNullOrWhiteSpace(query) || query.Length < 3)
            {
                return BadRequest(AppText.Get("search.minSearchLength"));
            }

            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier) != null
                ? int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value)
                : (int?)null;

            var results = await _searchService.SearchAsync(query, currentUserId);
            return Ok(results);
        }

        [HttpGet("messageable-users")]
        public async Task<IActionResult> SearchMessageableUsers([FromQuery] string query)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                return Unauthorized();
            }

            // Boş query: takip edilen + mesaj atılabilir kullanıcıları öneri olarak döner.
            // Dolu query: kullanıcı adına göre mesaj atılabilir kullanıcı araması.
            var userId = int.Parse(userIdClaim.Value);
            var results = await _searchService.SearchMessageableUsersAsync(query, userId);
            return Ok(results);
        }

        // @bahis otomatik tamamlama. [Authorize]: gizlilik/engel kapisi bir "current user"
        // olmadan uygulanamaz, anonim cagri profilleri sizdirirdi.
        // Min uzunluk 1; buradaki 3 karakter kurali BILEREK uygulanmiyor.
        [Authorize]
        [HttpGet("mentions")]
        public async Task<IActionResult> SearchMentionableUsers([FromQuery] string q)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                return Unauthorized();
            }

            if (string.IsNullOrWhiteSpace(q))
            {
                return Ok(Array.Empty<UserDto>());
            }

            var userId = int.Parse(userIdClaim.Value);
            var results = await _searchService.SearchMentionableUsersAsync(q, userId);
            return Ok(results);
        }
    }
}
