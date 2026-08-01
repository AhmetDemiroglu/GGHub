using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

namespace GGHub.WebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PostsController : ControllerBase
    {
        private readonly IPostService _postService;

        public PostsController(IPostService postService)
        {
            _postService = postService;
        }

        [HttpPost]
        [EnableRateLimiting("PostCreatePolicy")]
        public async Task<IActionResult> Create([FromBody] PostForCreationDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            try
            {
                var post = await _postService.CreateAsync(userId, dto);
                return CreatedAtAction(nameof(GetById), new { postId = post.Id }, post);
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (UnauthorizedAccessException ex)
            {
                // Forbid(string) kimlik dogrulama SEMASI bekler, mesaj degil.
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
        }

        [HttpDelete("{postId}")]
        public async Task<IActionResult> Delete(int postId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var isAdmin = User.IsInRole("Admin");
            try
            {
                await _postService.DeleteAsync(postId, userId, isAdmin);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
            }
        }

        [HttpGet("{postId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int postId)
        {
            try
            {
                var post = await _postService.GetByIdAsync(postId, ResolveOptionalUserId());
                return Ok(post);
            }
            // Erisimi olmayan icin de NotFound donuyor (servis oyle firlatiyor):
            // 403 gonderinin VAR OLDUGUNU sizdirirdi.
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
        }

        [HttpGet("{postId}/replies")]
        [AllowAnonymous]
        public async Task<IActionResult> GetReplies(int postId, [FromQuery] ListQueryParams query)
        {
            try
            {
                var replies = await _postService.GetRepliesAsync(postId, ResolveOptionalUserId(), query);
                return Ok(replies);
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
        }

        [HttpGet("user/{username}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetUserPosts(
            string username,
            [FromQuery] int limit = 20,
            [FromQuery] DateTime? cursor = null)
        {
            var posts = await _postService.GetUserPostsAsync(username, ResolveOptionalUserId(), limit, cursor);
            return Ok(posts);
        }

        [HttpPost("{postId}/like")]
        public Task<IActionResult> Like(int postId) => SetLike(postId, true);

        [HttpDelete("{postId}/like")]
        public Task<IActionResult> Unlike(int postId) => SetLike(postId, false);

        [HttpPost("{postId}/repost")]
        public Task<IActionResult> Repost(int postId) => SetRepost(postId, true);

        [HttpDelete("{postId}/repost")]
        public Task<IActionResult> Unrepost(int postId) => SetRepost(postId, false);

        [HttpPost("{postId}/poll/vote")]
        public async Task<IActionResult> VotePoll(int postId, [FromBody] PostPollVoteDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            try
            {
                var poll = await _postService.VotePollAsync(postId, userId, dto.OptionId);
                return Ok(poll);
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
        }

        private async Task<IActionResult> SetLike(int postId, bool liked)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            try
            {
                return Ok(await _postService.SetLikeAsync(postId, userId, liked));
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
        }

        private async Task<IActionResult> SetRepost(int postId, bool reposted)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            try
            {
                return Ok(await _postService.SetRepostAsync(postId, userId, reposted));
            }
            catch (KeyNotFoundException ex) { return NotFound(ex.Message); }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
        }

        /// <summary>
        /// Anonim erisime acik uclarda kullanici kimligi. TryParse ile: bozuk
        /// claim'de int.Parse patlar ve anonim istegi 500'e cevirirdi.
        /// </summary>
        private int? ResolveOptionalUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (claim != null && int.TryParse(claim.Value, out var parsed)) return parsed;
            return null;
        }
    }
}
