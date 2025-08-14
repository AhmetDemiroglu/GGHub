using GGHub.Core.Enums;
using System.ComponentModel.DataAnnotations;


namespace GGHub.Application.Dtos
{
    public class UpdateReportStatusDto
    {
        [Required]
        public ReportStatus NewStatus { get; set; }
    }
}
