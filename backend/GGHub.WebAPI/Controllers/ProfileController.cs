using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace GGHub.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly IProfileService _profileService;
        private readonly GGHubDbContext _context;

        public ProfileController(IProfileService profileService, GGHubDbContext context)
        {
            _profileService = profileService;
            _context = context;
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetMyProfile()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var profile = await _profileService.GetProfileAsync(userId);

            return profile == null ? NotFound() : Ok(profile);
        }

        [HttpPut("me")]
        public async Task<IActionResult> UpdateMyProfile(ProfileForUpdateDto profileDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var updatedProfile = await _profileService.UpdateProfileAsync(userId, profileDto);

            return updatedProfile == null ? NotFound() : Ok(updatedProfile);
        }
        [HttpGet("me/notifications")]
        public async Task<IActionResult> GetMyNotifications()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var notifications = await _context.Notifications
                .Where(n => n.RecipientUserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .Take(20)
                .ToListAsync();

            return Ok(notifications);
        }
        [HttpPut("me/message-setting")]
        public async Task<IActionResult> UpdateMyMessageSetting(UpdateMessageSettingDto settingDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            await _profileService.UpdateMessageSettingAsync(userId, settingDto.NewSetting);
            return NoContent();
        }
        [HttpPut("me/visibility")]
        public async Task<IActionResult> UpdateMyProfileVisibility(UpdateProfileVisibilityDto visibilityDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            await _profileService.UpdateProfileVisibilityAsync(userId, visibilityDto.NewVisibility);
            return NoContent();
        }
        [HttpDelete("me")]
        public async Task<IActionResult> DeleteMyAccount()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            await _profileService.AnonymizeUserAsync(userId);

            return NoContent();
        }
        [HttpGet("me/export-data")]
        public async Task<IActionResult> ExportMyData()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var data = await _profileService.GetUserDataForExportAsync(userId);

            var fileName = $"gghub_data_{userId}_{DateTime.UtcNow:yyyyMMdd}.json";
            var jsonString = JsonSerializer.Serialize(data, new JsonSerializerOptions { WriteIndented = true });
            var bytes = Encoding.UTF8.GetBytes(jsonString);

            return File(bytes, "application/json", fileName);
        }
    }
}