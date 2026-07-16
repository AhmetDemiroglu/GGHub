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

        /// <summary>
        /// Cihazın uygulama içi dili ("tr" | "en-US"), kayıt anındaki Accept-Language'dan alınır.
        /// Push, bildirimi TETİKLEYEN kullanıcının isteği üzerinde üretilir; oradaki ambient
        /// CultureInfo alıcının değil aktörün dilidir. Bu yüzden push gövdesi bu alanla
        /// AÇIKÇA render edilir. Nullable: eski token satırlarında yok, en-US'a düşer.
        /// </summary>
        public string? Locale { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
