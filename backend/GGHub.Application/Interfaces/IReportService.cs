using GGHub.Application.Dtos;

namespace GGHub.Application.Interfaces
{
    public interface IReportService
    {
        Task ReportReviewAsync(int reviewId, int reporterUserId, ReportForCreationDto reportDto);
        Task ReportUserAsync(int reportedUserId, int reporterUserId, ReportForCreationDto reportDto);
        Task ReportListAsync(int listId, int reporterUserId, ReportForCreationDto reportDto);
        Task ReportCommentAsync(int commentId, int reporterUserId, ReportForCreationDto reportDto);
        Task<IEnumerable<MyReportSummaryDto>> GetMyReportsAsync(int reporterUserId);
    }
}