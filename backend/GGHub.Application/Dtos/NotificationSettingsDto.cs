using GGHub.Core.Enums;

namespace GGHub.Application.Dtos
{
    /// <summary>Tek bir bildirim tipinin açık/kapalı durumu.</summary>
    public class NotificationPreferenceDto
    {
        public NotificationType Type { get; set; }
        public bool Enabled { get; set; }
    }

    /// <summary>
    /// Kullanıcının bildirim ayarlarının TAMAMI.
    ///
    /// Liste her zaman yapılandırılabilir TÜM tipleri içerir (doğum günü hariç); DB'de satırı
    /// olmayan tipler <c>Enabled = true</c> ile döner. Böylece istemci varsayılanı bilmek
    /// zorunda kalmaz ve yeni bir bildirim tipi eklendiğinde ekranda kendiliğinden çıkar.
    /// </summary>
    public class NotificationSettingsDto
    {
        /// <summary>Cihaza push gönderilsin mi. Uygulama içi bildirimleri etkilemez.</summary>
        public bool PushEnabled { get; set; }
        public List<NotificationPreferenceDto> Preferences { get; set; } = new();
    }

    /// <summary>
    /// Kısmi güncelleme: yalnızca gönderilen alanlar uygulanır. Tek bir anahtarı değiştirmek
    /// için ekranın tüm ayarları geri göndermesi gerekmez.
    /// </summary>
    public class NotificationSettingsForUpdateDto
    {
        public bool? PushEnabled { get; set; }
        public List<NotificationPreferenceDto>? Preferences { get; set; }
    }
}
