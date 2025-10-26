using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;

namespace GGHub.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SearchController : ControllerBase
    {
        private readonly ISearchService _searchService;
        public SearchController(ISearchService searchService) { _searchService = searchService; }

        [HttpGet]
        public async Task<IActionResult> Search([FromQuery] string query)
        {
            if (string.IsNullOrWhiteSpace(query) || query.Length < 3)
                return BadRequest("Arama metni en az 3 karakter olmalıdır.");

            var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier) != null
                ? int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value)
                : (int?)null;

            var results = await _searchService.SearchAsync(query, currentUserId);
            return Ok(results);
        }
        [HttpGet("messageable-users")]
        public async Task<IActionResult> SearchMessageableUsers([FromQuery] string query)
        {
            if (string.IsNullOrWhiteSpace(query) || query.Length < 3)
            {
                return BadRequest("Arama sorgusu en az 3 karakter olmalıdır.");
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                return Unauthorized();
            }

            var userId = int.Parse(userIdClaim.Value);
            var results = await _searchService.SearchMessageableUsersAsync(query, userId);
            return Ok(results);
        }
    }
}