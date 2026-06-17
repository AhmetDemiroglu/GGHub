namespace GGHub.Core.Entities
{
    // A device push token (Expo) registered for a user so we can deliver OS-level
    // notifications (Apple Push / Android) when the app is in the background or closed.
    public class PushToken
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public User User { get; set; }
        public string Token { get; set; }      // Expo push token, e.g. ExponentPushToken[...]
        public string Platform { get; set; }    // "ios" | "android"
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
