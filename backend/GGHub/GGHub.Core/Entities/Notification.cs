namespace GGHub.Core.Entities
{
    public class Notification
    {
        public int Id { get; set; }
        public int RecipientUserId { get; set; } 
        public User RecipientUser { get; set; }
        public string Message { get; set; }
        public string? Link { get; set; } 
        public bool IsRead { get; set; } = false; 
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}