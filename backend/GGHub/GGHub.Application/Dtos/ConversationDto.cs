namespace GGHub.Application.Dtos
{
    public class ConversationDto
    {
        public int PartnerId { get; set; }
        public string PartnerUsername { get; set; }
        public string? PartnerProfileImageUrl { get; set; }
        public string LastMessage { get; set; }
        public DateTime LastMessageSentAt { get; set; }
        public int UnreadCount { get; set; } 
    }
}