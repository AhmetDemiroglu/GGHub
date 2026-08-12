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
        /// <param name="popularityHint">
        /// Steam listesindeki siradan turetilen populerlik skoru (RawgAdded alanina yazilir).
        /// Steam oyunlarinda RAWG'in "added" sinyali yoktur; bu olmadan vitrin siralamasi
        /// tarih sirasina dusuyor ve buyuk yapimlar arada kayboluyordu.
        /// </param>
        Task<Game?> IngestAppAsync(int steamAppId, CancellationToken ct = default, int? popularityHint = null);

        /// <summary>featuredcategories ucundan new_releases + coming_soon appid'lerini dondurur.</summary>
        Task<IReadOnlyList<int>> GetFeaturedAppIdsAsync(CancellationToken ct = default);

        /// <summary>
        /// Steam magaza aramasinin "populer yakinda cikacaklar" listesinden appid'leri dondurur.
        /// featuredcategories'ten cok daha genis bir pencere saglar (~50-100 oyun).
        /// </summary>
        Task<IReadOnlyList<int>> GetComingSoonAppIdsAsync(int count, CancellationToken ct = default);

        /// <summary>
        /// Steam "en cok satanlar" listesindeki appid'ler, SIRAYLA. Gunluk degisen tek gercek
        /// populerlik sinyalimiz; kesfet sayfasinin trend skorunu besler.
        /// </summary>
        Task<IReadOnlyList<int>> GetTopSellerAppIdsAsync(int count, CancellationToken ct = default);
    }
}
