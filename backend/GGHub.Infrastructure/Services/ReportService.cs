using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities; 
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq; 
using System.Threading.Tasks;

namespace GGHub.Infrastructure.Services
{
    public class ReportService : IReportService
    {
        private readonly GGHubDbContext _context;
        public ReportService(GGHubDbContext context) { _context = context; }

        private async Task CheckAndCreateReportAsync(string entityType, int entityId, int reporterUserId, ReportForCreationDto reportDto, int? reportedUserId = null)
        {
            if (reportedUserId.HasValue && reportedUserId.Value == reporterUserId)
            {
                throw new InvalidOperationException("Kendi içeriğinizi veya profilinizi raporlayamazsınız.");
            }
            var existingReport = await _context.ContentReports.AnyAsync(r =>
                r.EntityType == entityType &&
                r.EntityId == entityId &&
                r.ReporterUserId == reporterUserId
            );
            if (existingReport)
            {
                throw new InvalidOperationException("Bu içeriği zaten raporladınız.");
            }

            var report = new ContentReport
            {
                EntityType = entityType,
                EntityId = entityId,
                ReporterUserId = reporterUserId,
                Reason = reportDto.Reason,
            };

            await _context.ContentReports.AddAsync(report);
        }

        public async Task ReportReviewAsync(int reviewId, int reporterUserId, ReportForCreationDto reportDto)
        {
            var review = await _context.Reviews.FindAsync(reviewId);
            if (review == null) throw new KeyNotFoundException("Raporlanacak yorum bulunamadı.");
            await CheckAndCreateReportAsync("Review", reviewId, reporterUserId, reportDto, review.UserId);

            await _context.SaveChangesAsync();
        }
        public async Task ReportUserAsync(int reportedUserId, int reporterUserId, ReportForCreationDto reportDto)
        {
            var user = await _context.Users.FindAsync(reportedUserId);
            if (user == null) throw new KeyNotFoundException("Raporlanacak kullanıcı bulunamadı.");

            await CheckAndCreateReportAsync("User", reportedUserId, reporterUserId, reportDto, reportedUserId);

            await _context.SaveChangesAsync();
        }
        public async Task ReportListAsync(int listId, int reporterUserId, ReportForCreationDto reportDto)
        {
            var list = await _context.UserLists.FindAsync(listId);
            if (list == null) throw new KeyNotFoundException("Raporlanacak liste bulunamadı.");

            await CheckAndCreateReportAsync("List", listId, reporterUserId, reportDto, list.UserId);

            await _context.SaveChangesAsync();
        }
        public async Task ReportCommentAsync(int commentId, int reporterUserId, ReportForCreationDto reportDto)
        {
            var comment = await _context.UserListComments.FindAsync(commentId);
            if (comment == null) throw new KeyNotFoundException("Raporlanacak liste yorumu bulunamadı.");

            await CheckAndCreateReportAsync("Comment", commentId, reporterUserId, reportDto, comment.UserId);

            await _context.SaveChangesAsync();
        }
        public async Task<IEnumerable<MyReportSummaryDto>> GetMyReportsAsync(int reporterUserId)
        {
            var reports = await _context.ContentReports
                .Where(r => r.ReporterUserId == reporterUserId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new MyReportSummaryDto
                {
                    Id = r.Id,
                    EntityType = r.EntityType,
                    EntityId = r.EntityId,
                    Reason = r.Reason,
                    Status = r.Status,
                    CreatedAt = r.CreatedAt,
                    AdminResponse = r.AdminResponse
                })
                .ToListAsync();

            return reports;
        }
    }
}