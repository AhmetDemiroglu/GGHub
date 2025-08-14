using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Services
{
    public class AdminService : IAdminService
    {
        private readonly GGHubDbContext _context;

        public AdminService(GGHubDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<AdminReportDto>> GetContentReportsAsync()
        {
            var reports = await _context.ContentReports
                .Include(r => r.ReporterUser) 
                .OrderBy(r => r.Status) 
                .ThenByDescending(r => r.CreatedAt) 
                .Select(r => new AdminReportDto
                {
                    ReportId = r.Id,
                    EntityType = r.EntityType,
                    EntityId = r.EntityId,
                    Reason = r.Reason,
                    Status = r.Status,
                    ReportedAt = r.CreatedAt,
                    ReporterId = r.ReporterUserId,
                    ReporterUsername = r.ReporterUser.Username
                })
                .ToListAsync();

            return reports;
        }
        public async Task<bool> UpdateReportStatusAsync(int reportId, ReportStatus newStatus)
        {
            var report = await _context.ContentReports.FindAsync(reportId);

            if (report == null)
            {
                return false;
            }

            report.Status = newStatus;

            if (newStatus == ReportStatus.Resolved || newStatus == ReportStatus.Ignored)
            {
                report.ResolvedAt = DateTime.UtcNow;
            }
            else
            {
                report.ResolvedAt = null;
            }

            await _context.SaveChangesAsync();
            return true;
        }
    }
}