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
        private readonly INotificationPreferenceService _preferenceService;

        public NotificationsController(
            INotificationService notificationService,
            IPushNotificationService pushNotificationService,
            INotificationPreferenceService preferenceService)
        {
            _notificationService = notificationService;
            _pushNotificationService = pushNotificationService;
            _preferenceService = preferenceService;
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

        /// <summary>
        /// Bildirim ayarlarinin tamami. Yanit her zaman yapilandirilabilir TUM tipleri tasir
        /// (dogum gunu haric); kaydedilmemis tipler acik doner.
        /// </summary>
        [HttpGet("settings")]
        public async Task<IActionResult> GetSettings()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            return Ok(await _preferenceService.GetSettingsAsync(userId));
        }

        /// <summary>
        /// Kismi guncelleme: yalnizca gonderilen alanlar uygulanir, guncel ayarlarin tamami doner.
        /// </summary>
        [HttpPut("settings")]
        public async Task<IActionResult> UpdateSettings(NotificationSettingsForUpdateDto dto)
        {
            if (dto == null) return BadRequest();

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            return Ok(await _preferenceService.UpdateSettingsAsync(userId, dto));
        }

        [HttpPost("register-token")]
        public async Task<IActionResult> RegisterPushToken(PushTokenForRegistrationDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Token))
            {
                return BadRequest();
            }

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            // Locale gonderilmediyse servis istegin Accept-Language'ini kullanir; mobil istemci
            // uygulama ici dili zaten her isteğe ekliyor, yani eski surumler de dogru dili verir.
            await _pushNotificationService.RegisterTokenAsync(userId, dto.Token, dto.Platform ?? "unknown", dto.Locale);
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
