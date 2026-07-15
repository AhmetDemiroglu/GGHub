using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// "Tanıyor olabileceğin kişiler" önerileri.
    /// X'in who-to-follow hattına benzer şekilde çalışır:
    /// aday kaynakları (friends-of-friends, zevk benzerliği, seni takip edenler, popülerlik)
    /// -> ağırlıklı skorlama -> filtreler (engel, gizlilik, ban) -> top-N.
    /// </summary>
    public class UserSuggestionService : IUserSuggestionService
    {
        private readonly GGHubDbContext _context;
        private readonly IMemoryCache _cache;

        private const int CandidatePoolPerSource = 60;
        private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(10);

        public UserSuggestionService(GGHubDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        private static string CacheKey(int userId) => $"user-suggestions:{userId}";

        public void InvalidateSuggestions(int userId) => _cache.Remove(CacheKey(userId));

        public async Task<IEnumerable<SuggestedUserDto>> GetSuggestedUsersAsync(int currentUserId, int limit = 10)
        {
            if (limit <= 0) limit = 10;
            if (limit > 30) limit = 30;

            var all = await _cache.GetOrCreateAsync(CacheKey(currentUserId), async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = CacheTtl;
                return await BuildSuggestionsAsync(currentUserId);
            });

            return all!.Take(limit);
        }

        private async Task<List<SuggestedUserDto>> BuildSuggestionsAsync(int currentUserId)
        {
            var followingIds = (await _context.Follows
                .AsNoTracking()
                .Where(f => f.FollowerId == currentUserId)
                .Select(f => f.FolloweeId)
                .ToListAsync()).ToHashSet();

            var followerIds = (await _context.Follows
                .AsNoTracking()
                .Where(f => f.FolloweeId == currentUserId)
                .Select(f => f.FollowerId)
                .ToListAsync()).ToHashSet();

            var blockedIds = (await _context.UserBlocks
                .AsNoTracking()
                .Where(b => b.BlockerId == currentUserId || b.BlockedId == currentUserId)
                .Select(b => b.BlockerId == currentUserId ? b.BlockedId : b.BlockerId)
                .ToListAsync()).ToHashSet();

            bool IsExcluded(int userId) =>
                userId == currentUserId || followingIds.Contains(userId) || blockedIds.Contains(userId);

            // --- Kaynak 1: Friends-of-friends (takip ettiklerimin takip ettikleri) ---
            var mutualCounts = new Dictionary<int, int>();
            if (followingIds.Count > 0)
            {
                var fof = await _context.Follows
                    .AsNoTracking()
                    .Where(f => followingIds.Contains(f.FollowerId) &&
                                f.FolloweeId != currentUserId &&
                                !followingIds.Contains(f.FolloweeId))
                    .GroupBy(f => f.FolloweeId)
                    .Select(g => new { UserId = g.Key, Count = g.Count() })
                    .OrderByDescending(x => x.Count)
                    .Take(CandidatePoolPerSource)
                    .ToListAsync();

                foreach (var x in fof)
                    mutualCounts[x.UserId] = x.Count;
            }

            // --- Kaynak 2: Zevk benzerliği (aynı oyunları değerlendiren / listeleyenler) ---
            var myGameIds = (await _context.Reviews
                .AsNoTracking()
                .Where(r => r.UserId == currentUserId)
                .Select(r => r.GameId)
                .Union(_context.UserListGames
                    .Where(ulg => ulg.UserList.UserId == currentUserId)
                    .Select(ulg => ulg.GameId))
                .ToListAsync()).ToHashSet();

            var sharedGameCounts = new Dictionary<int, int>();
            if (myGameIds.Count > 0)
            {
                var tasteReviews = await _context.Reviews
                    .AsNoTracking()
                    .Where(r => myGameIds.Contains(r.GameId) && r.UserId != currentUserId)
                    .GroupBy(r => r.UserId)
                    .Select(g => new { UserId = g.Key, Count = g.Select(r => r.GameId).Distinct().Count() })
                    .OrderByDescending(x => x.Count)
                    .Take(CandidatePoolPerSource)
                    .ToListAsync();

                foreach (var x in tasteReviews)
                    sharedGameCounts[x.UserId] = x.Count;
            }

            // --- Kaynak 3: Beni takip edenler (henüz geri takip etmediklerim) ---
            var followsYouIds = followerIds.Where(id => !IsExcluded(id)).ToHashSet();

            // Aday havuzu
            var candidateIds = mutualCounts.Keys
                .Concat(sharedGameCounts.Keys)
                .Concat(followsYouIds)
                .Where(id => !IsExcluded(id))
                .Distinct()
                .ToList();

            // --- Kaynak 4 (fallback): platform genelinde en çok takip edilenler (cold start) ---
            if (candidateIds.Count < 15)
            {
                var excluded = candidateIds.ToHashSet();
                var popular = await _context.Follows
                    .AsNoTracking()
                    .GroupBy(f => f.FolloweeId)
                    .Select(g => new { UserId = g.Key, Count = g.Count() })
                    .OrderByDescending(x => x.Count)
                    .Take(CandidatePoolPerSource)
                    .ToListAsync();

                candidateIds.AddRange(popular
                    .Where(x => !IsExcluded(x.UserId) && !excluded.Contains(x.UserId))
                    .Select(x => x.UserId));
            }

            if (candidateIds.Count == 0) return new List<SuggestedUserDto>();

            // Aday kullanıcı kayıtları + takipçi sayıları (tek batch)
            var users = await _context.Users
                .AsNoTracking()
                .Where(u => candidateIds.Contains(u.Id) &&
                            !u.IsDeleted && !u.IsBanned &&
                            u.ProfileVisibility != ProfileVisibilitySetting.Private)
                .Select(u => new
                {
                    u.Id,
                    u.Username,
                    u.ProfileImageUrl,
                    u.FirstName,
                    u.LastName,
                    u.ProfileVisibility,
                    FollowerCount = u.Followers.Count
                })
                .ToListAsync();

            var suggestions = users
                .Select(u =>
                {
                    var mutual = mutualCounts.GetValueOrDefault(u.Id);
                    var shared = sharedGameCounts.GetValueOrDefault(u.Id);
                    var followsYou = followsYouIds.Contains(u.Id);

                    var score = mutual * 3.0
                              + shared * 2.0
                              + (followsYou ? 2.5 : 0.0)
                              + Math.Log10(u.FollowerCount + 1) * 0.5;

                    var reason = mutual > 0 && mutual * 3.0 >= shared * 2.0 ? "mutual"
                               : shared > 0 ? "taste"
                               : followsYou ? "follows_you"
                               : "popular";

                    return new
                    {
                        Score = score,
                        Dto = new SuggestedUserDto
                        {
                            Id = u.Id,
                            Username = u.Username,
                            ProfileImageUrl = u.ProfileImageUrl,
                            FirstName = u.FirstName,
                            LastName = u.LastName,
                            IsFollowing = false,
                            IsProfileAccessible = u.ProfileVisibility == ProfileVisibilitySetting.Public,
                            MutualFollowerCount = mutual,
                            SharedGameCount = shared,
                            FollowsYou = followsYou,
                            FollowerCount = u.FollowerCount,
                            Reason = reason
                        }
                    };
                })
                .OrderByDescending(x => x.Score)
                .ThenByDescending(x => x.Dto.FollowerCount)
                .Select(x => x.Dto)
                .Take(30)
                .ToList();

            return suggestions;
        }
    }
}
