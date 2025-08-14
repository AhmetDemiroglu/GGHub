using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GGHub.Application.Dtos;

namespace GGHub.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService; 

        public AdminController(IAdminService adminService) 
        {
            _adminService = adminService; 
        }
        [HttpGet("test")]
        [ApiExplorerSettings(IgnoreApi = true)]
        public IActionResult AdminOnlyTest()
        {
            return Ok("Tebrikler, bu mesajı sadece adminler görebilir!");
        }
        [HttpGet("reports")]
        public async Task<IActionResult> GetReports()
        {
            var reports = await _adminService.GetContentReportsAsync();
            return Ok(reports);
        }
        [HttpPut("reports/{reportId}/status")]
        public async Task<IActionResult> UpdateReportStatus(int reportId, UpdateReportStatusDto statusDto)
        {
            var success = await _adminService.UpdateReportStatusAsync(reportId, statusDto.NewStatus);

            if (!success)
            {
                return NotFound(new { message = "Rapor bulunamadı." });
            }

            return Ok(new { message = "Rapor durumu başarıyla güncellendi." });
        }
    }
}