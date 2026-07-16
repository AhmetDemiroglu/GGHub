namespace GGHub.Application.Interfaces
{
    // Delivers OS-level push notifications (via Expo Push) and manages device tokens.
    // All send operations are best-effort and must never throw into the calling flow.
    public interface IPushNotificationService
    {
        /// <param name="locale">
        /// Cihazın uygulama içi dili, kayıt isteğinin Accept-Language'ından. Push gövdesi
        /// alıcının dilinde render edilebilsin diye saklanır.
        /// </param>
        Task RegisterTokenAsync(int userId, string token, string platform, string? locale = null);
        Task RemoveTokenAsync(string token);

        /// <summary>
        /// Hazır title/body ile gönderir. Gövdesi kullanıcı içeriği olan (dolayısıyla
        /// çevrilecek bir şeyi olmayan) akışlar için: ör. direkt mesaj push'u.
        /// </summary>
        Task SendToUserAsync(int userId, string title, string body, string? link = null, int? notificationId = null);

        /// <summary>
        /// Gövdeyi her cihazın KENDİ diline göre render ederek gönderir.
        /// Push, bildirimi tetikleyen kullanıcının isteği üzerinde üretilir; oradaki ambient
        /// kültür alıcının değil AKTÖRÜN dilidir, bu yüzden render burada açıkça yapılır.
        /// </summary>
        /// <param name="notificationId">
        /// Push yüküne data.notificationId olarak gider. Bildirime dokunulunca istemci bunu
        /// okuyup tam o bildirimi okundu yapar; önceden rozeti temizlemek için zil ekranını
        /// tekrar açmak gerekiyordu.
        /// </param>
        Task SendLocalizedToUserAsync(
            int userId,
            string bodyKey,
            IDictionary<string, object?>? bodyArgs = null,
            string? link = null,
            int? notificationId = null,
            string? title = null);
    }
}
