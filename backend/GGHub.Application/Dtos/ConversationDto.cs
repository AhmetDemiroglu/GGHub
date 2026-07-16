namespace GGHub.Application.Dtos
{
    public class ConversationDto
    {
        public int PartnerId { get; set; }
        public string PartnerUsername { get; set; }
        public string? PartnerProfileImageUrl { get; set; }

        /// <summary>
        /// Konusulan kisi. Gercek ad (FirstName/LastName) ve profil linki kapisi
        /// (IsProfileAccessible) buradan gelir; duz PartnerUsername/PartnerProfileImageUrl
        /// alanlari BILEREK korunuyor cunku mobil surum bump'ina kadar eski istemciler
        /// onlari okumaya devam edecek.
        /// </summary>
        public UserDto? Partner { get; set; }
        public string LastMessage { get; set; }
        public DateTime LastMessageSentAt { get; set; }
        public int UnreadCount { get; set; } 
    }
}