using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GGHub.WebAPI.Controllers
{
    /// <summary>
    /// Next.js sitemap uretimi icin hafif, herkese acik listeler (yalniz key + lastModified).
    /// Sayfalama zorunlu: tek sitemap dosyasi en fazla 5.000 URL tasir (servis de bunu kirpar).
    /// </summary>
    [Route("api/sitemap")]
    [ApiController]
    [AllowAnonymous]
    [ResponseCache(Duration = 3600, Location = ResponseCacheLocation.Any)]
    public class SitemapController : ControllerBase
    {
        private readonly ISitemapService _sitemapService;

        public SitemapController(ISitemapService sitemapService)
        {
            _sitemapService = sitemapService;
        }

        [HttpGet("games")]
        public async Task<IActionResult> GetGames([FromQuery] int page = 1, [FromQuery] int pageSize = 5000)
        {
            return Ok(await _sitemapService.GetGamesAsync(page, pageSize));
        }

        [HttpGet("lists")]
        public async Task<IActionResult> GetLists([FromQuery] int page = 1, [FromQuery] int pageSize = 5000)
        {
            return Ok(await _sitemapService.GetListsAsync(page, pageSize));
        }

        [HttpGet("profiles")]
        public async Task<IActionResult> GetProfiles([FromQuery] int page = 1, [FromQuery] int pageSize = 5000)
        {
            return Ok(await _sitemapService.GetProfilesAsync(page, pageSize));
        }
    }
}
