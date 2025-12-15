using GGHub.Application.Dtos;
using GGHub.Application.Dtos.Admin;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
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
        private readonly IMetacriticService _metacriticService;
        private readonly ILogger<AdminController> _logger;
        private readonly GGHubDbContext _context;
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
        public async Task<IActionResult> GetReports([FromQuery] ReportFilterParams filterParams)
        {
            var result = await _adminService.GetContentReportsAsync(filterParams);
            return Ok(result);
        }
        [HttpPost("reports/{reportId}/respond")]
        public async Task<IActionResult> RespondToReport(int reportId, [FromBody] ReportResponseDto dto)
        {
            var adminId = GetCurrentUserId();
            var success = await _adminService.AddReportResponseAsync(reportId, dto.Response, adminId);

            if (!success)
            {
                return NotFound(new { message = "Rapor bulunamadı." });
            }

            return Ok(new { message = "Yanıt kaydedildi ve rapor kapatıldı." });
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
        [HttpGet("reports/{id}")]
        public async Task<IActionResult> GetReportDetail(int id)
        {
            var report = await _adminService.GetReportDetailAsync(id);
            if (report == null) return NotFound();
            return Ok(report);
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

        [HttpPost("sync-metacritic/{gameId}")]
        public async Task<IActionResult> SyncMetacritic(int gameId)
        {
            var game = await _context.Games.FirstOrDefaultAsync(g => g.Id == gameId);

            if (game == null)
            {
                return NotFound(new { message = "Oyun bulunamadı" });
            }

            var result = await _metacriticService.GetMetacriticScoreAsync(game.Name, game.Released);

            if (result == null)
            {
                return Ok(new
                {
                    success = false,
                    message = $"'{game.Name}' için Metacritic puanı bulunamadı"
                });
            }

            game.Metacritic = result.Score;
            game.MetacriticUrl = result.Url;
            await _context.SaveChangesAsync();

            _logger.LogInformation("[Admin] Metacritic synced for '{GameName}': {Score}", game.Name, result.Score);

            return Ok(new
            {
                success = true,
                message = $"'{game.Name}' için Metacritic puanı güncellendi",
                score = result.Score,
                url = result.Url
            });
        }

        [HttpGet("sync-logs")]
        public IActionResult GetSyncLogs()
        {
            var logPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "metacritic_sync.txt");

            if (!System.IO.File.Exists(logPath))
            {
                return Ok("Henüz bir log dosyası oluşmadı.");
            }

            var lines = System.IO.File.ReadAllLines(logPath);
            var lastLines = lines.TakeLast(200).Reverse();

            return Ok(lastLines);
        }

        [AllowAnonymous]
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