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

        /// <summary>
        /// ANLIK arama: terimi IGDB'de arar, DB'de olmayan eslesmeleri katalogla. Steam yalnizca
        /// PC'yi kapsadigi ve RAWG kesintiye acik oldugu icin konsol yapimlarinda tek yol budur.
        /// Ingest edilen oyun sayisini dondurur; hata halinde 0 (arama akisi asla dusmez).
        /// </summary>
        Task<int> SearchAndIngestAsync(string term, int maxIngest, CancellationToken ct = default);

        /// <summary>
        /// ANLIK detay: slug veya isimden tek oyunu IGDB'den katalogla. RAWG erisilemezken
        /// bilinmeyen bir oyunun detay sayfasi acildiginda devreye girer. Bulunamazsa null.
        /// </summary>
        Task<Core.Entities.Game?> IngestBySlugOrNameAsync(string slugOrName, CancellationToken ct = default);
    }
}
