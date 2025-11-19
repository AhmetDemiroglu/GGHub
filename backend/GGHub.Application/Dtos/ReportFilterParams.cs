using GGHub.Core.Enums;
using System;

namespace GGHub.Application.Dtos
{
    public class ReportFilterParams
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 15;
        public string? SearchTerm { get; set; }
        public ReportStatus? StatusFilter { get; set; }
        public string? EntityTypeFilter { get; set; }
        public string SortBy { get; set; } = "CreatedAt";
        public string SortDirection { get; set; } = "desc";
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }
}