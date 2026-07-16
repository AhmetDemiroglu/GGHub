using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Enums;
using GGHub.Core.Specifications;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Services
{
    public class ActivityService : IActivityService
    {
        private readonly GGHubDbContext _context;
        private readonly IUserDtoEnricher _userDtoEnricher;

        public ActivityService(GGHubDbContext context, IUserDtoEnricher userDtoEnricher)
        {
            _context = context;
            _userDtoEnricher = userDtoEnricher;
        }

        /// <summary>
        /// Bir aktivite kartinda okuyucuya bagli alani olan tum UserDto'lari duzlestirir.
        /// Enricher sayfa basina tek batch calissin diye.
        /// </summary>
        private static IEnumerable<UserDto?> CollectUsers(IEnumerable<ActivityDto> activities)
        {
            foreach (var activity in activities)
            {
                yield return activity.Actor;
                yield return activity.FollowData;
            }
        }

        public async Task<IEnumerable<ActivityDto>> GetUserActivityFeedAsync(string username, int? currentUserId = null, int limit = 20)
        {
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UsernameNormalized == UsernameNormalizer.Normalize(username));

            if (user == null || user.IsDeleted) return Enumerable.Empty<ActivityDto>();

            var isOwner = currentUserId == user.Id;
            var isFollowing = currentUserId.HasValue &&
                              await _context.Follows.AnyAsync(f => f.FollowerId == currentUserId.Value && f.FolloweeId == user.Id);

            if (!ProfileAccess.CanView(user.ProfileVisibility, user.Id, currentUserId, isFollowing))
            {
                return Enumerable.Empty<ActivityDto>();
            }

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

            // 2. LISTS  
            var lists = await _context.UserLists
                .AsNoTracking()
                .Where(l => l.UserId == user.Id)
                .Where(l =>
                    isOwner ||
                    l.Visibility == ListVisibilitySetting.Public ||
                    (l.Visibility == ListVisibilitySetting.Followers && isFollowing))
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

            // 3. FOLLOWS  
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

            // Yalnizca donen sayfa zenginlestirilir; Take'ten once cagirmak bosa is olurdu.
            await _userDtoEnricher.EnrichAsync(CollectUsers(feed), currentUserId);

            return feed;
        }
        public async Task<IEnumerable<ActivityDto>> GetPersonalizedFeedAsync(int currentUserId, int limit = 20, DateTime? cursor = null)
        {
            if (limit <= 0) limit = 20;
            if (limit > 50) limit = 50;

            // Npgsql timestamptz için UTC Kind zorunlu; query-string binding Local/Unspecified verebilir.
            if (cursor.HasValue && cursor.Value.Kind != DateTimeKind.Utc)
            {
                cursor = cursor.Value.Kind == DateTimeKind.Local
                    ? cursor.Value.ToUniversalTime()
                    : DateTime.SpecifyKind(cursor.Value, DateTimeKind.Utc);
            }

            var followingIds = await _context.Follows
                .AsNoTracking()
                .Where(f => f.FollowerId == currentUserId)
                .Select(f => f.FolloweeId)
                .ToListAsync();

            if (!followingIds.Any()) return Enumerable.Empty<ActivityDto>();

            // Engel listesi (iki yönlü): takip kartlarının hedefi engelli kullanıcı olabilir.
            var blockedIds = await _context.UserBlocks
                .AsNoTracking()
                .Where(b => b.BlockerId == currentUserId || b.BlockedId == currentUserId)
                .Select(b => b.BlockerId == currentUserId ? b.BlockedId : b.BlockerId)
                .ToListAsync();
            var blockedSet = blockedIds.ToHashSet();

            // Karşılıklı takip (affinity sinyali): beni de takip eden takip ettiklerim.
            var mutualIds = (await _context.Follows
                .AsNoTracking()
                .Where(f => f.FolloweeId == currentUserId && followingIds.Contains(f.FollowerId))
                .Select(f => f.FollowerId)
                .ToListAsync()).ToHashSet();

            var candidates = new List<(ActivityDto Dto, int Engagement)>();

            var reviewsQuery = _context.Reviews
                .AsNoTracking()
                .Where(r => followingIds.Contains(r.UserId) && !r.User.IsDeleted && !r.User.IsBanned);
            if (cursor.HasValue) reviewsQuery = reviewsQuery.Where(r => r.CreatedAt < cursor.Value);

            var reviews = await reviewsQuery
                .OrderByDescending(r => r.CreatedAt)
                .Take(limit)
                .Select(r => new
                {
                    Dto = new ActivityDto
                    {
                        Id = r.Id,
                        Type = ActivityType.Review,
                        OccurredAt = r.CreatedAt,
                        Actor = new UserDto
                        {
                            Id = r.User.Id,
                            Username = r.User.Username,
                            ProfileImageUrl = r.User.ProfileImageUrl,
                            FirstName = r.User.FirstName,
                            LastName = r.User.LastName
                        },
                        ReviewData = new ReviewActivityDto
                        {
                            ReviewId = r.Id,
                            Rating = r.Rating,
                            ContentSnippet = r.Content.Length > 100 ? r.Content.Substring(0, 100) + "..." : r.Content,
                            Game = new GameSummaryDto
                            {
                                Id = r.Game.Id,
                                RawgId = r.Game.RawgId,
                                Name = r.Game.Name,
                                Slug = r.Game.Slug,
                                CoverImage = r.Game.CoverImage,
                                BackgroundImage = r.Game.BackgroundImage,
                                Released = r.Game.Released
                            }
                        }
                    },
                    Engagement = r.ReviewVotes.Count
                })
                .ToListAsync();
            candidates.AddRange(reviews.Select(r => (r.Dto, r.Engagement)));

            var listsQuery = _context.UserLists
                .AsNoTracking()
                .Where(l => followingIds.Contains(l.UserId) && !l.User.IsDeleted && !l.User.IsBanned &&
                           (l.Visibility == ListVisibilitySetting.Public || l.Visibility == ListVisibilitySetting.Followers));
            if (cursor.HasValue) listsQuery = listsQuery.Where(l => l.CreatedAt < cursor.Value);

            var lists = await listsQuery
                .OrderByDescending(l => l.CreatedAt)
                .Take(limit)
                .Select(l => new
                {
                    Dto = new ActivityDto
                    {
                        Id = l.Id,
                        Type = ActivityType.ListCreated,
                        OccurredAt = l.CreatedAt,
                        Actor = new UserDto
                        {
                            Id = l.User.Id,
                            Username = l.User.Username,
                            ProfileImageUrl = l.User.ProfileImageUrl,
                            FirstName = l.User.FirstName,
                            LastName = l.User.LastName
                        },
                        ListData = new ListActivityDto
                        {
                            ListId = l.Id,
                            Name = l.Name,
                            GameCount = l.UserListGames.Count,
                            PreviewImages = l.UserListGames
                                             .OrderBy(ulg => ulg.AddedAt)
                                             .Take(3)
                                             .Select(ulg => ulg.Game.CoverImage)
                                             .ToList()
                        }
                    },
                    Engagement = l.RatingCount + l.Followers.Count + l.Comments.Count
                })
                .ToListAsync();
            candidates.AddRange(lists.Select(l => (l.Dto, l.Engagement)));

            var followsQuery = _context.Follows
                .AsNoTracking()
                .Where(f => followingIds.Contains(f.FollowerId) &&
                            !f.Follower.IsDeleted && !f.Follower.IsBanned &&
                            !f.Followee.IsDeleted && !f.Followee.IsBanned);
            if (cursor.HasValue) followsQuery = followsQuery.Where(f => f.CreatedAt < cursor.Value);

            var followDtos = await followsQuery
                .OrderByDescending(f => f.CreatedAt)
                .Take(limit)
                .Select(f => new ActivityDto
                {
                    Id = 0,
                    Type = ActivityType.FollowUser,
                    OccurredAt = f.CreatedAt,
                    Actor = new UserDto
                    {
                        Id = f.Follower.Id,
                        Username = f.Follower.Username,
                        ProfileImageUrl = f.Follower.ProfileImageUrl,
                        FirstName = f.Follower.FirstName,
                        LastName = f.Follower.LastName
                    },
                    FollowData = new UserDto
                    {
                        Id = f.FolloweeId,
                        Username = f.Followee.Username,
                        ProfileImageUrl = f.Followee.ProfileImageUrl,
                        FirstName = f.Followee.FirstName,
                        LastName = f.Followee.LastName
                    }
                })
                .ToListAsync();
            candidates.AddRange(followDtos
                .Where(f => f.FollowData == null || !blockedSet.Contains(f.FollowData.Id))
                .Select(f => (f, 0)));

            // Sayfa = cursor sonrası kronolojik ilk `limit` kayıt (cursor tutarlılığı için).
            // Sıralama = sayfa içinde skorlamalı (recency decay x tip ağırlığı + engagement + affinity).
            var page = candidates
                .OrderByDescending(c => c.Dto.OccurredAt)
                .Take(limit)
                .ToList();

            var now = DateTime.UtcNow;
            var scored = page
                .Select(c => (c.Dto, Score: ComputeFeedScore(c.Dto, c.Engagement, now, mutualIds)))
                .OrderByDescending(x => x.Score)
                .ToList();

            // Yazar çeşitliliği: aynı kullanıcının ardışık kartları sayfayı domine etmesin.
            var actorSeen = new Dictionary<int, int>();
            var reranked = scored
                .Select(x =>
                {
                    var actorId = x.Dto.Actor?.Id ?? 0;
                    actorSeen.TryGetValue(actorId, out var n);
                    actorSeen[actorId] = n + 1;
                    return (x.Dto, Score: x.Score * Math.Pow(0.85, n));
                })
                .OrderByDescending(x => x.Score)
                .Select(x => x.Dto)
                .ToList();

            await _userDtoEnricher.EnrichAsync(CollectUsers(reranked), currentUserId);

            return reranked;
        }

        private static double ComputeFeedScore(ActivityDto activity, int engagement, DateTime now, HashSet<int> mutualIds)
        {
            var hours = Math.Max(0, (now - activity.OccurredAt).TotalHours);
            var recency = Math.Exp(-hours / 36.0);

            var typeWeight = activity.Type switch
            {
                ActivityType.Review => 1.0,
                ActivityType.ListCreated => 0.92,
                ActivityType.FollowUser => 0.55,
                _ => 0.5
            };

            var engagementBoost = Math.Log10(1 + Math.Min(engagement, 50)) * 0.15;
            var affinityBoost = activity.Actor != null && mutualIds.Contains(activity.Actor.Id) ? 0.10 : 0.0;

            return recency * typeWeight + engagementBoost + affinityBoost;
        }
    }
}
