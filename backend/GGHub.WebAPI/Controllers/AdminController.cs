using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

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
        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var stats = await _adminService.GetDashboardStatisticsAsync();
            return Ok(stats);
        }
        [HttpGet("recent-users")]
        public async Task<IActionResult> GetRecentUsers(int count = 5)
        {
            var users = await _adminService.GetRecentUsersAsync(count > 10 ? 10 : count); 
            return Ok(users);
        }

        [HttpGet("recent-reviews")]
        public async Task<IActionResult> GetRecentReviews(int count = 5)
        {
            var reviews = await _adminService.GetRecentReviewsAsync(count > 10 ? 10 : count);
            return Ok(reviews);
        }
        [HttpGet("users")]
        public async Task<IActionResult> GetUsers([FromQuery] UserFilterParams filterParams)
        {
            var result = await _adminService.GetUsersAsync(filterParams);
            return Ok(result);
        }

        [HttpGet("users/{userId}")]
        public async Task<IActionResult> GetUserDetails(int userId)
        {
            var user = await _adminService.GetUserDetailsAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "Kullanıcı bulunamadı." });
            }
            return Ok(user);
        }

        [HttpPost("users/{userId}/ban")]
        public async Task<IActionResult> BanUser(int userId, [FromBody] BanUserRequestDto dto)
        {
            try
            {
                var adminUserId = GetCurrentUserId();
                var success = await _adminService.BanUserAsync(userId, dto, adminUserId);

                if (!success)
                {
                    return NotFound(new { message = "Kullanıcı bulunamadı." });
                }
                return Ok(new { message = "Kullanıcı başarıyla askıya alındı." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("users/{userId}/unban")]
        public async Task<IActionResult> UnbanUser(int userId)
        {
            var adminUserId = GetCurrentUserId();
            var success = await _adminService.UnbanUserAsync(userId, adminUserId);

            if (!success)
            {
                return NotFound(new { message = "Kullanıcı bulunamadı veya zaten banlı değil." });
            }
            return Ok(new { message = "Kullanıcı yasağı başarıyla kaldırıldı." });
        }

        [HttpPut("users/{userId}/role")]
        public async Task<IActionResult> ChangeUserRole(int userId, [FromBody] ChangeRoleRequestDto dto)
        {
            try
            {
                var adminUserId = GetCurrentUserId();
                var success = await _adminService.ChangeUserRoleAsync(userId, dto, adminUserId);

                if (!success)
                {
                    return NotFound(new { message = "Kullanıcı bulunamadı." });
                }
                return Ok(new { message = "Kullanıcı rolü başarıyla güncellendi." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("users/{userId}/lists")]
        public async Task<IActionResult> GetListsForUser(int userId)
        {
            var lists = await _adminService.GetListsForUserAsync(userId);
            return Ok(lists);
        }

        [HttpGet("users/{userId}/reviews")]
        public async Task<IActionResult> GetReviewsForUser(int userId)
        {
            var reviews = await _adminService.GetReviewsForUserAsync(userId);
            return Ok(reviews);
        }

        [HttpGet("users/{userId}/comments")]
        public async Task<IActionResult> GetCommentsForUser(int userId)
        {
            var comments = await _adminService.GetCommentsForUserAsync(userId);
            return Ok(comments);
        }

        [HttpGet("users/{userId}/reports-made")]
        public async Task<IActionResult> GetReportsMadeByUser(int userId)
        {
            var reports = await _adminService.GetReportsMadeByUserAsync(userId);
            return Ok(reports);
        }
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);

            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                throw new UnauthorizedAccessException("Yetkili kullanıcı kimliği token'da bulunamadı.");
            }
            return userId;
        }
    }

}