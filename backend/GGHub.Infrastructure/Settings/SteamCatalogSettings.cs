namespace GGHub.Infrastructure.Settings
{
    /// <summary>
    /// Steam katalog entegrasyonu ayarlari. Steam'in magaza uclari (storesearch, appdetails,
    /// featuredcategories) anahtarsiz ve ucretsizdir; tek kisit resmi olmayan rate limit
    /// (~200 istek / 5 dk). Bu yuzden istekler arasi bekleme ve kosu basi tavan zorunlu.
    /// RAWG kataloğunda olmayan (ozellikle yeni cikan) Steam oyunlarinin bulunabilmesini saglar.
    /// </summary>
    public class SteamCatalogSettings
    {
        /// <summary>Worker'daki SteamNewReleasesSyncJob icin ana anahtar.</summary>
        public bool Enabled { get; set; } = true;

        /// <summary>
        /// WebAPI arama yolundaki on-demand ingest anahtari: DB aramasi az sonuc dondurdugunde
        /// Steam'de arayip eksik oyunu katalogla. Kapatilirsa arama saf DB-only kalir.
        /// </summary>
        public bool OnDemandEnabled { get; set; } = true;

        public string BaseUrl { get; set; } = "https://store.steampowered.com/api/";

        /// <summary>Fiyat/bolge parametresi; tarih formatinin sabit kalmasi icin us+en pinli.</summary>
        public string Country { get; set; } = "us";
        public string Language { get; set; } = "en";

        public int DelayBetweenRequestsMs { get; set; } = 1500;

        /// <summary>Sync job'in tek kosuda atacagi azami appdetails istegi.</summary>
        public int MaxAppDetailsPerRun { get; set; } = 100;

        public int RunIntervalMinutes { get; set; } = 360;

        /// <summary>On-demand aramada tek istekte ingest edilecek azami oyun.</summary>
        public int OnDemandMaxIngest { get; set; } = 3;

        /// <summary>
        /// Sonuc vermeyen arama terimleri bu sure boyunca tekrar Steam'e sorulmaz
        /// (ayni bos aramanin her tus vurusunda Steam'i dovmesini onler).
        /// </summary>
        public int SearchMissCacheMinutes { get; set; } = 15;
    }
}
