using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Services
{
    public class NotificationService : INotificationService
    {
        private readonly GGHubDbContext _context;
        private readonly IHubNotificationService _hubNotificationService;
        public NotificationService(GGHubDbContext context, IHubNotificationService hubNotificationService)
        {
            _context = context;
            _hubNotificationService = hubNotificationService;
        }
        public async Task CreateNotificationAsync(int recipientUserId, string message, NotificationType type, string? link = null)
        {
            var notification = new Notification
            {
                RecipientUserId = recipientUserId,
                Message = message,
                Type = type,
                Link = link
            };
            await _context.Notifications.AddAsync(notification);
            await _context.SaveChangesAsync();

            // Push real-time notification
            var notificationDto = new NotificationDto
            {
                Id = notification.Id,
                Message = notification.Message,
                Link = notification.Link,
                IsRead = false,
                CreatedAt = notification.CreatedAt
            };
            await _hubNotificationService.SendNotificationAsync(recipientUserId, notificationDto);

            // Update unread notification count
            var unreadCount = await GetUnreadCountAsync(recipientUserId);
            await _hubNotificationService.UpdateUnreadNotificationCountAsync(recipientUserId, unreadCount);
        }
        public async Task<IEnumerable<NotificationDto>> GetUserNotificationsAsync(int userId)
        {
            var notifications = await _context.Notifications
                .Where(n => n.RecipientUserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .Take(50) // Son 50 bildirim
                .Select(n => new NotificationDto
                {
                    Id = n.Id,
                    Message = n.Message,
                    Link = n.Link,
                    IsRead = n.IsRead,
                    CreatedAt = n.CreatedAt
                })
                .ToListAsync();

            return notifications;
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

            notification.IsRead = true;
            return await _context.SaveChangesAsync() > 0;
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

            return await _context.SaveChangesAsync() > 0;
        }
    }
}