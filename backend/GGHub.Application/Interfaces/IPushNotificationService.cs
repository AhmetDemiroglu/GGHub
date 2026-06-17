namespace GGHub.Application.Interfaces
{
    // Delivers OS-level push notifications (via Expo Push) and manages device tokens.
    // All send operations are best-effort and must never throw into the calling flow.
    public interface IPushNotificationService
    {
        Task RegisterTokenAsync(int userId, string token, string platform);
        Task RemoveTokenAsync(string token);
        Task SendToUserAsync(int userId, string title, string body, string? link = null);
    }
}
