using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Hesap silmenin icerik tarafi (bkz. IAccountPurgeService). Eskiden hesap silme yalnizca
    /// kullaniciyi anonimlestiriyordu; "deleted_user_12" adiyla incelemeleri, yorumlari, listeleri
    /// ve liderlik tablosundaki XP'si sitede kaliyordu (Ahmet, 2 Eki 2026).
    ///
    /// NEDEN sorgu suzgeci degil gercek silme: her sorguya "sahibi silinmemis" eklemek (ya da EF
    /// global filtresi) silme akislarinda yabanci anahtar tuzagi kurar (Restrict'li takip satiri
    /// suzgecten dolayi yuklenmez, liste silinemez). Ayrica hesap silen kullanicinin verisi
    /// gercekten gitmeli (magaza kurali ve KVKK).
    ///
    /// DM'ler BILEREK kalir: karsi tarafin kendi yazismasidir; gonderen "deleted_user_.." gorunur.
    /// Riza kayitlari (AiConsentRecords), sikayetler ve denetim gunlugu yasal/moderasyon kaydidir, kalir.
    ///
    /// Sira onemli: once baskalarinin sayaclari (silinecek satirlar hala dururken), sonra
    /// Restrict'li bagimlilar, en son kok icerik. Tum adimlar tek transaction'da; EF'in yeniden
    /// deneme stratejisi (EnableRetryOnFailure) acik oldugu icin transaction strateji icinde acilir.
    /// </summary>
    public class AccountPurgeService : IAccountPurgeService
    {
        private readonly GGHubDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly ILogger<AccountPurgeService> _logger;

        public AccountPurgeService(GGHubDbContext context, IMemoryCache cache, ILogger<AccountPurgeService> logger)
        {
            _context = context;
            _cache = cache;
            _logger = logger;
        }

        public async Task PurgeUserContentAsync(int userId, CancellationToken cancellationToken = default)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async ct =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync(ct);
                await PurgeCoreAsync(userId, ct);
                await transaction.CommitAsync(ct);
            }, cancellationToken);

            // Ana sayfa liderlik tablosu 15 dk onbellekte; silinen kullanici orada beklemesin.
            _cache.Remove("top-gamers");
            _cache.Remove("site-stats");
        }

        private async Task PurgeCoreAsync(int u, CancellationToken ct)
        {
            var db = _context;

            // ---- 1) Baskalarinin icerigindeki sayaclar (silinecek satirlar hala yerindeyken) ----

            // Baskasinin gonderisine verdigi begeniler.
            await db.Posts
                .Where(p => p.UserId != u && db.PostLikes.Any(l => l.PostId == p.Id && l.UserId == u))
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.LikeCount, p => p.LikeCount > 0 ? p.LikeCount - 1 : 0), ct);

            // Baskasinin gonderisine yazdigi yanitlar (yanit tek seviye: ParentPostId kok gonderidir).
            await db.Posts
                .Where(p => p.UserId != u && db.Posts.Any(r => r.ParentPostId == p.Id && r.UserId == u))
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.ReplyCount,
                    p => Math.Max(0, p.ReplyCount - db.Posts.Count(r => r.ParentPostId == p.Id && r.UserId == u))), ct);

            // Baskasinin gonderisini repost/alinti yapmasi.
            await db.Posts
                .Where(p => p.UserId != u && db.Posts.Any(r => r.RepostOfPostId == p.Id && r.UserId == u))
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.RepostCount,
                    p => Math.Max(0, p.RepostCount - db.Posts.Count(r => r.RepostOfPostId == p.Id && r.UserId == u))), ct);

            // Baskasinin anketine verdigi oy.
            await db.PostPollOptions
                .Where(o => db.PostPollVotes.Any(v => v.OptionId == o.Id && v.UserId == u) && o.Poll.Post.UserId != u)
                .ExecuteUpdateAsync(s => s.SetProperty(o => o.VoteCount, o => o.VoteCount > 0 ? o.VoteCount - 1 : 0), ct);

            // Puan yeniden hesabi icin etkilenen oyunlar ve listeler (silmeden ONCE toplanir).
            var gameIds = await db.Reviews.Where(r => r.UserId == u).Select(r => r.GameId).Distinct().ToListAsync(ct);
            var ratedListIds = await db.UserListRatings
                .Where(r => r.UserId == u && r.UserList.UserId != u)
                .Select(r => r.UserListId).Distinct().ToListAsync(ct);

            // ---- 2) Restrict'li bagimliliklar (kullanici satiri kalsa da kok icerik silinebilsin) ----

            await db.PostLikes.Where(l => l.UserId == u).ExecuteDeleteAsync(ct);
            await db.PostPollVotes.Where(v => v.UserId == u).ExecuteDeleteAsync(ct);
            // Kendi gonderilerindeki anketlere baskalarinin oylari: Option -> Vote Restrict, Poll -> Vote
            // Cascade. Postgres cascade sirasini garanti etmedigi icin oylar once acikca silinir.
            await db.PostPollVotes.Where(v => v.Poll.Post.UserId == u).ExecuteDeleteAsync(ct);

            await db.Follows.Where(f => f.FollowerId == u || f.FolloweeId == u).ExecuteDeleteAsync(ct);
            await db.UserBlocks.Where(b => b.BlockerId == u || b.BlockedId == u).ExecuteDeleteAsync(ct);
            await db.UserListFollows
                .Where(f => f.FollowerUserId == u || f.FollowedList.UserId == u)
                .ExecuteDeleteAsync(ct);

            // Gonderilerde kendi listesine verilmis etiketler: satir kalir, hedef bosalir (istemci duz metin basar).
            await db.PostMentions
                .Where(m => m.TargetListId != null && m.TargetList!.UserId == u)
                .ExecuteUpdateAsync(s => s.SetProperty(m => m.TargetListId, (int?)null), ct);

            // ---- 3) Kok icerik (cascade ile alt satirlar: yanitlar, oylar, oyunlar, gorseller) ----

            // Kendi gonderisinin anketlerindeki oylar 2. adimda silindi; kalan bagimlilar Cascade.
            await db.Posts.Where(p => p.UserId == u).ExecuteDeleteAsync(ct);

            await db.ReviewCommentVotes.Where(v => v.UserId == u).ExecuteDeleteAsync(ct);
            await db.ReviewVotes.Where(v => v.UserId == u).ExecuteDeleteAsync(ct);
            await db.ReviewComments.Where(c => c.UserId == u).ExecuteDeleteAsync(ct);
            await db.Reviews.Where(r => r.UserId == u).ExecuteDeleteAsync(ct);

            await db.UserListCommentVotes.Where(v => v.UserId == u).ExecuteDeleteAsync(ct);
            await db.UserListComments.Where(c => c.UserId == u).ExecuteDeleteAsync(ct);
            await db.UserListRatings.Where(r => r.UserId == u).ExecuteDeleteAsync(ct);
            await db.UserLists.Where(l => l.UserId == u).ExecuteDeleteAsync(ct);

            // Liderlik tablosu ve rozetler.
            await db.UserStats.Where(s => s.UserId == u).ExecuteDeleteAsync(ct);
            await db.UserAchievements.Where(a => a.UserId == u).ExecuteDeleteAsync(ct);

            // Bildirimler: kendisine gelenler ve onun tetikledikleri ("deleted_user begendi" kalmasin).
            await db.Notifications.Where(n => n.RecipientUserId == u || n.ActorUserId == u).ExecuteDeleteAsync(ct);

            await db.PushTokens.Where(t => t.UserId == u).ExecuteDeleteAsync(ct);
            await db.UserNotificationPreferences.Where(p => p.UserId == u).ExecuteDeleteAsync(ct);
            await db.BirthdayGreetings.Where(g => g.UserId == u).ExecuteDeleteAsync(ct);

            // Bekleyen bot gorevleri ona yazmasin.
            await db.AiAgentTasks
                .Where(t => t.TargetUserId == u && (t.Status == AiAgentTaskStatus.Pending || t.Status == AiAgentTaskStatus.Running))
                .ExecuteUpdateAsync(s => s
                    .SetProperty(t => t.Status, AiAgentTaskStatus.Skipped)
                    .SetProperty(t => t.Error, "Hedef hesap silindi."), ct);

            await db.Users.Where(x => x.Id == u)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.AllowAiInteraction, false), ct);

            // ---- 4) Puanlar: silinen inceleme ve liste puanlari ortalamadan cikar ----

            if (gameIds.Count > 0)
            {
                // ReviewService.UpdateGameRatingStatisticsAsync ile ayni kural: bot puani ortalamaya girmez.
                await db.Games.Where(g => gameIds.Contains(g.Id))
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(g => g.RatingCount, g => db.Reviews.Count(r => r.GameId == g.Id && !r.User.IsAiAgent))
                        .SetProperty(g => g.AverageRating, g => db.Reviews
                            .Where(r => r.GameId == g.Id && !r.User.IsAiAgent)
                            .Average(r => (double?)r.Rating) ?? 0), ct);
            }

            if (ratedListIds.Count > 0)
            {
                await db.UserLists.Where(l => ratedListIds.Contains(l.Id))
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(l => l.RatingCount, l => db.UserListRatings.Count(r => r.UserListId == l.Id))
                        .SetProperty(l => l.AverageRating, l => db.UserListRatings
                            .Where(r => r.UserListId == l.Id)
                            .Average(r => (double?)r.Value) ?? 0), ct);
            }
        }

        public async Task<DeletedAccountResidueDto> GetDeletedAccountResidueAsync(CancellationToken cancellationToken = default)
        {
            var ct = cancellationToken;
            var deleted = _context.Users.Where(x => x.IsDeleted && !x.IsAiAgent).Select(x => x.Id);

            return new DeletedAccountResidueDto
            {
                Accounts = await ResidueAccountIds().CountAsync(ct),
                Reviews = await _context.Reviews.CountAsync(r => deleted.Contains(r.UserId), ct),
                Comments = await _context.ReviewComments.CountAsync(c => deleted.Contains(c.UserId), ct)
                         + await _context.UserListComments.CountAsync(c => deleted.Contains(c.UserId), ct),
                Lists = await _context.UserLists.CountAsync(l => deleted.Contains(l.UserId), ct),
                Posts = await _context.Posts.CountAsync(p => deleted.Contains(p.UserId), ct),
                Likes = await _context.PostLikes.CountAsync(l => deleted.Contains(l.UserId), ct),
                Follows = await _context.Follows.CountAsync(f => deleted.Contains(f.FollowerId) || deleted.Contains(f.FolloweeId), ct),
                RankingEntries = await _context.UserStats.CountAsync(s => deleted.Contains(s.UserId), ct)
            };
        }

        public async Task<int> PurgeAllDeletedAccountsAsync(CancellationToken cancellationToken = default)
        {
            var ids = await ResidueAccountIds().ToListAsync(cancellationToken);
            foreach (var id in ids)
            {
                await PurgeUserContentAsync(id, cancellationToken);
            }
            if (ids.Count > 0) _logger.LogInformation("[AccountPurge] {Count} silinmis hesabin icerigi temizlendi.", ids.Count);
            return ids.Count;
        }

        /// <summary>Silinmis ve sitede hala izi olan (gorunur icerik ya da liderlik satiri) hesaplar.</summary>
        private IQueryable<int> ResidueAccountIds()
        {
            var db = _context;
            return db.Users
                .Where(x => x.IsDeleted && !x.IsAiAgent && (
                    db.Reviews.Any(r => r.UserId == x.Id) ||
                    db.ReviewComments.Any(c => c.UserId == x.Id) ||
                    db.UserListComments.Any(c => c.UserId == x.Id) ||
                    db.UserLists.Any(l => l.UserId == x.Id) ||
                    db.Posts.Any(p => p.UserId == x.Id) ||
                    db.PostLikes.Any(l => l.UserId == x.Id) ||
                    db.Follows.Any(f => f.FollowerId == x.Id || f.FolloweeId == x.Id) ||
                    db.UserStats.Any(s => s.UserId == x.Id) ||
                    db.UserListRatings.Any(r => r.UserId == x.Id) ||
                    db.Notifications.Any(n => n.ActorUserId == x.Id)))
                .Select(x => x.Id);
        }
    }
}
