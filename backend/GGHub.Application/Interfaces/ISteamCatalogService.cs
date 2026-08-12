using GGHub.Core.Entities;

namespace GGHub.Application.Interfaces
{
    /// <summary>
    /// Steam magaza uclarindan (anahtarsiz, ucretsiz) oyun kesfi ve ingest'i.
    /// RAWG kataloğunda olmayan (ozellikle yeni cikmis) oyunlarin bulunabilmesini saglar.
    /// Steam kaynakli satirlarda RawgId = -SteamAppId kuralina bakiniz (Game.SteamAppId).
    /// </summary>
    public interface ISteamCatalogService
    {
        /// <summary>
        /// Terimi Steam'de arar, DB'de olmayan eslesmeleri appdetails ile ingest eder.
        /// Ingest edilen oyun sayisini dondurur. Hatalar sessizce yutulur (arama akisi
        /// hicbir zaman Steam yuzunden dusmemeli); basarisizlikta 0 doner.
        /// </summary>
        Task<int> SearchAndIngestAsync(string term, int maxIngest, CancellationToken ct = default);

        /// <summary>
        /// Tek bir Steam appid'sini ingest eder (veya DB'deki mevcut satiri dondurur).
        /// Isim+yil eslesmesiyle mevcut bir RAWG satiri bulunursa yeni satir ACILMAZ;
        /// o satira SteamAppId baglanir. Ingest edilemezse null doner.
        /// </summary>
        Task<Game?> IngestAppAsync(int steamAppId, CancellationToken ct = default);

        /// <summary>featuredcategories ucundan new_releases + coming_soon appid'lerini dondurur.</summary>
        Task<IReadOnlyList<int>> GetFeaturedAppIdsAsync(CancellationToken ct = default);

        /// <summary>
        /// Steam magaza aramasinin "populer yakinda cikacaklar" listesinden appid'leri dondurur.
        /// featuredcategories'ten cok daha genis bir pencere saglar (~50-100 oyun).
        /// </summary>
        Task<IReadOnlyList<int>> GetComingSoonAppIdsAsync(int count, CancellationToken ct = default);
    }
}
