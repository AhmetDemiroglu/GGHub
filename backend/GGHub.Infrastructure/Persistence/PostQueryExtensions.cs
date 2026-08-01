using GGHub.Core.Entities;
using GGHub.Core.Enums;

namespace GGHub.Infrastructure.Persistence
{
    /// <summary>
    /// PostAccess kuralinin EF'e cevrilebilen hali. Bellek icindeki tekil kontrol
    /// icin GGHub.Core.Specifications.PostAccess kullanilir; kural SQL'e inmek
    /// zorunda oldugunda (akis, profil sekmesi, yanit listesi, Kesfet) buradaki
    /// predicate kullanilir.
    ///
    /// UserQueryExtensions ile ayni sozlesme. Fark: burada engel filtresi
    /// AYRI bir metot degil, ayni Where icinde. Sebep: gonderi sorgulari
    /// gorunurluk ve engeli her zaman BIRLIKTE uygulamak zorunda; ikisini ayirmak
    /// cagiranin birini unutmasina acik kapi birakiyor ve zaten bu ozellikte
    /// istenmeyen tek sey bu.
    /// </summary>
    public static class PostQueryExtensions
    {
        /// <summary>
        /// Yalnizca currentUserId'nin gorebildigi gonderileri birakir.
        ///
        /// Uygulanan kapilar:
        ///   1. Yazar silinmemis/banli degil (kendi icerigi haric)
        ///   2. Yazarin PROFIL gorunurlugu (Public ya da takip ediyorum)
        ///   3. Yazarin GONDERI gorunurlugu (Everyone ya da takip ediyorum)
        ///   4. Iki yonlu engel yok
        ///   5. Repost ise KAYNAK gonderi de ayrica suzulur (asagidaki uzun not)
        /// </summary>
        public static IQueryable<Post> WhereVisibleTo(
            this IQueryable<Post> posts,
            GGHubDbContext context,
            int? currentUserId)
        {
            return posts.Where(p =>
                // ---- 1-4: gonderiyi yazan kisi ----
                (p.UserId == currentUserId ||
                 (!p.User.IsDeleted && !p.User.IsBanned &&

                  (p.User.ProfileVisibility == ProfileVisibilitySetting.Public ||
                   (p.User.ProfileVisibility == ProfileVisibilitySetting.Followers &&
                    currentUserId != null &&
                    context.Follows.Any(f => f.FolloweeId == p.UserId && f.FollowerId == currentUserId))) &&

                  (p.User.PostVisibility == PostVisibilitySetting.Everyone ||
                   (p.User.PostVisibility == PostVisibilitySetting.Followers &&
                    currentUserId != null &&
                    context.Follows.Any(f => f.FolloweeId == p.UserId && f.FollowerId == currentUserId))) &&

                  (currentUserId == null || !context.UserBlocks.Any(b =>
                      (b.BlockerId == currentUserId && b.BlockedId == p.UserId) ||
                      (b.BlockerId == p.UserId && b.BlockedId == currentUserId)))))

                &&

                // ---- 5: repost zinciri ----
                // Ozelligin EN BUYUK sizinti riski burasi. Repost, iceriği orijinal
                // yazarin HIC ONAYLAMADIGI bir kitleye tasiyor: A takipcilerine ozel
                // paylasir, onu takip eden B repost eder, B'yi takip eden ama A'yi
                // takip etmeyen C icerigi gorur.
                //
                // Bu yuzden kaynak yazar icin kural genel kuraldan DAHA KATI:
                // hem PostVisibility = Everyone hem ProfileVisibility = Public
                // olmak zorunda. "Takip ediyorsam gorurdum zaten" gevsetmesi
                // yapilamaz, cunku repost'u goren kisi benim degil B'nin kitlesi.
                //
                // Kontrol yazma aninda da yapiliyor (PostService.RepostAsync) ama
                // burada TEKRAR ediliyor: gizlilik ayari canli, yazar sonradan
                // sikilastirinca mevcut repost'lar da akistan dusmeli.
                (p.RepostOfPostId == null ||
                 p.RepostOfPost!.UserId == currentUserId ||
                 (!p.RepostOfPost.User.IsDeleted && !p.RepostOfPost.User.IsBanned &&
                  p.RepostOfPost.User.PostVisibility == PostVisibilitySetting.Everyone &&
                  p.RepostOfPost.User.ProfileVisibility == ProfileVisibilitySetting.Public &&
                  (currentUserId == null || !context.UserBlocks.Any(b =>
                      (b.BlockerId == currentUserId && b.BlockedId == p.RepostOfPost.UserId) ||
                      (b.BlockerId == p.RepostOfPost.UserId && b.BlockedId == currentUserId))))));
        }

        /// <summary>
        /// Akista/profilde gosterilecek "kok" kayitlar: yanitlar haric.
        /// Yanitlar yalnizca gonderi detayinda listelenir.
        /// </summary>
        public static IQueryable<Post> WhereRootLevel(this IQueryable<Post> posts)
            => posts.Where(p => p.ParentPostId == null);
    }
}
