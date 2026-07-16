using GGHub.Core.Enums;

namespace GGHub.Core.Entities
{
    public class Notification
    {
        public int Id { get; set; }
        public int RecipientUserId { get; set; }
        public User RecipientUser { get; set; }

        /// <summary>
        /// Bildirimi tetikleyen kullanıcı. Nullable: eski satırlarda yok, ve aktör hesabı
        /// silinirse SetNull ile boşalır. İstemci avatarı ve gerçek adı buradan gösterir.
        /// </summary>
        public int? ActorUserId { get; set; }
        public User? Actor { get; set; }

        /// <summary>
        /// Yazma anında render edilmiş metin. KALICI UYUMLULUK ALANI, kaldırılmamalı:
        /// mobil uygulama backend'in gerisinden gelir (backend her push'ta canlıya çıkar,
        /// mobil mağaza sürümüne kadar bekler), ve MessageKey'i bilmeyen eski istemciler
        /// bu alanı okumaya devam eder. Yeni satırlar okuma anında MessageKey'den ALICININ
        /// dilinde yeniden render edilir (bkz. NotificationService.GetUserNotificationsAsync).
        /// </summary>
        public string Message { get; set; }

        /// <summary>
        /// AppText anahtarı. Metnin alıcı diline göre okuma anında üretilmesini sağlar;
        /// önceden metin, bildirimi TETİKLEYEN isteğin dilinde donuyordu.
        /// </summary>
        public string? MessageKey { get; set; }

        /// <summary>
        /// MessageKey'in aktör DIŞINDAKİ yer tutucuları, JSON sözlük (ör. {"listName":"..."}).
        /// Aktörün adı BİLEREK burada tutulmaz: ad değişince eski bildirimler de güncel
        /// kalsın diye okuma anında ActorUserId üzerinden çözülür.
        /// </summary>
        public string? MessageArgs { get; set; }

        public string? Link { get; set; }
        public bool IsRead { get; set; } = false;
        public NotificationType Type { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}