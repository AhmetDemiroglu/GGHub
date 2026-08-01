using GGHub.Core.Entities;
using GGHub.Core.Enums;

namespace GGHub.Core.Specifications
{
    /// <summary>
    /// Gonderi gorunurluk ve yanit izni kuralinin TEK kaynagi.
    ///
    /// ProfileAccess ile ayni sozlesme: bu sinif bellek icindeki tekil kontroller
    /// icindir, EF sorgusu ICINDE filtre gerekiyorsa
    /// Infrastructure/Persistence/PostQueryExtensions.WhereVisibleTo kullanilir.
    /// Iki taraf ayni kurali anlatmak zorunda; birinde degisiklik yapan digerini
    /// de degistirmeli (ProfileAccess'in basina gelen sapma tekrarlanmasin).
    ///
    /// DIKKAT: burasi ENGELLEMEYI BILMEZ. Engel kontrolu cagiran tarafta
    /// (ProfileContentAccess.CanViewContentAsync ya da EF filtresi) yapilir.
    /// </summary>
    public static class PostAccess
    {
        /// <summary>
        /// Gonderiyi goruntuleme kurali. Iki kapi BIRLIKTE gecilmeli:
        /// yazarin gonderi gorunurlugu VE profil gorunurlugu.
        ///
        /// Bileske kural neden sart: profili Private olan birinin
        /// PostVisibility = Everyone gonderisi aksi halde sizardi. Profilini
        /// gizleyen kullanici gonderi ayarina hic dokunmamis olabilir; varsayilan
        /// Everyone oldugu icin bu tam olarak beklenen senaryo.
        /// </summary>
        public static bool CanView(
            PostVisibilitySetting postVisibility,
            ProfileVisibilitySetting profileVisibility,
            int authorId,
            int? currentUserId,
            bool currentUserFollowsAuthor)
        {
            // Kendi gonderisi her zaman gorunur (Private dahil).
            if (currentUserId.HasValue && currentUserId.Value == authorId) return true;

            if (!ProfileAccess.CanView(profileVisibility, authorId, currentUserId, currentUserFollowsAuthor))
                return false;

            return postVisibility switch
            {
                PostVisibilitySetting.Everyone => true,
                PostVisibilitySetting.Followers => currentUserFollowsAuthor,
                _ => false // Private: yalnizca sahibi, o da yukarida donduruldu.
            };
        }

        /// <inheritdoc cref="CanView(PostVisibilitySetting, ProfileVisibilitySetting, int, int?, bool)"/>
        public static bool CanView(User author, int? currentUserId, bool currentUserFollowsAuthor)
        {
            if (author.IsDeleted || author.IsBanned)
            {
                // Kendi icerigini banli kullanici da gorebilir (hesap ekraninda),
                // ama baskasina gosterilmez.
                if (!currentUserId.HasValue || currentUserId.Value != author.Id) return false;
            }

            return CanView(
                author.PostVisibility,
                author.ProfileVisibility,
                author.Id,
                currentUserId,
                currentUserFollowsAuthor);
        }

        /// <summary>
        /// Yanit yazma kurali. Gorme izni ON KOSUL; goremedigin gonderiyi
        /// yanitlayamazsin, bu yuzden cagiran once CanView'i gecirmeli.
        ///
        /// Iki takip yonu AYRI parametre: Followers = "yazar beni takip
        /// edenlere acti" (viewerFollowsAuthor), Following = "yazar kendi
        /// takip ettiklerine acti" (authorFollowsViewer). Isimler benzediginden
        /// tek bir bool ile sessizce ters cevrilmesi cok kolay.
        /// </summary>
        public static bool CanReply(
            PostReplyPermissionSetting permission,
            int authorId,
            int? currentUserId,
            bool viewerFollowsAuthor,
            bool authorFollowsViewer)
        {
            if (!currentUserId.HasValue) return false;

            // Kendi gonderisine her zaman yanit yazabilir (Nobody dahil):
            // ayar baskalarini kisitlamak icin, kendi ipligini surdurmesini
            // engellemek icin degil.
            if (currentUserId.Value == authorId) return true;

            return permission switch
            {
                PostReplyPermissionSetting.Everyone => true,
                PostReplyPermissionSetting.Followers => viewerFollowsAuthor,
                PostReplyPermissionSetting.Following => authorFollowsViewer,
                _ => false // Nobody
            };
        }
    }
}
