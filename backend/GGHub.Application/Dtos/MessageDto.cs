namespace GGHub.Application.Dtos
{
    public class MessageDto
    {
        public int Id { get; set; }
        public int SenderId { get; set; }
        public string SenderUsername { get; set; }
        public int RecipientId { get; set; }
        public string RecipientUsername { get; set; }
        public string Content { get; set; }
        public DateTime? ReadAt { get; set; }
        public DateTime SentAt { get; set; }
        public string? SenderProfileImageUrl { get; set; }
        public string? RecipientProfileImageUrl { get; set; }

        /// <summary>
        /// Gonderen ve alici. Gercek ad ve profil linki kapisi buradan gelir; yukaridaki
        /// duz alanlar eski istemciler icin BILEREK korunuyor.
        /// </summary>
        public UserDto? Sender { get; set; }
        public UserDto? Recipient { get; set; }
    }
}