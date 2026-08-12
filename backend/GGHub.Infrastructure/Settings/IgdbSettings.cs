namespace GGHub.Infrastructure.Settings
{
    /// <summary>
    /// IGDB (Twitch) katalog ayarlari. Steam yalnizca PC'yi kapsiyor; konsol ozel yapimlar
    /// (Marvel's Wolverine gibi) ancak bu kaynaktan gelebiliyor. IGDB ucretsizdir, kimlik
    /// bilgileri Twitch developer konsolundan alinir (client credentials akisi).
    /// Kimlik bilgileri repoya GIRMEZ: Worker'da ~/.gghub-bot/appsettings.json, prod'da
    /// Railway env (Igdb__ClientId / Igdb__ClientSecret).
    /// </summary>
    public class IgdbSettings
    {
        /// <summary>ClientId/Secret bos ise servis kendini kapali sayar (kod her zaman guvenli).</summary>
        public bool Enabled { get; set; } = true;

        public string ClientId { get; set; } = string.Empty;
        public string ClientSecret { get; set; } = string.Empty;

        public string BaseUrl { get; set; } = "https://api.igdb.com/v4/";
        public string TokenUrl { get; set; } = "https://id.twitch.tv/oauth2/token";

        /// <summary>Bugunden kac ay ilerisi taransin.</summary>
        public int MonthsAhead { get; set; } = 18;

        /// <summary>
        /// Gecmise donuk kac ay taransin. RAWG import job'i durdurulmus oldugu icin katalogda
        /// donemsel BOSLUKLAR var (olculdu: Temmuz 2026'da hic oyun yoktu, Haziran'da 678).
        /// IGDB bu delikleri kapatan tek calisan kaynak; pencere genis tutuluyor.
        /// </summary>
        public int MonthsBehind { get; set; } = 18;

        /// <summary>IGDB sayfa boyutu (uc en fazla 500 kabul eder).</summary>
        public int PageSize { get; set; } = 500;

        /// <summary>
        /// Tek kosuda cekilecek azami sayfa. Zaten islenmis kayitlar tek toplu sorguyla
        /// atlandigi icin yuksek deger pahali degil; ilk dolum boylece hizli tamamlanir.
        /// </summary>
        public int MaxPagesPerRun { get; set; } = 30;

        /// <summary>IGDB limiti 4 istek/sn; 350 ms guvenli aralik.</summary>
        public int DelayBetweenRequestsMs { get; set; } = 350;

        /// <summary>
        /// Ilgi esigi: IGDB'de "hypes" (bekleyen kullanici sayisi). Cop kayitlari eler.
        /// Buyuk yapimlarda bu deger yuzlerdedir, cop kayitlarda 0.
        /// </summary>
        public int MinHypes { get; set; } = 3;

        public int RunIntervalHours { get; set; } = 12;

        /// <summary>
        /// Mevcut katalogu zenginlestirme (IGDB puani + eslesme) kosu basi oyun sayisi.
        /// 300 x 350 ms ~ 2 dk. Katalog ~32 bin oyun oldugu icin tam tarama zaman alir;
        /// kuyruk populerlige gore siralandigindan degerli oyunlar ilk gunlerde biter.
        /// </summary>
        public int EnrichBatchSize { get; set; } = 300;
    }
}
