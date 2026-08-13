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

        /// <summary>
        /// ANLIK zenginlestirme: DB'de bulunan bir oyunun IGDB puani/eslesmesi eksikse
        /// (IgdbCheckedAt null) simdi cekip yazar. Detay sayfasi acildiginda calisir, boylece
        /// kullanicinin gezdigi oyunlar toplu job'i beklemeden puan kazanir.
        /// Zaten kontrol edilmis oyunlarda hicbir sey yapmaz (tek if, sifir maliyet).
        /// </summary>
        Task EnrichGameAsync(Core.Entities.Game game, CancellationToken ct = default);

        /// <summary>
        /// IGDB populerlik sinyalleri: IgdbId -> 0..100 arasi normalize skor.
        /// PLATFORM BAGIMSIZ olmasi kritik: Steam'in "en cok satanlar" listesi yalnizca PC'yi
        /// kapsadigi icin tek basina kullanildiginda PS5/Xbox ozel yapimlari (GTA VI gibi)
        /// siralamada geriye dusuyordu. IGDB'nin "Want to Play / Playing / Visits" sinyalleri
        /// ve Twitch izlenme saati tum platformlari kapsar.
        /// </summary>
        Task<Dictionary<int, double>> GetPopularitySignalsAsync(int limitPerType, CancellationToken ct = default);

        /// <summary>
        /// IGDB'nin populerlik listelerindeki (en cok beklenen / oynanan / izlenen) oyunlardan
        /// katalogda OLMAYANLARI ceker.
        ///
        /// Takvim taramasi tek basina yetmiyor: pencere yuz binlerce release_dates satiri
        /// icerdigi icin buyuk yapimlara gunler sonra ulasiyor ve arada bir sayfa dusunce o
        /// oyunlar bir daha hic toplanmiyordu (olculdu: Marvel's Wolverine, GTA VI ve Fable
        /// IGDB'de tam tarihli dururken katalogda yoktu). Bu adim onlari once alir.
        /// Eklenen kayit sayisini dondurur.
        /// </summary>
        Task<int> SyncPopularAsync(int limitPerType, CancellationToken ct = default);

        /// <summary>
        /// ONARIM: cikmis oldugu belli (puani olan) ama tarihi GELECEGE kaymis kayitlari
        /// IGDB'nin first_release_date degeriyle duzeltir. Bu bozulma, release_dates ucundaki
        /// platform/surum satirlarinin ana oyunun tarihi sanilarak yazilmasindan olustu
        /// (ornek: Elden Ring 2022 yerine 28 Agu 2026 gorunuyordu).
        /// Duzeltilen kayit sayisini dondurur.
        /// </summary>
        Task<int> RepairShiftedReleaseDatesAsync(int batchSize, CancellationToken ct = default);
    }
}
