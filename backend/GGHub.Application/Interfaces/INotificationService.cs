using GGHub.Application.Dtos;
using GGHub.Core.Enums;

namespace GGHub.Application.Interfaces
{
    public interface INotificationService
    {
        Task CreateNotificationAsync(int recipientUserId, string message, NotificationType type, string? link = null);
        Task<int> GetUnreadCountAsync(int userId);
        Task<bool> MarkAsReadAsync(int notificationId, int userId);
        Task<bool> MarkAllAsReadAsync(int userId);
        Task<IEnumerable<NotificationDto>> GetUserNotificationsAsync(int userId);

    }
}
