namespace GGHub.Application.Dtos
{
    /// <summary>
    /// PUT profile/me/ai-interaction. Yalnizca KAPATMA icin: acmak acik riza ister
    /// (POST profile/me/ai-consent). Allow=true gelirse 400 doner.
    /// </summary>
    public class UpdateAiInteractionDto
    {
        public bool Allow { get; set; }

        /// <summary>"web", "ios", "android". Riza gunlugune yazilir.</summary>
        public string? Source { get; set; }
    }

    /// <summary>
    /// POST profile/me/ai-consent. AI etkilesimi acik riza metnini onaylar ve etkilesimi acar.
    /// Dogum tarihi profilde yoksa bu istekle birlikte girilir; 18 yas alti reddedilir ve tarih
    /// kaydedilmez.
    /// </summary>
    public class AiConsentDto
    {
        /// <summary>"Okudum, onayliyorum" isareti. false ise 400.</summary>
        public bool Accept { get; set; }

        /// <summary>Istemcinin gosterdigi metnin surumu (AiConsentTexts.CurrentVersion).</summary>
        public string? TextVersion { get; set; }

        /// <summary>"web", "ios", "android".</summary>
        public string? Source { get; set; }

        /// <summary>Profilde dogum tarihi yoksa zorunlu. Varsa yok sayilir (profil duzenlemeden degisir).</summary>
        public DateTime? DateOfBirth { get; set; }
    }
}
