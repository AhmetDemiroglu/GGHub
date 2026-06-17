using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Localization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace GGHub.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;
        private readonly IPushNotificationService _pushNotificationService;

        public NotificationsController(INotificationService notificationService, IPushNotificationService pushNotificationService)
        {
            _notificationService = notificationService;
            _pushNotificationService = pushNotificationService;
        }

        [HttpGet]
        public async Task<IActionResult> GetNotifications()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var notifications = await _notificationService.GetUserNotificationsAsync(userId);
            return Ok(notifications);
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var count = await _notificationService.GetUnreadCountAsync(userId);
            return Ok(new { count });
        }

        [HttpPut("{id}/mark-read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var success = await _notificationService.MarkAsReadAsync(id, userId);

            if (!success)
            {
                return NotFound(AppText.Get("notifications.notificationNotFound"));
            }

            return Ok();
        }

        [HttpPut("mark-all-read")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            await _notificationService.MarkAllAsReadAsync(userId);
            return Ok();
        }

        [HttpPost("register-token")]
        public async Task<IActionResult> RegisterPushToken(PushTokenForRegistrationDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Token))
            {
                return BadRequest();
            }

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            await _pushNotificationService.RegisterTokenAsync(userId, dto.Token, dto.Platform ?? "unknown");
            return Ok();
        }

        [HttpPost("unregister-token")]
        public async Task<IActionResult> UnregisterPushToken(PushTokenForRegistrationDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Token))
            {
                return BadRequest();
            }

            await _pushNotificationService.RemoveTokenAsync(dto.Token);
            return Ok();
        }
    }
}
