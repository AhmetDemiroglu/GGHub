using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Services
{
    public class ReportService : IReportService
    {
        private readonly GGHubDbContext _context;
        public ReportService(GGHubDbContext context) { _context = context; }

        public async Task ReportReviewAsync(int reviewId, int reporterUserId, ReportForCreationDto reportDto)
        {
            var review = await _context.Reviews.FindAsync(reviewId);
            if (review == null) throw new KeyNotFoundException("Raporlanacak yorum bulunamadı.");
            if (review.UserId == reporterUserId) throw new InvalidOperationException("Kendi yorumunuzu raporlayamazsınız.");

            var existingReport = await _context.ContentReports.AnyAsync(r => r.EntityType == "Review" && r.EntityId == reviewId && r.ReporterUserId == reporterUserId);
            if (existingReport) throw new InvalidOperationException("Bu yorumu zaten raporladınız.");

            var report = new ContentReport
            {
                EntityId = reviewId,
                ReporterUserId = reporterUserId,
                Reason = reportDto.Reason,
            };

            await _context.ContentReports.AddAsync(report);
            await _context.SaveChangesAsync();
        }
    }
}