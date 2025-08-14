using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[Route("api/profiles")]
[ApiController]
public class ProfilesController : ControllerBase
{
    private readonly ISocialService _socialService;
    private readonly IProfileService _profileService;
    public ProfilesController(ISocialService socialService, IProfileService profileService)
    {
        _socialService = socialService;
        _profileService = profileService;
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
        return success ? Ok() : BadRequest("Kullanıcı bulunamadı veya geçersiz işlem.");
    }

    [HttpDelete("{username}/follow")]
    [Authorize]
    public async Task<IActionResult> Unfollow(string username)
    {
        var followerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var success = await _socialService.UnfollowUserAsync(followerId, username);
        return success ? NoContent() : BadRequest("Kullanıcı bulunamadı veya geçersiz işlem.");
    }
    [HttpGet("{username}/followers")]
    public async Task<IActionResult> GetFollowers(string username)
    {
        var followers = await _socialService.GetFollowersAsync(username);
        return Ok(followers);
    }

    [HttpGet("{username}/following")]
    public async Task<IActionResult> GetFollowing(string username)
    {
        var following = await _socialService.GetFollowingAsync(username);
        return Ok(following);
    }
    [HttpPost("{username}/block")]
    [Authorize]
    public async Task<IActionResult> Block(string username)
    {
        var blockerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var success = await _socialService.BlockUserAsync(blockerId, username);
        return success ? Ok() : BadRequest("Geçersiz işlem.");
    }

    [HttpDelete("{username}/block")]
    [Authorize]
    public async Task<IActionResult> Unblock(string username)
    {
        var blockerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var success = await _socialService.UnblockUserAsync(blockerId, username);
        return success ? NoContent() : BadRequest("Geçersiz işlem.");
    }
}