using Microsoft.AspNetCore.Mvc;
using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace GGHub.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewsController : ControllerBase
    {
        private readonly IReviewService _reviewService;
        private readonly IReportService _reportService;

        public ReviewsController(IReviewService reviewService, IReportService reportService) 
        {
            _reviewService = reviewService;
            _reportService = reportService;
        }

        [HttpPost("/api/reviews")]
        [Authorize]
        public async Task<IActionResult> CreateReview(ReviewForCreationDto reviewDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            try
            {
                var createdReview = await _reviewService.CreateReviewAsync(reviewDto, userId);
                return StatusCode(201, createdReview); 
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
        [HttpGet("/api/games/{gameId}/reviews")]
        public async Task<IActionResult> GetReviewsForGame(int gameId)
        {
            var reviews = await _reviewService.GetReviewsForGameAsync(gameId);
            return Ok(reviews);
        }
        [HttpDelete("/api/reviews/{reviewId}")]
        [Authorize] 
        public async Task<IActionResult> DeleteReview(int reviewId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var success = await _reviewService.DeleteReviewAsync(reviewId, userId);

            if (!success)
            {
                return Forbid();
            }

            return NoContent();
        }
        [HttpPut("/api/reviews/{reviewId}")]
        [Authorize]
        public async Task<IActionResult> UpdateReview(int reviewId, ReviewForUpdateDto reviewDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var updatedReview = await _reviewService.UpdateReviewAsync(reviewId, userId, reviewDto);

            if (updatedReview == null)
            {
                return Forbid();
            }

            return Ok(updatedReview);
        }
        [HttpPost("/api/reviews/{reviewId}/vote")]
        [Authorize]
        public async Task<IActionResult> VoteOnReview(int reviewId, ReviewVoteDto voteDto)
        {
            if (voteDto.Value != 1 && voteDto.Value != -1)
            {
                return BadRequest("Oy değeri sadece +1 veya -1 olabilir.");
            }

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            try
            {
                await _reviewService.VoteOnReviewAsync(reviewId, userId, voteDto.Value);
                return Ok(); 
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message); 
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
        [HttpPost("{reviewId}/report")]
        [Authorize]
        public async Task<IActionResult> ReportReview(int reviewId, ReportForCreationDto reportDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            try
            {
                await _reportService.ReportReviewAsync(reviewId, userId, reportDto);
                return Ok(new { message = "Raporunuz başarıyla gönderildi." });
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
        }
    }
}
