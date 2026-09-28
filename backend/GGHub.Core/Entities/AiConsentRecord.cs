namespace GGHub.Core.Entities
{
    /// <summary>
    /// AI etkilesimi acik riza gunlugu. Her onay ve her geri alma bir satir; silinmez, guncellenmez.
    /// KVKK ve Apple 5.1.2(i) icin "kim, ne zaman, hangi metni onayladi" sorusunun cevabi.
    /// Hesap silinince satirlar da gider (cascade).
    /// </summary>
    public class AiConsentRecord
    {
        public long Id { get; set; }

        public int UserId { get; set; }
        public User User { get; set; } = null!;

        /// <summary>true: onay verildi. false: geri alindi.</summary>
        public bool Granted { get; set; }

        /// <summary>Onaylanan riza metninin surumu (AiConsentTexts.CurrentVersion).</summary>
        public string TextVersion { get; set; } = string.Empty;

        /// <summary>"web", "ios", "android" ya da "unknown".</summary>
        public string Source { get; set; } = "unknown";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
