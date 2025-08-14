using GGHub.Core.Enums;

namespace GGHub.Application.Dtos
{
    public class AdminReportDto
    {
        public int ReportId { get; set; }
        public string EntityType { get; set; }
        public int EntityId { get; set; }
        public string Reason { get; set; }
        public ReportStatus Status { get; set; }
        public DateTime ReportedAt { get; set; }
        public int ReporterId { get; set; }
        public string ReporterUsername { get; set; }
    }
}