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
                .AsQueryable()
                .Where(u => !u.IsDeleted);

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

            if (filterParams.StartDate.HasValue)
            {
                query = query.Where(u => u.CreatedAt.Date >= filterParams.StartDate.Value.Date);
            }
            if (filterParams.EndDate.HasValue)
            {
                var endDate = filterParams.EndDate.Value.Date.AddDays(1).AddTicks(-1);
                query = query.Where(u => u.CreatedAt <= endDate);
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
                CreatedAt = u.CreatedAt,
                ProfileImageUrl = u.ProfileImageUrl
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
        public async Task<IEnumerable<AdminUserSummaryDto>> GetRecentUsersAsync(int count = 5)
        {
            var users = await _context.Users
                .AsNoTracking()
                .Where(u => !u.IsDeleted)
                .OrderByDescending(u => u.CreatedAt)
                .Take(count)
                .Select(u => new AdminUserSummaryDto
                {
                    Id = u.Id,
                    Username = u.Username,
                    Email = u.Email,
                    Role = u.Role,
                    IsBanned = u.IsBanned,
                    IsEmailVerified = u.IsEmailVerified,
                    CreatedAt = u.CreatedAt,
                    ProfileImageUrl = u.ProfileImageUrl
                })
                .ToListAsync();

            return users;
        }

        public async Task<IEnumerable<RecentReviewDto>> GetRecentReviewsAsync(int count = 5)
        {
            var reviews = await _context.Reviews
                .AsNoTracking()
                .Include(r => r.User) 
                .Include(r => r.Game) 
                .OrderByDescending(r => r.CreatedAt)
                .Take(count)
                .Select(r => new RecentReviewDto
                {
                    Id = r.Id,
                    Username = r.User.Username,
                    UserProfileImageUrl = r.User.ProfileImageUrl,
                    GameName = r.Game.Name,
                    GameId = r.GameId,
                    Rating = r.Rating,
                    CreatedAt = r.CreatedAt
                })
                .ToListAsync();

            return reviews;
        }

        public async Task<IEnumerable<AdminUserListSummaryDto>> GetListsForUserAsync(int userId)
        {
            var lists = await _context.UserLists
                .AsNoTracking()
                .Where(l => l.UserId == userId && !l.User.IsDeleted)
                .OrderByDescending(l => l.UpdatedAt)
                .Select(l => new AdminUserListSummaryDto
                {
                    Id = l.Id,
                    Name = l.Name,
                    Visibility = l.Visibility,
                    FollowerCount = l.Followers.Count(),
                    GameCount = l.UserListGames.Count(),
                    AverageRating = l.AverageRating,
                    CreatedAt = l.CreatedAt
                })
                .ToListAsync();

            return lists;
        }

        public async Task<IEnumerable<AdminReviewSummaryDto>> GetReviewsForUserAsync(int userId)
        {
            var reviews = await _context.Reviews
                .AsNoTracking()
                .Include(r => r.Game) 
                .Where(r => r.UserId == userId && !r.User.IsDeleted)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new AdminReviewSummaryDto
                {
                    Id = r.Id,
                    GameName = r.Game.Name,
                    GameId = r.GameId,
                    Rating = r.Rating,
                    Content = r.Content.Length > 100 ? r.Content.Substring(0, 100) + "..." : r.Content,
                    CreatedAt = r.CreatedAt
                })
                .ToListAsync();

            return reviews;
        }

        public async Task<IEnumerable<AdminCommentSummaryDto>> GetCommentsForUserAsync(int userId)
        {
            var comments = await _context.UserListComments
                .AsNoTracking()
                .Include(c => c.UserList) 
                .Where(c => c.UserId == userId && !c.User.IsDeleted) 
                .OrderByDescending(c => c.CreatedAt)
                .Select(c => new AdminCommentSummaryDto
                {
                    Id = c.Id,
                    ListName = c.UserList.Name,
                    ListId = c.UserListId,
                    ContentPreview = c.Content.Length > 100 ? c.Content.Substring(0, 100) + "..." : c.Content,
                    FullContent = c.Content,
                    Visibility = c.UserList.Visibility,
                    CreatedAt = c.CreatedAt
                })
                .ToListAsync();

            return comments;
        }

        public async Task<IEnumerable<AdminUserReportSummaryDto>> GetReportsMadeByUserAsync(int userId)
        {
            var reports = await _context.ContentReports
                .AsNoTracking()
                .Where(r => r.ReporterUserId == userId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new AdminUserReportSummaryDto
                {
                    ReportId = r.Id,
                    EntityType = r.EntityType,
                    EntityId = r.EntityId,
                    Reason = r.Reason,
                    Status = r.Status,
                    ReportedAt = r.CreatedAt
                })
                .ToListAsync();

            return reports;
        }
    }
}