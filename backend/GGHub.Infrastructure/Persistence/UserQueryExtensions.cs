using GGHub.Core.Entities;
using GGHub.Core.Enums;

namespace GGHub.Infrastructure.Persistence
{
    /// <summary>
    /// ProfileAccess kuralının EF'e çevrilebilen hali. Bellek içi kontrol için
    /// GGHub.Core.Specifications.ProfileAccess.CanView kullanılır; kural SQL'e inmek
    /// zorunda olduğunda (arama, etiketleme adayları) buradaki predicate kullanılır.
    /// </summary>
    public static class UserQueryExtensions
    {
        /// <summary>
        /// Yalnızca currentUserId'nin görebildiği profilleri bırakır.
        /// Public, kendisi, veya "Followers" olup currentUserId'nin takip ettikleri.
        /// </summary>
        public static IQueryable<User> WhereVisibleTo(
            this IQueryable<User> users,
            GGHubDbContext context,
            int? currentUserId)
        {
            return users.Where(u =>
                u.ProfileVisibility == ProfileVisibilitySetting.Public ||
                u.Id == currentUserId ||
                (u.ProfileVisibility == ProfileVisibilitySetting.Followers &&
                 currentUserId != null &&
                 context.Follows.Any(f => f.FolloweeId == u.Id && f.FollowerId == currentUserId)));
        }

        /// <summary>
        /// İki yönlü engelleme filtresi: currentUserId'nin engellediği ve onu engelleyenleri eler.
        /// </summary>
        public static IQueryable<User> WhereNotBlockedWith(
            this IQueryable<User> users,
            GGHubDbContext context,
            int currentUserId)
        {
            return users.Where(u => !context.UserBlocks.Any(b =>
                (b.BlockerId == currentUserId && b.BlockedId == u.Id) ||
                (b.BlockerId == u.Id && b.BlockedId == currentUserId)));
        }
    }
}
