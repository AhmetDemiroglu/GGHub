using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;
using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GGHub.WebAPI.Controllers
{
    /// <summary>
    /// Admin paneli hata kayitlari (/errors): sunucuda olusan hatalarin gruplu listesi,
    /// tek bir hatanin ayrintisi ve durum yonetimi (cozuldu / yok say / yeniden ac).
    /// </summary>
    [ApiController]
    [Route("api/admin/errors")]
    [Authorize(Roles = "Admin")]
    public class ErrorLogsController : ControllerBase
    {
        private readonly IErrorLogService _service;

        public ErrorLogsController(IErrorLogService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<PaginatedResult<ErrorGroupDto>>> GetGroups([FromQuery] ErrorLogQueryParams query, CancellationToken ct)
            => Ok(await _service.GetGroupsAsync(query, ct));

        [HttpGet("summary")]
        public async Task<ActionResult<ErrorLogSummaryDto>> GetSummary(CancellationToken ct)
            => Ok(await _service.GetSummaryAsync(ct));

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ErrorGroupDetailDto>> GetGroup(int id, CancellationToken ct)
        {
            var group = await _service.GetGroupAsync(id, ct);
            return group is null ? NotFound() : Ok(group);
        }

        [HttpPut("{id:int}/status")]
        public async Task<ActionResult<ErrorGroupDto>> UpdateStatus(int id, ErrorGroupStatusUpdateDto dto, CancellationToken ct)
        {
            try
            {
                var group = await _service.UpdateStatusAsync(id, dto, ct);
                return group is null ? NotFound() : Ok(group);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
