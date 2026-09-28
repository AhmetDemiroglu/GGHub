using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GGHub.WebAPI.Controllers
{
    /// <summary>Admin paneli "Mobil Sürüm" ekrani: minimum/onerilen surumler ve bakim modu.</summary>
    [ApiController]
    [Route("api/admin/app-release")]
    [Authorize(Roles = "Admin")]
    public class AppReleaseAdminController : ControllerBase
    {
        private readonly IAppReleaseService _service;

        public AppReleaseAdminController(IAppReleaseService service)
        {
            _service = service;
        }

        [HttpGet("policy")]
        public async Task<ActionResult<AppReleasePolicyDto>> GetPolicy(CancellationToken ct)
            => Ok(await _service.GetPolicyAsync(ct));

        [HttpPut("policy")]
        public async Task<ActionResult<AppReleasePolicyDto>> UpdatePolicy(AppReleasePolicyDto dto, CancellationToken ct)
        {
            try
            {
                return Ok(await _service.UpdatePolicyAsync(dto, ct));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
