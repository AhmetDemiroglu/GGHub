using GGHub.Application.Dtos;

namespace GGHub.Application.Interfaces
{
    /// <summary>
    /// UserDto'nun okuyucuya bağlı alanlarını (IsFollowing, IsProfileAccessible) tek batch ile doldurur.
    ///
    /// Neden var: 22 ayrı "new UserDto" noktasının 20'si IsProfileAccessible'ı hiç set etmiyordu,
    /// yani C# varsayılanı false kalıyordu. İstemcide profil linkine bu bayrakla kapı koyunca
    /// bugün çalışan ~20 link sessizce ölürdü. Bayrağı her projeksiyonda elle tekrarlamak yerine
    /// (iki korelasyonlu EXISTS x 22 nokta) DTO'lar materyalize edildikten sonra burada doldurulur.
    /// </summary>
    public interface IUserDtoEnricher
    {
        /// <summary>
        /// Verilen DTO'ları yerinde günceller. null öğeler ve boş koleksiyon güvenlidir.
        /// Aynı kullanıcı birden çok kez geçebilir; sorgular distinct id üzerinden çalışır.
        /// </summary>
        Task EnrichAsync(IEnumerable<UserDto?> users, int? currentUserId);

        Task EnrichAsync(UserDto? user, int? currentUserId);
    }
}
