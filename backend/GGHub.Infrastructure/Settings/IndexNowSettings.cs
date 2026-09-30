namespace GGHub.Infrastructure.Settings
{
    /// <summary>
    /// IndexNow bildirim job'u ayarlari. Bolum ~/.gghub-bot/appsettings.json icinde hic yoksa
    /// buradaki varsayilanlar gecerlidir. Anahtar gizli DEGIL: IndexNow geregi sitede
    /// https://gghub.social/{Key}.txt olarak yayinda (ui/public).
    /// </summary>
    public class IndexNowSettings
    {
        public bool Enabled { get; set; } = true;

        public int RunIntervalHours { get; set; } = 6;

        public string Host { get; set; } = "gghub.social";

        public string Key { get; set; } = "0d9dcdee6eca4a47b9c5ade81124cbc0";

        public string Endpoint { get; set; } = "https://api.indexnow.org/indexnow";

        /// <summary>Ilk kosuda (durum dosyasi yokken) geriye dogru bakilacak sure.</summary>
        public int InitialLookbackHours { get; set; } = 48;

        /// <summary>
        /// Son basarili gonderimin zamani burada tutulur. Worker Program.cs bunu bot dizinine
        /// (~/.gghub-bot/indexnow-state.json) ayarliyor; bos kalirsa job calismaz.
        /// </summary>
        public string? StatePath { get; set; }
    }
}
