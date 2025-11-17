using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims; 

namespace GGHub.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] 
    public class ReportController : ControllerBase
    {
        private readonly IReportService _reportService;

        public ReportController(IReportService reportService)
        {
            _reportService = reportService;
        }
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                throw new UnauthorizedAccessException("Kullanıcı kimliği bulunamadı.");
            }
            return userId;
        }
        [HttpPost("review/{reviewId}")]
        public async Task<IActionResult> ReportReview(int reviewId, ReportForCreationDto reportDto)
        {
            try
            {
                var userId = GetCurrentUserId();
                await _reportService.ReportReviewAsync(reviewId, userId, reportDto);
                return Ok(new { message = "İnceleme başarıyla raporlandı." });
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("user/{reportedUserId}")]
        public async Task<IActionResult> ReportUser(int reportedUserId, ReportForCreationDto reportDto)
        {
            try
            {
                var userId = GetCurrentUserId();
                await _reportService.ReportUserAsync(reportedUserId, userId, reportDto);
                return Ok(new { message = "Kullanıcı başarıyla raporlandı." });
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("list/{listId}")]
        public async Task<IActionResult> ReportList(int listId, ReportForCreationDto reportDto)
        {
            try
            {
                var userId = GetCurrentUserId();
                await _reportService.ReportListAsync(listId, userId, reportDto);
                return Ok(new { message = "Liste başarıyla raporlandı." });
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("comment/{commentId}")]
        public async Task<IActionResult> ReportComment(int commentId, ReportForCreationDto reportDto)
        {
            try
            {
                var userId = GetCurrentUserId();
                await _reportService.ReportCommentAsync(commentId, userId, reportDto);
                return Ok(new { message = "Yorum başarıyla raporlandı." });
            }
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpGet("my-reports")]
        public async Task<IActionResult> GetMyReports()
        {
            var userId = GetCurrentUserId();
            var reports = await _reportService.GetMyReportsAsync(userId);
            return Ok(reports);
        }
    }
}