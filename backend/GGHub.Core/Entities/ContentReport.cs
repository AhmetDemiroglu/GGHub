using GGHub.Core.Enums;

namespace GGHub.Core.Entities
{
    public class ContentReport
    {
        public int Id { get; set; }
        public string EntityType { get; set; }
        public int EntityId { get; set; } 
        public int ReporterUserId { get; set; } 
        public User ReporterUser { get; set; }
        public string Reason { get; set; } 
        public ReportStatus Status { get; set; } = ReportStatus.Open;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }
        public string? AdminResponse { get; set; }
        public int? ResolvedByAdminId { get; set; }
    }
}