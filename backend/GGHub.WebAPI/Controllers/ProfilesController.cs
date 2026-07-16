using GGHub.Application.Interfaces;
using GGHub.Core.Specifications;
using GGHub.Infrastructure.Localization;
using GGHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[Route("api/profiles")]
[ApiController]
public class ProfilesController : ControllerBase
{
    private readonly ISocialService _socialService;
    private readonly IProfileService _profileService;
    private readonly IUserSuggestionService _userSuggestionService;
    private readonly GGHubDbContext _context;

    public ProfilesController(ISocialService socialService, IProfileService profileService, IUserSuggestionService userSuggestionService, GGHubDbContext context)
    {
        _socialService = socialService;
        _profileService = profileService;
        _userSuggestionService = userSuggestionService;
        _context = context;
    }

    [HttpGet("suggested")]
    [Authorize]
    public async Task<IActionResult> GetSuggestedUsers([FromQuery] int limit = 10)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var suggestions = await _userSuggestionService.GetSuggestedUsersAsync(userId, limit);
        return Ok(suggestions);
    }

    [HttpGet("{username}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetProfile(string username)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier) != null
            ? int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value)
            : (int?)null;

        var profile = await _profileService.GetProfileByUsernameAsync(username, currentUserId);
        return profile == null ? NotFound() : Ok(profile);
    }

    [HttpPost("{username}/follow")]
    [Authorize]
    public async Task<IActionResult> Follow(string username)
    {
        var followerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var success = await _socialService.FollowUserAsync(followerId, username);
        return success ? Ok() : BadRequest(AppText.Get("profiles.userNotFoundOrInvalidAction"));
    }

    [HttpDelete("{username}/follow")]
    [Authorize]
    public async Task<IActionResult> Unfollow(string username)
    {
        var followerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var success = await _socialService.UnfollowUserAsync(followerId, username);
        return success ? NoContent() : BadRequest(AppText.Get("profiles.userNotFoundOrInvalidAction"));
    }

    [HttpGet("{username}/followers")]
    public async Task<IActionResult> GetFollowers(string username)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier) != null
            ? int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value)
            : (int?)null;

        var followers = await _socialService.GetFollowersAsync(username, currentUserId);
        return Ok(followers);
    }

    [HttpGet("{username}/following")]
    public async Task<IActionResult> GetFollowing(string username)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier) != null
            ? int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value)
            : (int?)null;

        var following = await _socialService.GetFollowingAsync(username, currentUserId);
        return Ok(following);
    }

    [HttpPost("{username}/block")]
    [Authorize]
    public async Task<IActionResult> Block(string username)
    {
        var blockerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var success = await _socialService.BlockUserAsync(blockerId, username);
        return success ? Ok() : BadRequest(AppText.Get("profiles.invalidAction"));
    }

    [HttpDelete("{username}/block")]
    [Authorize]
    public async Task<IActionResult> Unblock(string username)
    {
        var blockerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var success = await _socialService.UnblockUserAsync(blockerId, username);
        return success ? NoContent() : BadRequest(AppText.Get("profiles.invalidAction"));
    }

    [HttpGet("blocked-users")]
    public async Task<IActionResult> GetBlockedUsers()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var blockedUsers = await _socialService.GetBlockedUsersAsync(userId);
        return Ok(blockedUsers);
    }

    [HttpGet("check-block/{username}")]
    public async Task<IActionResult> CheckBlockStatus(string username)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.UsernameNormalized == UsernameNormalizer.Normalize(username) && !u.IsDeleted);
        if (targetUser == null)
        {
            return NotFound(AppText.Get("common.userNotFound"));
        }

        var isBlockedByMe = await _socialService.IsBlockedByMeAsync(userId, targetUser.Id);
        var isBlockingMe = await _socialService.IsBlockingMeAsync(userId, targetUser.Id);

        return Ok(new
        {
            isBlockedByMe,
            isBlockingMe,
        });
    }
}
