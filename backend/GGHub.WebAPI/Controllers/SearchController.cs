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
    }
}