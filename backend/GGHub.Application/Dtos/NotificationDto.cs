using System.ComponentModel.DataAnnotations;
using GGHub.Core.Enums;

namespace GGHub.Application.Dtos
{
    public class NotificationDto
    {
        public int Id { get; set; }

        /// <summary>
        /// Tam ve doğru cümle, ALICININ dilinde render edilmiş. Yer tutucudaki aktör adı
        /// okuma anında Actor'dan çözülür, yani kullanıcı gerçek adını değiştirince eski
        /// bildirimler de güncel görünür.
        /// </summary>
        public string Message { get; set; }

        /// <summary>Bildirimi tetikleyen kullanıcı. Eski satırlarda ve silinmiş hesaplarda null.</summary>
        public UserDto? Actor { get; set; }

        public string? Link { get; set; }
        public bool IsRead { get; set; }
        public NotificationType Type { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}