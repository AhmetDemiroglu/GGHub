using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;
using GGHub.Application.Interfaces;
using GGHub.Core.Enums;
using GGHub.Core.Specifications;
using GGHub.Infrastructure.Localization;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Services
{
    public class AdminService : IAdminService
    {
        private readonly GGHubDbContext _context;
        private readonly IAuditService _auditService;

        public AdminService(GGHubDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

        public async Task<PaginatedResult<AdminReportDto>> GetContentReportsAsync(ReportFilterParams filterParams)
        {
            var query = _context.ContentReports
                .AsNoTracking()
                .Include(r => r.ReporterUser)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(filterParams.SearchTerm))
            {
                var term = filterParams.SearchTerm.ToLower();
                query = query.Where(r => r.Reason.ToLower().Contains(term) ||
                                         r.ReporterUser.Username.ToLower().Contains(term));
            }

            if (filterParams.StatusFilter.HasValue)
            {
                query = query.Where(r => r.Status == filterParams.StatusFilter.Value);
            }

            if (!string.IsNullOrWhiteSpace(filterParams.EntityTypeFilter) && filterParams.EntityTypeFilter != "All")
            {
                query = query.Where(r => r.EntityType == filterParams.EntityTypeFilter);
            }

            if (filterParams.StartDate.HasValue)
            {
                query = query.Where(r => r.CreatedAt.Date >= filterParams.StartDate.Value.Date);
            }
            if (filterParams.EndDate.HasValue)
            {
                var endDate = filterParams.EndDate.Value.Date.AddDays(1).AddTicks(-1);
                query = query.Where(r => r.CreatedAt <= endDate);
            }

            bool isDesc = filterParams.SortDirection?.ToLower() == "desc";
            switch (filterParams.SortBy?.ToLower())
            {
                case "status":
                    query = isDesc ? query.OrderByDescending(r => r.Status) : query.OrderBy(r => r.Status);
                    break;
                case "createdat":
                default:
                    query = isDesc ? query.OrderByDescending(r => r.CreatedAt) : query.OrderBy(r => r.CreatedAt);
                    break;
            }

            var totalCount = await query.CountAsync();

            var reports = await query
                .Skip((filterParams.Page - 1) * filterParams.PageSize)
                .Take(filterParams.PageSize)
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

            return new PaginatedResult<AdminReportDto>
            {
                Items = reports,
                TotalCount = totalCount,
                Page = filterParams.Page,
                PageSize = filterParams.PageSize
            };
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
                throw new InvalidOperationException(AppText.Get("admin.cannotBanSelf"));
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
                throw new InvalidOperationException(AppText.Get("admin.cannotChangeOwnRole"));
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                return false;
            }

            if (dto.NewRole != "Admin" && dto.NewRole != "User")
            {
                throw new InvalidOperationException(AppText.Get("admin.invalidRole"));
            }

            user.Role = dto.NewRole;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        /// <summary>
        /// Kullanici adini admin olarak degistirir. Yeniden adlandirma BILEREK yalnizca admin
        /// yetkisinde; kullaniciya acik bir rename akisi yok.
        /// </summary>
        public async Task<bool> ChangeUsernameAsync(int userId, ChangeUsernameRequestDto dto, int adminUserId)
        {
            if (!UsernameNormalizer.IsValidFormat(dto.Username))
            {
                throw new InvalidOperationException(AppText.Get("admin.usernameInvalidFormat"));
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                return false;
            }

            var newUsername = dto.Username.Trim();
            var normalized = UsernameNormalizer.Normalize(newUsername);

            // Anahtar bos mu? IsValidFormat bunu zaten eler; yine de savunma amacli.
            if (normalized.Length == 0)
            {
                throw new InvalidOperationException(AppText.Get("admin.usernameInvalidFormat"));
            }

            // Normalize anahtar baskasinda mi? Kullanicinin kendisi haric bakiyoruz; boylece
            // admin yalnizca goruntuleme bicimini duzeltebilir ("ahmet" -> "Ahmet").
            var taken = await _context.Users
                .AnyAsync(u => u.Id != userId && u.UsernameNormalized == normalized);

            if (taken)
            {
                throw new InvalidOperationException(AppText.Get("admin.usernameAlreadyInUse"));
            }

            var oldUsername = user.Username;

            user.Username = newUsername;
            user.UsernameNormalized = normalized;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _auditService.LogAsync(adminUserId, "ChangeUsername", "User", userId,
                new { OldUsername = oldUsername, NewUsername = newUsername });

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
                    CreatedAt = r.CreatedAt,
                    RawgId = r.Game.RawgId,
                    Slug = r.Game.Slug
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
                    CreatedAt = r.CreatedAt,
                    RawgId = r.Game.RawgId,
                    Slug = r.Game.Slug
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

        /// <summary>
        /// Bir kullanicinin TUM gonderileri (yanit ve repost dahil).
        ///
        /// Gorunurluk filtresi BILEREK YOK: moderasyon paneli, kullanicinin
        /// "Sadece Ben" yaptigi gonderileri de gormek zorunda. Uc zaten Admin
        /// politikasi arkasinda.
        ///
        /// Metindeki tipli etiketler ("@[g:340]") moderatorun okuyabilecegi hale
        /// getiriliyor; ham token'a bakarak icerik degerlendirilemez.
        /// </summary>
        public async Task<IEnumerable<AdminPostSummaryDto>> GetPostsForUserAsync(int userId)
        {
            var posts = await _context.Posts
                .AsNoTracking()
                .Where(p => p.UserId == userId)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    p.Id,
                    p.Content,
                    p.CreatedAt,
                    p.LikeCount,
                    p.ReplyCount,
                    p.RepostCount,
                    p.ParentPostId,
                    p.RepostOfPostId,
                    ImageCount = p.Images.Count,
                    HasPoll = p.Poll != null
                })
                .ToListAsync();

            var parsed = posts
                .SelectMany(p => MentionTokens.Parse(p.Content))
                .ToList();

            var displays = await ResolveMentionDisplaysAsync(parsed);

            return posts.Select(p =>
            {
                var readable = RenderMentions(p.Content, displays);
                return new AdminPostSummaryDto
                {
                    Id = p.Id,
                    ContentPreview = readable != null && readable.Length > 100
                        ? readable.Substring(0, 100) + "..."
                        : readable,
                    FullContent = readable,
                    CreatedAt = p.CreatedAt,
                    LikeCount = p.LikeCount,
                    ReplyCount = p.ReplyCount,
                    RepostCount = p.RepostCount,
                    ImageCount = p.ImageCount,
                    HasPoll = p.HasPoll,
                    ParentPostId = p.ParentPostId,
                    RepostOfPostId = p.RepostOfPostId
                };
            });
        }

        /// <summary>
        /// Etiket hedeflerinin GORUNEN adlarini toplu cozer (kisi/oyun/liste
        /// icin tek'er sorgu). Gorunurluk suzgeci yok: admin gorunumu.
        /// </summary>
        private async Task<Dictionary<(MentionTargetType, int), string>> ResolveMentionDisplaysAsync(
            IReadOnlyList<MentionTokens.ParsedMention> parsed)
        {
            var map = new Dictionary<(MentionTargetType, int), string>();
            if (parsed.Count == 0) return map;

            var userIds = parsed.Where(m => m.Type == MentionTargetType.User).Select(m => m.TargetId).Distinct().ToList();
            var gameIds = parsed.Where(m => m.Type == MentionTargetType.Game).Select(m => m.TargetId).Distinct().ToList();
            var listIds = parsed.Where(m => m.Type == MentionTargetType.List).Select(m => m.TargetId).Distinct().ToList();

            if (userIds.Count > 0)
                foreach (var u in await _context.Users.AsNoTracking().Where(u => userIds.Contains(u.Id))
                             .Select(u => new { u.Id, u.Username }).ToListAsync())
                    map[(MentionTargetType.User, u.Id)] = u.Username;

            if (gameIds.Count > 0)
                foreach (var g in await _context.Games.AsNoTracking().Where(g => gameIds.Contains(g.Id))
                             .Select(g => new { g.Id, g.Name }).ToListAsync())
                    map[(MentionTargetType.Game, g.Id)] = g.Name;

            if (listIds.Count > 0)
                foreach (var l in await _context.UserLists.AsNoTracking().Where(l => listIds.Contains(l.Id))
                             .Select(l => new { l.Id, l.Name }).ToListAsync())
                    map[(MentionTargetType.List, l.Id)] = l.Name;

            return map;
        }

        /// <summary>Token'lari "@GorunenAd" ile degistirir; cozulemeyen "@?" olur.</summary>
        private static string? RenderMentions(
            string? content, IReadOnlyDictionary<(MentionTargetType, int), string> displays)
        {
            if (string.IsNullOrEmpty(content)) return content;

            var result = content;
            // Sondan basa: erken degisiklikler sonraki token'larin konumunu kaydirmasin.
            foreach (var mention in MentionTokens.Parse(content).OrderByDescending(m => m.Position))
            {
                var label = displays.TryGetValue((mention.Type, mention.TargetId), out var display)
                    ? "@" + display
                    : "@?";
                result = result.Remove(mention.Position, mention.Length).Insert(mention.Position, label);
            }

            return result;
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

        public async Task<AdminReportDetailDto?> GetReportDetailAsync(int reportId)
        {
            var report = await _context.ContentReports
                .Include(r => r.ReporterUser)
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == reportId);

            if (report == null) return null;

            var dto = new AdminReportDetailDto
            {
                Id = report.Id,
                EntityType = report.EntityType,
                EntityId = report.EntityId,
                Reason = report.Reason,
                Status = report.Status,
                ReportedAt = report.CreatedAt,
                AdminResponse = report.AdminResponse,
                ResolvedAt = report.ResolvedAt,
                ReporterId = report.ReporterUserId,
                ReporterUsername = report.ReporterUser.Username,
                ReporterProfileImage = report.ReporterUser.ProfileImageUrl
            };

            switch (report.EntityType)
            {
                case "Post":
                    var post = await _context.Posts
                        .Include(p => p.User)
                        .FirstOrDefaultAsync(p => p.Id == report.EntityId);
                    if (post != null)
                    {
                        // Etiketler moderatorun okuyabilecegi hale getirilir.
                        var postDisplays = await ResolveMentionDisplaysAsync(MentionTokens.Parse(post.Content));
                        dto.ReportedContent = RenderMentions(post.Content, postDisplays);
                        dto.ReportedEntityTitle = post.RepostOfPostId != null
                            ? "Yeniden Paylasim"
                            : (post.ParentPostId != null ? "Gonderi Yaniti" : "Gonderi");
                        dto.AccusedUserId = post.UserId;
                        dto.AccusedUsername = post.User.Username;
                        dto.AccusedProfileImage = post.User.ProfileImageUrl;
                    }
                    break;

                case "Review":
                    var review = await _context.Reviews
                        .Include(r => r.User).Include(r => r.Game)
                        .FirstOrDefaultAsync(r => r.Id == report.EntityId);
                    if (review != null)
                    {
                        dto.ReportedContent = review.Content; 
                        dto.ReportedEntityTitle = $"{review.Game.Name} İncelemesi";
                        dto.AccusedUserId = review.UserId;
                        dto.AccusedUsername = review.User.Username;
                        dto.AccusedProfileImage = review.User.ProfileImageUrl;
                    }
                    break;

                case "Comment":
                    var comment = await _context.UserListComments
                        .Include(c => c.User).Include(c => c.UserList) 
                        .FirstOrDefaultAsync(c => c.Id == report.EntityId);

                    if (comment != null)
                    {
                        dto.ReportedContent = comment.Content;
                        dto.ReportedEntityTitle = $"'{comment.UserList.Name}' Listesindeki Yorum";
                        dto.AccusedUserId = comment.UserId;
                        dto.AccusedUsername = comment.User.Username;
                        dto.AccusedProfileImage = comment.User.ProfileImageUrl;
                    }
                    break;

                case "ReviewComment":
                    var reviewComment = await _context.ReviewComments
                        .Include(c => c.User)
                        .Include(c => c.Review).ThenInclude(r => r.Game)
                        .FirstOrDefaultAsync(c => c.Id == report.EntityId);

                    if (reviewComment != null)
                    {
                        dto.ReportedContent = reviewComment.Content;
                        dto.ReportedEntityTitle = $"'{reviewComment.Review.Game.Name}' İncelemesindeki Yorum";
                        dto.AccusedUserId = reviewComment.UserId;
                        dto.AccusedUsername = reviewComment.User.Username;
                        dto.AccusedProfileImage = reviewComment.User.ProfileImageUrl;
                    }
                    break;

                case "List":
                    var list = await _context.UserLists
                        .Include(l => l.User)
                        .FirstOrDefaultAsync(l => l.Id == report.EntityId);
                    if (list != null)
                    {
                        dto.ReportedContent = list.Description ?? "Açıklama yok.";
                        dto.ReportedEntityTitle = list.Name;
                        dto.AccusedUserId = list.UserId;
                        dto.AccusedUsername = list.User.Username;
                        dto.AccusedProfileImage = list.User.ProfileImageUrl;
                    }
                    break;

                case "User":
                    var user = await _context.Users.FindAsync(report.EntityId);
                    if (user != null)
                    {
                        dto.ReportedContent = user.Bio ?? "Biyografi yok.";
                        dto.ReportedEntityTitle = "Kullanıcı Profili";
                        dto.AccusedUserId = user.Id;
                        dto.AccusedUsername = user.Username;
                        dto.AccusedProfileImage = user.ProfileImageUrl;
                    }
                    break;
            }

            return dto;
        }
        public async Task<bool> AddReportResponseAsync(int reportId, string response, int adminUserId)
        {
            var report = await _context.ContentReports.FindAsync(reportId);
            if (report == null) return false;

            report.AdminResponse = response;
            report.ResolvedByAdminId = adminUserId;

            report.Status = ReportStatus.Resolved;
            report.ResolvedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }
    }
}
