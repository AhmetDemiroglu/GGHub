using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GGHub.WebAPI.Controllers
{
    /// <summary>
    /// Mobil uygulamanin acilista sordugu surum/bakim karari. Kimlik gerektirmez: bakim ekrani ve
    /// zorunlu guncelleme, oturum acmamis kullanicilar icin de calismali.
    /// </summary>
    [ApiController]
    [Route("api/app-release")]
    [AllowAnonymous]
    public class AppReleaseController : ControllerBase
    {
        private readonly IAppReleaseService _service;

        public AppReleaseController(IAppReleaseService service)
        {
            _service = service;
        }

        /// <param name="platform">ios | android</param>
        /// <param name="version">Uygulama surumu, ornek 1.3.0</param>
        [HttpGet("check")]
        [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
        public async Task<ActionResult<AppReleaseCheckDto>> Check(
            [FromQuery] string platform, [FromQuery] string version, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(platform) || string.IsNullOrWhiteSpace(version))
                return BadRequest(new { message = "platform ve version zorunlu." });

            return Ok(await _service.EvaluateAsync(platform, version, ct));
        }
    }
}
