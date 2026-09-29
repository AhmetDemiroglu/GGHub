using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;

namespace GGHub.Application.Interfaces
{
    /// <summary>Admin panelindeki hata kayitlari (/errors). Yazma tarafi ErrorLogWriter'da.</summary>
    public interface IErrorLogService
    {
        Task<PaginatedResult<ErrorGroupDto>> GetGroupsAsync(ErrorLogQueryParams query, CancellationToken cancellationToken = default);
        Task<ErrorGroupDetailDto?> GetGroupAsync(int id, CancellationToken cancellationToken = default);
        Task<ErrorGroupDto?> UpdateStatusAsync(int id, ErrorGroupStatusUpdateDto dto, CancellationToken cancellationToken = default);
        Task<ErrorLogSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default);
        Task<int> PurgeEventsOlderThanAsync(DateTime cutoffUtc, int batchSize, CancellationToken cancellationToken);
    }
}
