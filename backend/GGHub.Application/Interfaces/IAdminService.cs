using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;
using GGHub.Core.Enums;

namespace GGHub.Application.Interfaces
{
    public interface IAdminService
    {
        Task<IEnumerable<AdminReportDto>> GetContentReportsAsync();
        Task<bool> UpdateReportStatusAsync(int reportId, ReportStatus newStatus);
        Task<PaginatedResult<AdminUserSummaryDto>> GetUsersAsync(UserFilterParams filterParams);
        Task<AdminUserDetailsDto?> GetUserDetailsAsync(int userId);
        Task<bool> BanUserAsync(int userId, BanUserRequestDto dto, int adminUserId);
        Task<bool> UnbanUserAsync(int userId, int adminUserId);
        Task<bool> ChangeUserRoleAsync(int userId, ChangeRoleRequestDto dto, int adminUserId);
        Task<DashboardStatsDto> GetDashboardStatisticsAsync();
        Task<IEnumerable<AdminUserSummaryDto>> GetRecentUsersAsync(int count = 5);
        Task<IEnumerable<RecentReviewDto>> GetRecentReviewsAsync(int count = 5);
        Task<IEnumerable<AdminUserListSummaryDto>> GetListsForUserAsync(int userId);
        Task<IEnumerable<AdminReviewSummaryDto>> GetReviewsForUserAsync(int userId);
        Task<IEnumerable<AdminCommentSummaryDto>> GetCommentsForUserAsync(int userId);
        Task<IEnumerable<AdminUserReportSummaryDto>> GetReportsMadeByUserAsync(int userId);
    }
}