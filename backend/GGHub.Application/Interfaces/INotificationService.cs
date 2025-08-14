namespace GGHub.Application.Interfaces
{
    public interface INotificationService
    {
        Task CreateNotificationAsync(int recipientUserId, string message, string? link = null);
    }
}
