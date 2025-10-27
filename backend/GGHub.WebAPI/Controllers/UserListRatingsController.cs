using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace GGHub.WebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserListRatingsController : ControllerBase
    {
        private readonly IUserListRatingService _ratingService;

        public UserListRatingsController(IUserListRatingService ratingService)
        {
            _ratingService = ratingService;
        }
        [HttpPost("{listId}")]
        public async Task<IActionResult> SubmitRating(int listId, [FromBody] UserListRatingForUpsertDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            try
            {
                await _ratingService.SubmitRatingAsync(listId, userId, dto);
                return Ok(); // Başarılı
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("{listId}/my-rating")]
        public async Task<IActionResult> GetMyRating(int listId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var rating = await _ratingService.GetMyRatingForListAsync(listId, userId);

            if (rating == null)
            {
                return Ok(new { value = (int?)null });
            }

            return Ok(new { value = rating.Value });
        }
    }
}