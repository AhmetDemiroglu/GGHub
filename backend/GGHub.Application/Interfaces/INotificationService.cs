using GGHub.Application.Dtos;
using GGHub.Core.Enums;

namespace GGHub.Application.Interfaces
{
    public interface INotificationService
    {
        /// <summary>
        /// Bildirimin TEK üretim noktası: DB satırı + SignalR + OS push.
        ///
        /// Hazır metin yerine AppText anahtarı + argüman alır. Böylece metin okuma anında
        /// ALICININ dilinde üretilir; önceden tetikleyen isteğin dilinde donuyordu
        /// (İngilizce bir kullanıcı Türk kullanıcıyı takip edince Türk kullanıcı İngilizce
        /// bildirim alıyordu).
        /// </summary>
        /// <param name="messageArgs">
        /// Aktör DIŞINDAKİ yer tutucular (ör. listName). Aktörün adını BURAYA KOYMA:
        /// actorUserId üzerinden okuma anında çözülür ki ad değişikliği geriye de yansısın.
        /// </param>
        Task CreateNotificationAsync(
            int recipientUserId,
            NotificationType type,
            string messageKey,
            IDictionary<string, string>? messageArgs = null,
            string? link = null,
            int? actorUserId = null);
        Task<int> GetUnreadCountAsync(int userId);
        Task<bool> MarkAsReadAsync(int notificationId, int userId);
        Task<bool> MarkAllAsReadAsync(int userId);
        Task<IEnumerable<NotificationDto>> GetUserNotificationsAsync(int userId);

    }
}
