using GGHub.Application.Dtos;
using GGHub.Core.Enums;

namespace GGHub.Application.Interfaces
{
    /// <summary>
    /// Bildirim tercihlerinin okunması, güncellenmesi ve UYGULANMASI.
    ///
    /// <see cref="IsEnabledAsync"/> gönderim yolundaki tek kapıdır: NotificationService
    /// bildirimi üretmeden önce, mesaj push'u da göndermeden önce buraya sorar.
    /// </summary>
    public interface INotificationPreferenceService
    {
        Task<NotificationSettingsDto> GetSettingsAsync(int userId);

        /// <summary>Kısmi günceller ve güncel ayarların TAMAMINI döner.</summary>
        Task<NotificationSettingsDto> UpdateSettingsAsync(int userId, NotificationSettingsForUpdateDto dto);

        /// <summary>
        /// Bu tip bu kullanıcıya gönderilecek mi. Tercih satırı yoksa (varsayılan) ve
        /// yapılandırılamayan tiplerde (doğum günü) true döner.
        /// </summary>
        Task<bool> IsEnabledAsync(int userId, NotificationType type);
    }
}
