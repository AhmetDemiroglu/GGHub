using GGHub.Core.Enums;

namespace GGHub.Core.Specifications
{
    /// <summary>
    /// Profil görünürlük kuralının TEK kaynağı.
    ///
    /// Bu kural daha önce altı ayrı serviste kopyala-yapıştır duruyordu
    /// (ProfileService, SocialService x2, ActivityService, SearchService, UserSuggestionService)
    /// ve UserSuggestionService kopyası sapmıştı: "Followers + zaten takip ediyorum" halini
    /// atlayıp erişilebilir bir profili erişilemez işaretliyordu.
    ///
    /// EF sorgusu ICINDE filtre gerekiyorsa Infrastructure'daki UserQueryExtensions.WhereVisibleTo
    /// kullanılir; bu kural bellek icindeki kontroller icindir.
    /// </summary>
    public static class ProfileAccess
    {
        public static bool CanView(
            ProfileVisibilitySetting visibility,
            int profileUserId,
            int? currentUserId,
            bool currentUserFollows)
        {
            if (visibility == ProfileVisibilitySetting.Public) return true;
            if (currentUserId.HasValue && profileUserId == currentUserId.Value) return true;
            if (visibility == ProfileVisibilitySetting.Followers) return currentUserFollows;
            return false;
        }
    }
}
