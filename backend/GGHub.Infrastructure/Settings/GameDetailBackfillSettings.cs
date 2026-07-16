namespace GGHub.Infrastructure.Settings
{
    /// <summary>
    /// RAWG detay backfill ayarlari. RawgImportJob list ucunu kullaniyor (40 oyun/istek) ve list
    /// yanitinda aciklama YOK; bu yuzden DB'deki 31.917 oyunun sadece 276'sinda aciklama var.
    /// Aciklama icin oyun basina bir detay istegi (games/{id}) sart. Bu job onu yapiyor.
    /// </summary>
    public class GameDetailBackfillSettings
    {
        public bool Enabled { get; set; }

        /// <summary>Tek DB sorgusunda cekilecek oyun sayisi.</summary>
        public int BatchSize { get; set; } = 50;

        /// <summary>RAWG istekleri arasi bekleme. RawgImportJob ile ayni deger.</summary>
        public int DelayBetweenRequestsMs { get; set; } = 1500;

        /// <summary>
        /// Tek turda atilacak azami RAWG istegi. RAWG ucretsiz katman ayda 20.000 istek veriyor ve
        /// ayni anahtari prod kullanici trafigi de kullaniyor; bu sinir job'in tum kotayi tek
        /// gecede yemesini onluyor.
        /// </summary>
        public int MaxRequestsPerRun { get; set; } = 500;

        public int RunIntervalMinutes { get; set; } = 10;
        public int RateLimitBackoffMs { get; set; } = 60_000;
        public int ServerErrorBackoffMs { get; set; } = 30_000;
        public int MaxConsecutiveErrors { get; set; } = 5;
    }
}
