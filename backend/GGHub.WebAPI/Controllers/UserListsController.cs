using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace GGHub.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UserListsController : ControllerBase
    {
        private readonly IUserListService _userListService;
        private readonly INotificationService _notificationService;
        private readonly IGameService _gameService;
        private readonly ISocialService _socialService;

        public UserListsController(IUserListService userListService, INotificationService notificationService, IGameService gameService, ISocialService socialService)
        {
            _userListService = userListService;
            _notificationService = notificationService;
            _gameService = gameService;
            _socialService = socialService;
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
        [HttpGet("{listId}")]
        public async Task<IActionResult> GetListById(int listId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var list = await _userListService.GetListByIdAsync(listId, userId);

            if (list == null)
            {
                return NotFound("Liste bulunamadı veya bu listeyi görme yetkiniz yok.");
            }

            return Ok(list);
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
        [Authorize]
        public async Task<IActionResult> FollowList(int listId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var success = await _socialService.FollowListAsync(userId, listId);
            return success ? Ok() : BadRequest("Geçersiz işlem.");
        }

        [HttpDelete("{listId}/follow")]
        [Authorize]
        public async Task<IActionResult> UnfollowList(int listId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var success = await _socialService.UnfollowListAsync(userId, listId);
            return success ? NoContent() : BadRequest("Geçersiz işlem.");
        }
    }

}