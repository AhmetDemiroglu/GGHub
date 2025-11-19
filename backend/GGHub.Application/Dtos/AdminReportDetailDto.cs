using GGHub.Core.Enums;
using System;

namespace GGHub.Application.Dtos
{
    public class AdminReportDetailDto
    {
        public int Id { get; set; }
        public string EntityType { get; set; }
        public int EntityId { get; set; }
        public string Reason { get; set; }
        public ReportStatus Status { get; set; }
        public DateTime ReportedAt { get; set; }
        public string? AdminResponse { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public int ReporterId { get; set; }
        public string ReporterUsername { get; set; }
        public string? ReporterProfileImage { get; set; }
        public string ReportedContent { get; set; }
        public string ReportedEntityTitle { get; set; }
        public int AccusedUserId { get; set; }
        public string AccusedUsername { get; set; }
        public string? AccusedProfileImage { get; set; }
    }
}