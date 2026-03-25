using GGHub.Application.Dtos;

namespace GGHub.Application.Interfaces
{
    public interface IHubNotificationService
    {
        Task SendMessageAsync(int recipientId, MessageDto message);
        Task SendNotificationAsync(int recipientId, NotificationDto notification);
        Task UpdateUnreadMessageCountAsync(int userId, int count);
        Task UpdateUnreadNotificationCountAsync(int userId, int count);
        Task UpdateConversationAsync(int userId, ConversationDto conversation);
        Task MessageReadAsync(int senderId, string readerUsername);
    }
}
