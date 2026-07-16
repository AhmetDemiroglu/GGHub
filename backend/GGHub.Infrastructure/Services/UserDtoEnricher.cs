using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Specifications;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Services
{
    /// <inheritdoc />
    public class UserDtoEnricher : IUserDtoEnricher
    {
        private readonly GGHubDbContext _context;

        public UserDtoEnricher(GGHubDbContext context)
        {
            _context = context;
        }

        public Task EnrichAsync(UserDto? user, int? currentUserId)
            => EnrichAsync(new[] { user }, currentUserId);

        public async Task EnrichAsync(IEnumerable<UserDto?> users, int? currentUserId)
        {
            var targets = users.Where(u => u is not null).Select(u => u!).ToList();
            if (targets.Count == 0) return;

            var ids = targets.Select(u => u.Id).Distinct().ToList();

            // Iki batch sorgu: gorunurluk ayarlari + current user'in bu kume icinde takip ettikleri.
            // IsFollowing ve IsProfileAccessible'in ikisi de bu tek takip kumesinden turer.
            var visibilities = await _context.Users
                .AsNoTracking()
                .Where(u => ids.Contains(u.Id))
                .Select(u => new { u.Id, u.ProfileVisibility })
                .ToDictionaryAsync(x => x.Id, x => x.ProfileVisibility);

            var followingIds = currentUserId.HasValue
                ? (await _context.Follows
                    .AsNoTracking()
                    .Where(f => f.FollowerId == currentUserId.Value && ids.Contains(f.FolloweeId))
                    .Select(f => f.FolloweeId)
                    .ToListAsync()).ToHashSet()
                : new HashSet<int>();

            foreach (var user in targets)
            {
                var follows = followingIds.Contains(user.Id);
                user.IsFollowing = follows;

                // Kullanici bulunamadiysa (silinmis) erisilebilir sayma.
                user.IsProfileAccessible = visibilities.TryGetValue(user.Id, out var visibility)
                    && ProfileAccess.CanView(visibility, user.Id, currentUserId, follows);
            }
        }
    }
}
