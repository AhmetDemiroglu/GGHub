using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace GGHub.WebAPI.Controllers
{
    [Route("api/home")]
    [ApiController]
    public class HomeController : ControllerBase
    {
        private readonly IHomeService _homeService;

        public HomeController(IHomeService homeService)
        {
            _homeService = homeService;
        }

        [HttpGet("content")]
        [AllowAnonymous]
        public async Task<IActionResult> GetHomeContent()
        {
            int? userId = User.Identity?.IsAuthenticated == true
                ? int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0")
                : null;

            var requestedLanguage = Request.Headers.AcceptLanguage.ToString();
            var preferTurkish = requestedLanguage.StartsWith("tr", StringComparison.OrdinalIgnoreCase);

            var content = await _homeService.GetHomeContentAsync(userId, preferTurkish);
            return Ok(content);
        }
    }
}
