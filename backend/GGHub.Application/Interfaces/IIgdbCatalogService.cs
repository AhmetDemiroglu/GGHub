namespace GGHub.Application.Interfaces
{
    /// <summary>
    /// IGDB (Twitch) tabanli katalog senkronu. Steam yalnizca PC'yi kapsadigi ve RAWG
    /// kesintiye acik oldugu icin konsol ozel yapimlarin (PS5/Xbox/Switch) tek kaynagi.
    /// </summary>
    public interface IIgdbCatalogService
    {
        /// <summary>Kimlik bilgileri girilmis ve servis acik mi.</summary>
        bool IsConfigured { get; }

        /// <summary>
        /// Yakin gecmis + gelecek penceresindeki cikislari ceker ve DB'yi gunceller.
        /// (eklenen, guncellenen) sayilarini dondurur. Hata halinde (0,0).
        /// </summary>
        Task<(int Added, int Updated)> SyncReleaseWindowAsync(CancellationToken ct = default);

        /// <summary>
        /// Katalogdaki mevcut oyunlara IGDB puani/eslesmesi kazandirir (cikis penceresinden
        /// bagimsiz). Isim eslesmesiyle IGDB kaydini bulur, IgdbId + IgdbRating yazar; boylece
        /// eski oyunlarda da dorduncu puan kaynagi gorunur. Islenen oyun sayisini dondurur.
        /// </summary>
        Task<int> EnrichExistingGamesAsync(int batchSize, CancellationToken ct = default);
    }
}
