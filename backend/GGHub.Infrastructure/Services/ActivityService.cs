using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Services
{
    public class ActivityService : IActivityService
    {
        private readonly GGHubDbContext _context;

        public ActivityService(GGHubDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<ActivityDto>> GetUserActivityFeedAsync(string username, int limit = 20)
        {
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Username == username);

            if (user == null) return Enumerable.Empty<ActivityDto>();

            // 1. REVIEWS (Son X adet)
            var reviews = await _context.Reviews
                .AsNoTracking()
                .Where(r => r.UserId == user.Id)
                .Include(r => r.Game)
                .OrderByDescending(r => r.CreatedAt)
                .Take(limit)
                .Select(r => new ActivityDto
                {
                    Id = r.Id,
                    Type = ActivityType.Review,
                    OccurredAt = r.CreatedAt,
                    ReviewData = new ReviewActivityDto
                    {
                        ReviewId = r.Id,
                        Rating = r.Rating,
                        ContentSnippet = r.Content.Length > 100 ? r.Content.Substring(0, 100) + "..." : r.Content,
                        Game = new GameSummaryDto
                        {
                            Id = r.Game.Id,
                            Name = r.Game.Name,
                            Slug = r.Game.Slug,
                            CoverImage = r.Game.CoverImage,
                            BackgroundImage = r.Game.BackgroundImage,
                            Rating = r.Game.Rating
                        }
                    }
                })
                .ToListAsync();

            // 2. LISTS (Son X adet - Sadece Public veya Followers)
            var lists = await _context.UserLists
                .AsNoTracking()
                .Where(l => l.UserId == user.Id && l.Visibility != ListVisibilitySetting.Private)
                .Include(l => l.UserListGames).ThenInclude(ulg => ulg.Game)
                .OrderByDescending(l => l.CreatedAt)
                .Take(limit)
                .Select(l => new ActivityDto
                {
                    Id = l.Id,
                    Type = ActivityType.ListCreated,
                    OccurredAt = l.CreatedAt,
                    ListData = new ListActivityDto
                    {
                        ListId = l.Id,
                        Name = l.Name,
                        GameCount = l.UserListGames.Count,
                        PreviewImages = l.UserListGames.OrderBy(g => g.AddedAt).Take(3).Select(g => g.Game.BackgroundImage).ToList()
                    }
                })
                .ToListAsync();

            // 3. FOLLOWS (Son X adet)
            var follows = await _context.Follows
                .AsNoTracking()
                .Where(f => f.FollowerId == user.Id && !f.Followee.IsDeleted)
                .Include(f => f.Followee)
                .OrderByDescending(f => f.CreatedAt) 
                .Take(limit)
                .Select(f => new ActivityDto
                {
                    Id = f.FolloweeId,
                    Type = ActivityType.FollowUser,
                    OccurredAt = f.CreatedAt,
                    FollowData = new UserDto
                    {
                        Id = f.Followee.Id,
                        Username = f.Followee.Username,
                        ProfileImageUrl = f.Followee.ProfileImageUrl,
                        FirstName = f.Followee.FirstName,
                        LastName = f.Followee.LastName
                    }
                })
                .ToListAsync();

            // 4. MERGE & SORT
            var feed = reviews
                .Concat(lists)
                .Concat(follows)
                .OrderByDescending(a => a.OccurredAt)
                .Take(limit)
                .ToList();

            return feed;
        }
    }
}