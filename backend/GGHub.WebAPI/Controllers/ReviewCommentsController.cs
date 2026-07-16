using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Localization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace GGHub.WebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReviewCommentsController : ControllerBase
    {
        private readonly IReviewCommentService _commentService;

        public ReviewCommentsController(IReviewCommentService commentService)
        {
            _commentService = commentService;
        }

        [HttpPost("review/{reviewId}")]
        public async Task<IActionResult> CreateComment(int reviewId, [FromBody] ReviewCommentForCreationDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            try
            {
                var commentDto = await _commentService.CreateCommentAsync(reviewId, userId, dto);
                return CreatedAtAction(nameof(GetCommentById), new { commentId = commentDto.Id }, commentDto);
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
        }

        [HttpGet("review/{reviewId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetComments(int reviewId, [FromQuery] ListQueryParams query)
        {
            int? currentUserId = null;
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null)
            {
                currentUserId = int.Parse(userIdClaim.Value);
            }

            try
            {
                var comments = await _commentService.GetCommentsForReviewAsync(reviewId, currentUserId, query);
                return Ok(comments);
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (UnauthorizedAccessException ex)
            {
                if (currentUserId == null)
                {
                    return Unauthorized(new { message = ex.Message });
                }

                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
        }

        [HttpGet("{commentId}")]
        public async Task<IActionResult> GetCommentById(int commentId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            try
            {
                var comment = await _commentService.GetCommentByIdAsync(commentId, userId);
                return Ok(comment);
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (UnauthorizedAccessException ex)
            {
                // Forbid(string) kimlik dogrulama SEMASI bekler, mesaj degil; sema yoksa
                // calisma aninda patlar. Bu yuzden acikca 403 + mesaj donuluyor.
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
        }

        [HttpPut("{commentId}")]
        public async Task<IActionResult> UpdateComment(int commentId, [FromBody] ReviewCommentForUpdateDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            try
            {
                var success = await _commentService.UpdateCommentAsync(commentId, userId, dto);
                if (success)
                {
                    return NoContent();
                }

                return BadRequest(AppText.Get("reviewComments.updateFailed"));
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
        }

        [HttpDelete("{commentId}")]
        public async Task<IActionResult> DeleteComment(int commentId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            try
            {
                var success = await _commentService.DeleteCommentAsync(commentId, userId);
                if (success)
                {
                    return NoContent();
                }

                return BadRequest(AppText.Get("reviewComments.deleteFailed"));
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
        }

        [HttpPost("{commentId}/vote")]
        public async Task<IActionResult> VoteOnComment(int commentId, [FromBody] ReviewCommentVoteDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            try
            {
                var success = await _commentService.VoteOnCommentAsync(commentId, userId, dto);
                if (success)
                {
                    return Ok();
                }

                return BadRequest(AppText.Get("reviewComments.voteFailed"));
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
        }
    }
}
