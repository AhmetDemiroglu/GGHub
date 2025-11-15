using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;
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
        public async Task<PaginatedResult<AdminUserSummaryDto>> GetUsersAsync(UserFilterParams filterParams)
        {
            var query = _context.Users
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(filterParams.SearchTerm))
            {
                var searchTermLower = filterParams.SearchTerm.ToLower();
                query = query.Where(u => u.Username.ToLower().Contains(searchTermLower) ||
                                         u.Email.ToLower().Contains(searchTermLower));
            }

            if (filterParams.StatusFilter?.ToLower() == "banned")
            {
                query = query.Where(u => u.IsBanned);
            }
            else if (filterParams.StatusFilter?.ToLower() == "active")
            {
                query = query.Where(u => !u.IsBanned);
            }

            bool isDescending = filterParams.SortDirection?.ToLower() == "desc";

            switch (filterParams.SortBy?.ToLower())
            {
                case "username":
                    query = isDescending ? query.OrderByDescending(u => u.Username) : query.OrderBy(u => u.Username);
                    break;
                case "email":
                    query = isDescending ? query.OrderByDescending(u => u.Email) : query.OrderBy(u => u.Email);
                    break;
                case "createdat":
                default:
                    query = isDescending ? query.OrderByDescending(u => u.CreatedAt) : query.OrderBy(u => u.CreatedAt);
                    break;
            }

            var totalCount = await query.CountAsync();

            var pagedQuery = query
                .Skip((filterParams.Page - 1) * filterParams.PageSize)
                .Take(filterParams.PageSize);

            var users = await pagedQuery.Select(u => new AdminUserSummaryDto
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                Role = u.Role,
                IsBanned = u.IsBanned,
                IsEmailVerified = u.IsEmailVerified,
                CreatedAt = u.CreatedAt
            }).ToListAsync();

            return new PaginatedResult<AdminUserSummaryDto>
            {
                Items = users,
                TotalCount = totalCount,
                Page = filterParams.Page,
                PageSize = filterParams.PageSize
            };
        }
        public async Task<AdminUserDetailsDto?> GetUserDetailsAsync(int userId)
        {
            var user = await _context.Users
                .AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => new AdminUserDetailsDto
                {
                    Id = u.Id,
                    Username = u.Username,
                    Email = u.Email,
                    Role = u.Role,
                    CreatedAt = u.CreatedAt,
                    UpdatedAt = u.UpdatedAt,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    Bio = u.Bio,
                    ProfileImageUrl = u.ProfileImageUrl,
                    DateOfBirth = u.DateOfBirth,
                    IsEmailVerified = u.IsEmailVerified,
                    IsBanned = u.IsBanned,
                    BannedAt = u.BannedAt,
                    BanReason = u.BanReason
                })
                .FirstOrDefaultAsync();

            return user;
        }
        public async Task<bool> BanUserAsync(int userId, BanUserRequestDto dto, int adminUserId)
        {
            if (userId == adminUserId)
            {
                throw new InvalidOperationException("Adminler kendilerini askıya alamaz.");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                return false;
            }

            user.IsBanned = true;
            user.BannedAt = DateTime.UtcNow;
            user.BanReason = dto.Reason;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UnbanUserAsync(int userId, int adminUserId)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null || !user.IsBanned)
            {
                return false;
            }

            user.IsBanned = false;
            user.BannedAt = null;
            user.BanReason = null;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ChangeUserRoleAsync(int userId, ChangeRoleRequestDto dto, int adminUserId)
        {
            if (userId == adminUserId)
            {
                throw new InvalidOperationException("Adminler kendi rollerini değiştiremez.");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                return false;
            }

            if (dto.NewRole != "Admin" && dto.NewRole != "User")
            {
                throw new InvalidOperationException("Geçersiz rol değeri. Rol 'Admin' veya 'User' olmalıdır.");
            }

            user.Role = dto.NewRole;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }


        public async Task<DashboardStatsDto> GetDashboardStatisticsAsync()
        {
            var totalUsers = await _context.Users.CountAsync();
            var bannedUsers = await _context.Users.CountAsync(u => u.IsBanned);
            var pendingReports = await _context.ContentReports.CountAsync(r => r.Status == Core.Enums.ReportStatus.Open);
            var totalLists = await _context.UserLists.CountAsync();
            var totalReviews = await _context.Reviews.CountAsync();

            var stats = new DashboardStatsDto
            {
                TotalUsers = totalUsers,
                BannedUsers = bannedUsers,
                PendingReports = pendingReports,
                TotalLists = totalLists,
                TotalReviews = totalReviews
            };

            return stats;
        }
    }
}