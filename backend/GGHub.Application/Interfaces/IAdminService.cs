using GGHub.Application.Dtos;
using GGHub.Core.Enums;

namespace GGHub.Application.Interfaces
{
    public interface IAdminService
    {
        Task<IEnumerable<AdminReportDto>> GetContentReportsAsync();
        Task<bool> UpdateReportStatusAsync(int reportId, ReportStatus newStatus);

    }
}