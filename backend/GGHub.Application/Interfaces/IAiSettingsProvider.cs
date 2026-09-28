using GGHub.Core.Entities;

namespace GGHub.Application.Interfaces
{
    /// <summary>
    /// Admin panelinden yonetilen AI/Gemini ayarlarinin tek okuma noktasi. Satir yoksa
    /// varsayilanlarla olusturur. Okuma 60 sn onbellekli; admin guncellemesi onbellegi bosaltir.
    /// Donen nesne onbellegin KOPYASI degil, degistirme: guncelleme icin UpdateAsync kullan.
    /// </summary>
    public interface IAiSettingsProvider
    {
        Task<AiSettings> GetAsync(CancellationToken cancellationToken = default);

        Task<AiSettings> UpdateAsync(Action<AiSettings> mutate, CancellationToken cancellationToken = default);
    }
}
