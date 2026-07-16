using System.Text.Json;
using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Core.Specifications;
using GGHub.Infrastructure.Localization;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Services
{
    public class NotificationService : INotificationService
    {
        private readonly GGHubDbContext _context;
        private readonly IHubNotificationService _hubNotificationService;
        private readonly IPushNotificationService _pushNotificationService;
        public NotificationService(GGHubDbContext context, IHubNotificationService hubNotificationService, IPushNotificationService pushNotificationService)
        {
            _context = context;
            _hubNotificationService = hubNotificationService;
            _pushNotificationService = pushNotificationService;
        }

        public async Task CreateNotificationAsync(
            int recipientUserId,
            NotificationType type,
            string messageKey,
            IDictionary<string, string>? messageArgs = null,
            string? link = null,
            int? actorUserId = null)
        {
            var args = messageArgs is null
                ? new Dictionary<string, string>()
                : new Dictionary<string, string>(messageArgs);

            var actor = actorUserId.HasValue
                ? await _context.Users.AsNoTracking()
                    .Where(u => u.Id == actorUserId.Value)
                    .Select(u => new { u.Username, u.FirstName, u.LastName })
                    .FirstOrDefaultAsync()
                : null;

            // Aktorun adi ARGUMANLARA YAZILMAZ, yalnizca render icin cozulur: boylece
            // kullanici adini degistirdiginde eski bildirimler de guncel gorunur.
            var renderArgs = ToRenderArgs(args);
            if (actor is not null)
            {
                renderArgs["username"] = DisplayName(actor.FirstName, actor.LastName, actor.Username);
            }

            var notification = new Notification
            {
                RecipientUserId = recipientUserId,
                ActorUserId = actorUserId,
                Type = type,
                Link = link,
                MessageKey = messageKey,
                MessageArgs = args.Count > 0 ? JsonSerializer.Serialize(args) : null,
                // Ambient kultur = AKTORUN dili, yani bu metin alici icin yanlis dilde olabilir.
                // Yeni istemciler zaten okuma aninda MessageKey'den kendi dillerinde render eder;
                // bu alan yalnizca MessageKey'i bilmeyen ESKI mobil surumler icin doldurulur.
                Message = AppText.Get(messageKey, renderArgs)
            };

            await _context.Notifications.AddAsync(notification);
            await _context.SaveChangesAsync();

            // Push real-time notification
            var notificationDto = await BuildDtoAsync(notification, recipientUserId, AppText.CurrentLocale());
            await _hubNotificationService.SendNotificationAsync(recipientUserId, notificationDto);

            // Update unread notification count
            var unreadCount = await GetUnreadCountAsync(recipientUserId);
            await _hubNotificationService.UpdateUnreadNotificationCountAsync(recipientUserId, unreadCount);

            // OS-level push (delivered when the app is backgrounded/closed). Best-effort.
            // Govde ALICININ cihaz dilinde render edilir; notificationId sayesinde bildirime
            // dokunulunca istemci tam o satiri okundu yapabilir.
            await _pushNotificationService.SendLocalizedToUserAsync(
                recipientUserId,
                messageKey,
                renderArgs,
                link,
                notification.Id,
                actor is not null ? DisplayName(actor.FirstName, actor.LastName, actor.Username) : null);
        }

        public async Task<IEnumerable<NotificationDto>> GetUserNotificationsAsync(int userId)
        {
            var notifications = await _context.Notifications
                .AsNoTracking()
                .Where(n => n.RecipientUserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .Take(50) // Son 50 bildirim
                .Select(n => new
                {
                    n.Id,
                    n.Message,
                    n.MessageKey,
                    n.MessageArgs,
                    n.Link,
                    n.IsRead,
                    n.Type,
                    n.CreatedAt,
                    n.ActorUserId,
                    Actor = n.Actor == null ? null : new UserDto
                    {
                        Id = n.Actor.Id,
                        Username = n.Actor.Username,
                        ProfileImageUrl = n.Actor.ProfileImageUrl,
                        FirstName = n.Actor.FirstName,
                        LastName = n.Actor.LastName
                    }
                })
                .ToListAsync();

            // Bu istek ALICININ kendi istegi, dolayisiyla ambient kultur burada DOGRU.
            // Metni burada yeniden uretmek, "bildirim aktorun dilinde donuyor" hatasini
            // hicbir istemci degisikligi gerektirmeden, mevcut surumler dahil kapatir.
            var locale = AppText.CurrentLocale();

            var actorIds = notifications
                .Where(n => n.Actor != null)
                .Select(n => n.Actor!.Id)
                .Distinct()
                .ToList();

            var followingIds = actorIds.Count > 0
                ? (await _context.Follows.AsNoTracking()
                    .Where(f => f.FollowerId == userId && actorIds.Contains(f.FolloweeId))
                    .Select(f => f.FolloweeId)
                    .ToListAsync()).ToHashSet()
                : new HashSet<int>();

            var visibilities = actorIds.Count > 0
                ? await _context.Users.AsNoTracking()
                    .Where(u => actorIds.Contains(u.Id))
                    .Select(u => new { u.Id, u.ProfileVisibility })
                    .ToDictionaryAsync(x => x.Id, x => x.ProfileVisibility)
                : new Dictionary<int, ProfileVisibilitySetting>();

            return notifications.Select(n =>
            {
                if (n.Actor is not null)
                {
                    var follows = followingIds.Contains(n.Actor.Id);
                    n.Actor.IsFollowing = follows;
                    // Gizli profilli bir aktorun adi ve avatari GOSTERILIR (aksi halde bildirim
                    // anlamsizlasir) ama profiline LINK VERILMEZ: /profiles/{username} onlar icin
                    // 404 doner. Bayrak istemcideki link kapisini yonetir.
                    n.Actor.IsProfileAccessible = visibilities.TryGetValue(n.Actor.Id, out var v)
                        && ProfileAccess.CanView(v, n.Actor.Id, userId, follows);
                }

                return new NotificationDto
                {
                    Id = n.Id,
                    Message = RenderMessage(n.MessageKey, n.MessageArgs, n.Message, n.Actor, locale),
                    Actor = n.Actor,
                    Link = n.Link,
                    IsRead = n.IsRead,
                    Type = n.Type,
                    CreatedAt = n.CreatedAt
                };
            }).ToList();
        }

        public async Task<int> GetUnreadCountAsync(int userId)
        {
            return await _context.Notifications
                .Where(n => n.RecipientUserId == userId && !n.IsRead)
                .CountAsync();
        }
        public async Task<bool> MarkAsReadAsync(int notificationId, int userId)
        {
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.Id == notificationId && n.RecipientUserId == userId);

            if (notification == null) return false;
            if (notification.IsRead) return true;

            notification.IsRead = true;
            var saved = await _context.SaveChangesAsync() > 0;

            // Zil rozeti anlik dussun: guncel okunmamis sayacini yayinla.
            var unreadCount = await GetUnreadCountAsync(userId);
            await _hubNotificationService.UpdateUnreadNotificationCountAsync(userId, unreadCount);

            return saved;
        }
        public async Task<bool> MarkAllAsReadAsync(int userId)
        {
            var unreadNotifications = await _context.Notifications
                .Where(n => n.RecipientUserId == userId && !n.IsRead)
                .ToListAsync();

            foreach (var notification in unreadNotifications)
            {
                notification.IsRead = true;
            }

            var saved = await _context.SaveChangesAsync() > 0;

            // Tumu okundu: rozet temizlensin.
            await _hubNotificationService.UpdateUnreadNotificationCountAsync(userId, 0);

            return saved;
        }

        private async Task<NotificationDto> BuildDtoAsync(Notification notification, int recipientUserId, string locale)
        {
            UserDto? actor = null;
            if (notification.ActorUserId.HasValue)
            {
                actor = await _context.Users.AsNoTracking()
                    .Where(u => u.Id == notification.ActorUserId.Value)
                    .Select(u => new UserDto
                    {
                        Id = u.Id,
                        Username = u.Username,
                        ProfileImageUrl = u.ProfileImageUrl,
                        FirstName = u.FirstName,
                        LastName = u.LastName
                    })
                    .FirstOrDefaultAsync();
            }

            return new NotificationDto
            {
                Id = notification.Id,
                Message = RenderMessage(notification.MessageKey, notification.MessageArgs, notification.Message, actor, locale),
                Actor = actor,
                Link = notification.Link,
                IsRead = notification.IsRead,
                Type = notification.Type,
                CreatedAt = notification.CreatedAt
            };
        }

        /// <summary>
        /// MessageKey varsa metni verilen dilde yeniden uretir, yoksa yazma anindaki metne duser.
        /// Fallback eski satirlar (migration oncesi) icin gerekli.
        /// </summary>
        private static string RenderMessage(string? messageKey, string? messageArgsJson, string storedMessage, UserDto? actor, string locale)
        {
            if (string.IsNullOrEmpty(messageKey)) return storedMessage;

            var args = DeserializeArgs(messageArgsJson);
            if (actor is not null)
            {
                args["username"] = DisplayName(actor.FirstName, actor.LastName, actor.Username);
            }

            return AppText.GetFor(locale, messageKey, args);
        }

        private static Dictionary<string, object?> DeserializeArgs(string? json)
        {
            if (string.IsNullOrEmpty(json)) return new Dictionary<string, object?>();

            try
            {
                var parsed = JsonSerializer.Deserialize<Dictionary<string, string>>(json);
                return ToRenderArgs(parsed);
            }
            catch (JsonException)
            {
                return new Dictionary<string, object?>();
            }
        }

        private static Dictionary<string, object?> ToRenderArgs(IDictionary<string, string>? args)
        {
            var result = new Dictionary<string, object?>();
            if (args is null) return result;

            foreach (var pair in args)
            {
                result[pair.Key] = pair.Value;
            }

            return result;
        }

        /// <summary>Gercek ad varsa o, yoksa kullanici adi. X'teki gibi kalin gosterilen isim.</summary>
        private static string DisplayName(string? firstName, string? lastName, string username)
        {
            var full = $"{firstName} {lastName}".Trim();
            return string.IsNullOrWhiteSpace(full) ? username : full;
        }
    }
}
