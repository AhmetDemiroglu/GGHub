using GGHub.Core.Entities;
using GGHub.Core.Specifications;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Persistence
{
    /// <summary>
    /// Profil ICERIGI (inceleme, liste, favoriler, aktivite, istatistik, takipci/takip listesi)
    /// icin TEK erisim kapisi.
    ///
    /// ProfileAccess.CanView yalnizca gorunurluk ayarina bakar ve engellemeyi bilmez.
    /// Engel kontrolu yalnizca ProfileService.GetProfileByUsernameAsync icinde duruyordu;
    /// bu yuzden profil kartinin kendisi maskeleniyor ama sekmeleri besleyen alti ayri uc
    /// (followers, following, reviews/user, user-lists/user, user-lists/user/favorites,
    /// activities/user, stats/user) engelleyen kullanicinin butun icerigini donduruyordu.
    ///
    /// Kural: engel iki yonlu keser (ben onu engellemissem de, o beni engellemisse de).
    /// Kisi kendi icerigini her zaman gorur.
    /// </summary>
    public static class ProfileContentAccess
    {
        public static async Task<bool> CanViewContentAsync(
            GGHubDbContext context,
            User targetUser,
            int? currentUserId)
        {
            if (targetUser.IsDeleted) return false;

            // Kendi profili: gorunurluk ve engel kontrolune girmeden gecer.
            if (currentUserId.HasValue && currentUserId.Value == targetUser.Id) return true;

            if (currentUserId.HasValue)
            {
                var isBlocked = await context.UserBlocks
                    .AsNoTracking()
                    .AnyAsync(b =>
                        (b.BlockerId == currentUserId.Value && b.BlockedId == targetUser.Id) ||
                        (b.BlockerId == targetUser.Id && b.BlockedId == currentUserId.Value));

                if (isBlocked) return false;
            }

            var isFollowing = currentUserId.HasValue &&
                await context.Follows
                    .AsNoTracking()
                    .AnyAsync(f => f.FollowerId == currentUserId.Value && f.FolloweeId == targetUser.Id);

            return ProfileAccess.CanView(targetUser.ProfileVisibility, targetUser.Id, currentUserId, isFollowing);
        }

        /// <summary>
        /// Kullaniciyi normalize edilmis kullanici adindan bulup kapiyi uygular.
        /// Erisim yoksa null doner; cagiran taraf bos sonuc dondurur.
        /// </summary>
        public static async Task<User?> GetViewableUserAsync(
            GGHubDbContext context,
            string username,
            int? currentUserId)
        {
            var user = await context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.UsernameNormalized == UsernameNormalizer.Normalize(username));

            if (user == null) return null;

            return await CanViewContentAsync(context, user, currentUserId) ? user : null;
        }
    }
}
