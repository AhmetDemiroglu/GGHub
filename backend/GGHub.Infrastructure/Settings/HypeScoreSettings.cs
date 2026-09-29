namespace GGHub.Infrastructure.Settings
{
    /// <summary>
    /// Hype skoru job'u ayarlari. Bolum ~/.gghub-bot/appsettings.json icinde hic yoksa
    /// buradaki varsayilanlar gecerlidir, yani mevcut kurulumda dosyaya dokunmak gerekmez.
    /// </summary>
    public class HypeScoreSettings
    {
        public bool Enabled { get; set; } = true;

        public int RunIntervalHours { get; set; } = 3;

        /// <summary>
        /// Okunma sayisi bu kadar saatten eskiyse yeniden cekilir. Wikipedia veriyi gunluk
        /// yayinliyor; her kosuda (3 saatte bir) cekmek ayni sayiyi tekrar indirmek olurdu.
        /// </summary>
        public int ViewsRefreshHours { get; set; } = 20;

        /// <summary>Wikipedia istekleri SIRAYLA ve bu aralikla atilir (paralel istek 429 donuyor).</summary>
        public int DelayBetweenRequestsMs { get; set; } = 120;
    }
}
