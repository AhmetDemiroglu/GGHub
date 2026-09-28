using GGHub.Application.Dtos;
using GGHub.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GGHub.WebAPI.Controllers
{
    /// <summary>
    /// Admin paneli AI ekrani: bot ayarlari, botlar, Gemini sayaci ve sahte icerik temizligi.
    /// </summary>
    [ApiController]
    [Route("api/admin/ai")]
    [Authorize(Roles = "Admin")]
    public class AiAdminController : ControllerBase
    {
        private readonly AiAdminService _service;

        public AiAdminController(AiAdminService service)
        {
            _service = service;
        }

        [HttpGet("settings")]
        public async Task<ActionResult<AiSettingsDto>> GetSettings(CancellationToken ct)
            => Ok(await _service.GetSettingsAsync(ct));

        [HttpPut("settings")]
        public async Task<ActionResult<AiSettingsDto>> UpdateSettings(AiSettingsDto dto, CancellationToken ct)
        {
            try
            {
                return Ok(await _service.UpdateSettingsAsync(dto, ct));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("agents")]
        public async Task<ActionResult<List<AiAgentAdminDto>>> GetAgents(CancellationToken ct)
            => Ok(await _service.GetAgentsAsync(ct));

        /// <summary>Eksik botlari (AiAgentPersonas) olusturur; var olanlara dokunmaz.</summary>
        [HttpPost("agents/provision")]
        public async Task<IActionResult> Provision(CancellationToken ct)
            => Ok(new { created = await _service.ProvisionAgentsAsync(ct) });

        [HttpPut("agents/{userId:int}")]
        public async Task<IActionResult> UpdateAgent(int userId, AiAgentUpdateDto dto, CancellationToken ct)
        {
            try
            {
                return await _service.UpdateAgentAsync(userId, dto, ct) ? NoContent() : NotFound();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("usage")]
        public async Task<ActionResult<AiUsageReportDto>> GetUsage([FromQuery] int days = 30, CancellationToken ct = default)
            => Ok(await _service.GetUsageAsync(days, ct));

        /// <summary>Sahte hesap temizliginin ONIZLEMESI: hicbir sey silmez, tablo basina sayi doner.</summary>
        [HttpGet("purge-fake/preview")]
        public async Task<ActionResult<AiPurgeReportDto>> PurgePreview(CancellationToken ct)
            => Ok(await _service.PurgeFakeContentAsync(dryRun: true, ct));

        /// <summary>
        /// Sahte hesaplari (@fake.gghub.social, @demo.gghub.social, IsSeeded) ve iliskili TUM icerigi
        /// kalici olarak siler. Geri alinamaz; govdede "SİL" onayi sart.
        /// </summary>
        [HttpPost("purge-fake")]
        public async Task<ActionResult<AiPurgeReportDto>> Purge(AiPurgeRequestDto request, CancellationToken ct)
        {
            var confirmation = (request.Confirmation ?? string.Empty).Trim().ToUpperInvariant();
            if (confirmation != "SİL" && confirmation != "SIL")
            {
                return BadRequest(new { message = "Onay için SİL yazın." });
            }

            // Istek iptali (tarayici zaman asimi, sekme kapanmasi) silmeyi yarida KESMEMELI: islem tek
            // transaction, basladiysa sonuna kadar gitsin. Bu yuzden istek token'i bilerek verilmiyor.
            return Ok(await _service.PurgeFakeContentAsync(dryRun: false, CancellationToken.None));
        }
    }
}
