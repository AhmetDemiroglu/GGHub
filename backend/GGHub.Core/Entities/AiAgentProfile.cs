namespace GGHub.Core.Entities
{
    /// <summary>
    /// Bir AI bot hesabinin karakteri. User ile 1:1 (UserId hem PK hem FK). Kullanici tarafi
    /// (ad, avatar, bio) User'da durur; burada yalnizca botun nasil davranacagi var.
    /// Persona metni admin panelinden duzenlenebilir.
    /// </summary>
    public class AiAgentProfile
    {
        public int UserId { get; set; }
        public User User { get; set; } = null!;

        /// <summary>AiAgentPersonas'taki sabit anahtar. Botlar yeniden olusturulurken kopya acilmasin diye.</summary>
        public string PersonaKey { get; set; } = string.Empty;

        /// <summary>Modele systemInstruction olarak giden karakter tarifi (zevk, uslup, ilgi alanlari).</summary>
        public string Persona { get; set; } = string.Empty;

        /// <summary>Virgulle ayrilmis RAWG tur slug'lari ("rpg,strategy"). Oyun secimini yonlendirir.</summary>
        public string FavoriteGenres { get; set; } = string.Empty;

        /// <summary>
        /// Puan egilimi, 10'luk olcekte -2..+2. Botun puani koddan gelir (Metacritic/IGDB + bu egilim);
        /// model yalnizca metni yazar, puani uydurmaz.
        /// </summary>
        public int RatingBias { get; set; }

        /// <summary>Gunluk kendiliginden islem kotasi. 0 = AiSettings.DailyActionsPerAgent kullanilir.</summary>
        public int DailyActionQuota { get; set; }

        public bool IsEnabled { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
