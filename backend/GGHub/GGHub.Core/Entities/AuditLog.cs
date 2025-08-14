namespace GGHub.Core.Entities
{
    public class AuditLog
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string ActionType { get; set; } 
        public string EntityType { get; set; }
        public int EntityId { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public string? Changes { get; set; }
    }
}