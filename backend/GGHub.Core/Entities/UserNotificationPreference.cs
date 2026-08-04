using GGHub.Core.Enums;

namespace GGHub.Core.Entities
{
    /// <summary>
    /// Kullanıcının TEK bir bildirim tipi için tercihi.
    /// </summary>
    /// <remarks>
    /// Neden tip başına satır, User üzerinde bool kolonları değil: <see cref="NotificationType"/>
    /// append-only büyüyor ve her yeni tip için bir migration + bir kolon eklemek gerekirdi.
    /// Bu şemada yeni tip hiçbir şema değişikliği istemez.
    ///
    /// SATIRIN YOKLUĞU "açık" demektir: varsayılan olarak tüm bildirimler gelir ve yalnızca
    /// kullanıcının dokunduğu tipler tabloya yazılır. Böylece mevcut kullanıcılar için backfill
    /// gerekmez ve yeni bir bildirim tipi eklendiğinde kimse onu kaçırmaz.
    ///
    /// <see cref="NotificationType.Birthday"/> BİLEREK kapsam dışı (bkz. NotificationPreferences):
    /// yılda bir kez, aktörü olmayan bir kutlama; kapatılabilir bir gürültü kaynağı değil.
    /// </remarks>
    public class UserNotificationPreference
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public User User { get; set; }
        public NotificationType Type { get; set; }
        public bool Enabled { get; set; } = true;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
