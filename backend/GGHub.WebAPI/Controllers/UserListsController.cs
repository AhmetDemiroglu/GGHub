using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace GGHub.WebAPI.Controllers
{
    [Route("api/user-lists")]
    [ApiController]
    [Authorize]
    public class UserListsController : ControllerBase
    {
        private readonly IUserListService _userListService;
        private readonly INotificationService _notificationService;
        private readonly IGameService _gameService;
        private readonly ISocialService _socialService;
        private readonly IProfileService _profileService;
        public UserListsController(IUserListService userListService, INotificationService notificationService, IGameService gameService, ISocialService socialService, IProfileService profileService)
        {
            _userListService = userListService;
            _notificationService = notificationService;
            _gameService = gameService;
            _socialService = socialService;
            _profileService = profileService;
        }

        [HttpPost("/api/user-lists")]
        public async Task<IActionResult> CreateList(UserListForCreationDto listDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            try
            {
                var createdList = await _userListService.CreateListAsync(listDto, userId);
                return StatusCode(201, createdList);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
        [HttpPost("/api/user-lists/{listId}/games")]
        public async Task<IActionResult> AddGameToList(int listId, AddGameToListDto addGameDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            try
            {
                await _userListService.AddGameToListAsync(listId, addGameDto.GameId, userId);
                return Ok();
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
        [HttpGet("/api/user-lists")]
        public async Task<IActionResult> GetMyLists()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var lists = await _userListService.GetListsForUserAsync(userId);
            return Ok(lists);
        }
        [HttpGet("{listId}/my-detail")]
        public async Task<IActionResult> GetMyListDetail(int listId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var list = await _userListService.GetMyListDetailAsync(listId, userId);

            if (list == null)
            {
                return NotFound("Liste bulunamadı veya bu listeyi görme yetkiniz yok.");
            }

            return Ok(list);
        }

        [HttpGet("{listId}")]
        public async Task<IActionResult> GetListDetail(int listId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            try
            {
                var listDetail = await _userListService.GetListDetailAsync(listId, userId);
                return Ok(listDetail);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
        }

        [HttpGet("public")]
        public async Task<IActionResult> GetPublicLists([FromQuery] ListQueryParams query)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _userListService.GetPublicListsAsync(query, currentUserId);
            return Ok(result);
        }

        [HttpGet("followed-by/{username}")]
        public async Task<IActionResult> GetFollowedLists(string username, [FromQuery] ListQueryParams queryParams)
        {
            var targetUserProfile = await _profileService.GetProfileByUsernameAsync(username);
            if (targetUserProfile == null)
            {
                return NotFound("Kullanıcı bulunamadı.");
            }
            int targetUserId = targetUserProfile.Id;

            var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (currentUserIdClaim == null)
            {
                return Unauthorized();
            }
            int currentUserId = int.Parse(currentUserIdClaim.Value);

            var result = await _userListService.GetFollowedListsByUserAsync(targetUserId, currentUserId, queryParams);
            return Ok(result);
        }

        [HttpGet("followed-by-me")]
        public async Task<IActionResult> GetMyFollowedLists([FromQuery] ListQueryParams queryParams)
        {
            var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (currentUserIdClaim == null)
            {
                return Unauthorized();
            }
            int currentUserId = int.Parse(currentUserIdClaim.Value);

            var result = await _userListService.GetFollowedListsByUserAsync(currentUserId, currentUserId, queryParams);
            return Ok(result);
        }

        [HttpDelete("{listId}/games/{gameId}")]
        public async Task<IActionResult> RemoveGameFromList(int listId, int gameId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var success = await _userListService.RemoveGameFromListAsync(listId, gameId, userId);

            if (!success)
            {
                return NotFound();
            }

            return NoContent();
        }
        [HttpPost("{listId}/follow")]
        public async Task<IActionResult> FollowList(int listId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var success = await _socialService.FollowListAsync(userId, listId);
            return success ? Ok() : BadRequest("Geçersiz işlem.");
        }

        [HttpDelete("{listId}/follow")]
        public async Task<IActionResult> UnfollowList(int listId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var success = await _socialService.UnfollowListAsync(userId, listId);
            return success ? NoContent() : BadRequest("Geçersiz işlem.");

        }
        [HttpPut("{listId}")]
        public async Task<IActionResult> UpdateList(int listId, [FromBody] UserListForUpdateDto listDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            try
            {
                var success = await _userListService.UpdateListAsync(listId, listDto, userId);
                if (success)
                {
                    return NoContent();
                }
                return BadRequest("Liste güncellenemedi.");
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

        [HttpDelete("{listId}")]
        public async Task<IActionResult> DeleteList(int listId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            try
            {
                var success = await _userListService.DeleteListAsync(listId, userId);
                if (success)
                {
                    return NoContent();
                }
                return BadRequest("Liste silinemedi.");
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
        }
    }

}