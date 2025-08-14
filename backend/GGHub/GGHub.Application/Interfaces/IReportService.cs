using GGHub.Application.Dtos;

namespace GGHub.Application.Interfaces
{
    public interface IReportService
    {
        Task ReportReviewAsync(int reviewId, int reporterUserId, ReportForCreationDto reportDto);
    }
}