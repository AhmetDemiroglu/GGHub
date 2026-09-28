using System.Security.Cryptography;
using System.Text;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Core.Specifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Persistence.Seeders
{
    /// <summary>
    /// Demo icerik: platform bos gorunmesin diye sahte kullanici, takip agi,
    /// gonderi, begeni, yanit ve anket uretir.
    ///
    /// GUVENLIK NOTU (onemli):
    /// Bu seeder Program.cs acilisinda CALISTIRILMAZ. Gelistirme ortamindaki
    /// baglanti dizesi CANLI Railway veritabanini gosteriyor; acilista calisan
    /// bir seeder her `dotnet run`da uretime veri yazardi. Yalnizca Admin
    /// politikali bir uctan ve ayrica Seed:DemoEnabled bayragi acikken tetiklenir.
    ///
    /// Uretilen her User ve Post IsSeeded=true damgasi tasir; PurgeAsync tam
    /// olarak bunlari (ve bagli satirlari) siler. Damga yalnizca bu iki tabloda:
    /// bagli kayitlar (begeni, oy, etiket, gorsel) zaten sahibiyle birlikte
    /// gidiyor, hepsine kolon eklemek gereksiz sisme olurdu.
    /// </summary>
    public class DemoContentSeeder
    {
        private const int UserCount = 60;
        private const int TargetPostCount = 500;
        private const string SeedPassword = "GGHubDemo!2026";

        private readonly GGHubDbContext _context;
        private readonly ILogger<DemoContentSeeder> _logger;

        // Tohum SABIT: ayni girdi ayni ciktiyi uretir, bir sorun bulundugunda
        // yeniden uretilebilir. DateTime.Now tabanli tohum tekrar edilemezdi.
        private readonly Random _random = new(20260801);

        public DemoContentSeeder(GGHubDbContext context, ILogger<DemoContentSeeder> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<int> SeedAsync(CancellationToken cancellationToken = default)
        {
            // Idempotent: iki kez calistirmak icerigi ikiye katlamaz.
            //
            // Ama ONARIM yapar: seeder gelistikce (ornegin avatar eklendiginde)
            // daha once basilmis kayitlar eksik kalir. Eskiden burada dogrudan
            // return ediliyordu ve eksigi tamamlamanin TEK yolu her seyi silip
            // yeniden basmakti. Artik tamamlanabilir alanlar yerinde duzeltiliyor;
            // veri kaybi olmadan, tek cagriyla.
            if (await _context.Users.AnyAsync(u => u.IsSeeded, cancellationToken))
            {
                var repaired = await RepairAsync(cancellationToken);
                _logger.LogInformation("Demo content already seeded; repaired {Count} record(s).", repaired);
                return 0;
            }

            var users = await SeedUsersAsync(cancellationToken);
            await SeedFollowsAsync(users, cancellationToken);
            var gameIds = await LoadGameIdsAsync(cancellationToken);
            var listIds = await LoadPublicListIdsAsync(cancellationToken);
            var posts = await SeedPostsAsync(users, gameIds, listIds, cancellationToken);
            await SeedEngagementAsync(users, posts, cancellationToken);

            _logger.LogInformation("Demo content seeded: {UserCount} users, {PostCount} posts.", users.Count, posts.Count);
            return posts.Count;
        }

        /// <summary>
        /// Daha once basilmis demo kayitlarindaki EKSIKLERI tamamlar. Silme yok,
        /// yalnizca bos alanlari doldurma; var olan degerlere dokunulmaz.
        ///
        /// Bugun iki sey onariliyor:
        ///   1. Profil fotografi olmayan seed kullanicilari (avatar seeder'a
        ///      sonradan eklendi).
        ///   2. Buyuk harf iceren e-postalar (giris e-postayi birebir
        ///      karsilastirdigi icin "levelUp40@..." ile giris yapilamiyordu).
        /// </summary>
        private async Task<int> RepairAsync(CancellationToken cancellationToken)
        {
            var users = await _context.Users
                .Where(u => u.IsSeeded)
                .ToListAsync(cancellationToken);

            var changed = 0;

            foreach (var user in users)
            {
                if (string.IsNullOrWhiteSpace(user.ProfileImageUrl))
                {
                    user.ProfileImageUrl = $"https://i.pravatar.cc/300?u={user.Username}";
                    changed++;
                }

                var lowered = user.Email.ToLowerInvariant();
                if (!string.Equals(user.Email, lowered, StringComparison.Ordinal))
                {
                    user.Email = lowered;
                    changed++;
                }
            }

            // Kapali dogmus anketleri ac. Bitis tarihi gonderi tarihine gore
            // hesaplaniyordu ve gonderiler 45 gune yayildigi icin neredeyse tum
            // demo anketleri dogar dogmaz "Sona erdi" oluyordu; hicbirine oy
            // verilemiyordu. Yalnizca GECMISTE kalanlar ileri aliniyor.
            var now = DateTime.UtcNow;
            var closedPolls = await _context.PostPolls
                .Where(p => p.EndsAt <= now && p.Post.IsSeeded)
                .ToListAsync(cancellationToken);

            foreach (var poll in closedPolls)
            {
                // Besde biri bilerek kapali kalir ki kapali anket gorunumu de
                // demoda temsil edilsin.
                if (poll.Id % 5 == 0) continue;
                poll.EndsAt = now.AddDays(1 + (poll.Id % 7));
                changed++;
            }

            if (changed > 0) await _context.SaveChangesAsync(cancellationToken);
            return changed;
        }

        /// <summary>
        /// Sahte hesaplarin e-posta alan adlari. IsSeeded bayragi bu seeder ile
        /// geldi; ondan ONCE elle eklenmis demo hesaplar (@fake.gghub.social)
        /// bayrak tasimiyor, bu yuzden genis temizlikte alan adindan bulunurlar.
        /// </summary>
        private static readonly string[] FakeEmailDomains =
        {
            "@demo.gghub.social",
            "@fake.gghub.social"
        };

        /// <summary>
        /// Geriye donuk uyumluluk (DemoSeedController): temizler ve silinen kullanici sayisini doner.
        /// </summary>
        public async Task<int> PurgeAsync(
            bool includeLegacyFakeAccounts = false,
            CancellationToken cancellationToken = default)
        {
            var report = await PurgeFakeContentAsync(includeLegacyFakeAccounts, dryRun: false, cancellationToken);
            return report.Counts.GetValueOrDefault("users");
        }

        /// <summary>
        /// Sahte/demo hesaplari ve ILISKILI HER SEYI siler; <paramref name="dryRun"/> true ise hicbir
        /// sey silmez, yalnizca tablo basina silinecek satir sayisini doner (admin onizlemesi).
        ///
        /// Kapsam:
        ///   - Sahte hesaplarin kendi icerigi (gonderi, inceleme, liste, yorum, oy, mesaj, takip, rapor).
        ///   - Gercek kullanicilarin SAHTE icerige verdikleri yanit, repost, begeni ve yorumlar.
        ///     Bunlar baglamsiz kalirdi; ayrica cogu FK cascade ile zaten gidiyor, burada acikca
        ///     sayilip silinmeleri onizlemenin dogru rakam gostermesi icin.
        ///   - Silinen icerigi hedef alan icerik raporlari.
        /// Gercek kullanicilarin KENDI icerigi (gercek gonderiye yaniti, kendi incelemesi) kalir.
        ///
        /// Silme SIRASI zorunlu: Follow ve UserBlock iki FK'da da Restrict, PostPollVote.OptionId
        /// Restrict, PostMention hedefleri Restrict, UserListComment.ParentComment ClientSetNull
        /// (DB'de NO ACTION). Sira bozulursa ReferenceConstraintException alinir.
        ///
        /// Silme sonrasi SAYAC ONARIMI: oyunlarin GGHub puani, gercek gonderilerin begeni/yanit/repost
        /// sayaclari ve gercek listelerin puan ortalamasi silinen satirlara gore yeniden hesaplanir.
        /// Eski surum bunu yapmiyordu ve sahte incelemeler oyun puaninda kalici iz birakiyordu.
        ///
        /// Tek transaction: yarida kalan temizlik olmaz.
        /// </summary>
        public async Task<FakeContentPurgeReport> PurgeFakeContentAsync(
            bool includeLegacyFakeAccounts,
            bool dryRun,
            CancellationToken cancellationToken = default)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var tx = dryRun ? null : await _context.Database.BeginTransactionAsync(cancellationToken);
                var report = await PurgeCoreAsync(includeLegacyFakeAccounts, dryRun, cancellationToken);
                if (tx != null) await tx.CommitAsync(cancellationToken);
                return report;
            });
        }

        private async Task<FakeContentPurgeReport> PurgeCoreAsync(
            bool includeLegacyFakeAccounts,
            bool dryRun,
            CancellationToken cancellationToken)
        {
            var report = new FakeContentPurgeReport { DryRun = dryRun };

            var query = _context.Users.Where(u => u.IsSeeded && !u.IsAiAgent);
            if (includeLegacyFakeAccounts)
            {
                // IsSeeded bayragi OLMAYAN eski sahte hesaplar da dahil. AI botlari ASLA:
                // onlarin alan adi ayri (@ai.gghub.social) ama bayrakla da korunuyorlar.
                query = _context.Users.Where(u =>
                    !u.IsAiAgent &&
                    (u.IsSeeded || FakeEmailDomains.Any(d => u.Email.EndsWith(d))));
            }

            var userIds = await query.Select(u => u.Id).ToListAsync(cancellationToken);
            report.Counts["users"] = userIds.Count;
            if (userIds.Count == 0) return report;

            // --- Kimlik kumeleri ---------------------------------------------------------

            // Sahte gonderiler + onlara bagli (yanit/repost) gercek gonderiler, zincir bitene kadar.
            var postIds = (await _context.Posts
                .Where(p => p.IsSeeded || userIds.Contains(p.UserId))
                .Select(p => p.Id)
                .ToListAsync(cancellationToken)).ToHashSet();
            for (var depth = 0; depth < 5; depth++)
            {
                var current = postIds.ToList();
                var children = await _context.Posts
                    .Where(p => !current.Contains(p.Id) &&
                                ((p.ParentPostId != null && current.Contains(p.ParentPostId.Value)) ||
                                 (p.RepostOfPostId != null && current.Contains(p.RepostOfPostId.Value))))
                    .Select(p => p.Id)
                    .ToListAsync(cancellationToken);
                if (children.Count == 0) break;
                foreach (var id in children) postIds.Add(id);
            }
            var postIdList = postIds.ToList();

            var pollIds = await _context.PostPolls
                .Where(p => postIdList.Contains(p.PostId))
                .Select(p => p.Id)
                .ToListAsync(cancellationToken);

            var reviewIds = await _context.Reviews
                .Where(r => userIds.Contains(r.UserId))
                .Select(r => r.Id)
                .ToListAsync(cancellationToken);

            var listIds = await _context.UserLists
                .Where(l => userIds.Contains(l.UserId))
                .Select(l => l.Id)
                .ToListAsync(cancellationToken);

            // Inceleme yorumlari: sahtenin yazdigi, sahte incelemedeki ve bunlara verilen yanitlar.
            var reviewCommentIds = (await _context.ReviewComments
                .Where(c => userIds.Contains(c.UserId) || reviewIds.Contains(c.ReviewId))
                .Select(c => c.Id)
                .ToListAsync(cancellationToken)).ToHashSet();
            await ExpandRepliesAsync(reviewCommentIds,
                ids => _context.ReviewComments.Where(c => c.ParentCommentId != null && ids.Contains(c.ParentCommentId.Value)).Select(c => c.Id),
                cancellationToken);
            var reviewCommentIdList = reviewCommentIds.ToList();

            // Liste yorumlari: ayni kural. ParentComment ClientSetNull (DB'de NO ACTION) oldugu
            // icin gercek bir yanitin ebeveyni silinirse FK patlar; yanitlar da kumeye giriyor.
            var listCommentIds = (await _context.UserListComments
                .Where(c => userIds.Contains(c.UserId) || listIds.Contains(c.UserListId))
                .Select(c => c.Id)
                .ToListAsync(cancellationToken)).ToHashSet();
            await ExpandRepliesAsync(listCommentIds,
                ids => _context.UserListComments.Where(c => c.ParentCommentId != null && ids.Contains(c.ParentCommentId.Value)).Select(c => c.Id),
                cancellationToken);
            var listCommentIdList = listCommentIds.ToList();

            // --- Sayac onarimi icin etkilenen GERCEK kayitlar (silmeden ONCE topla) ---------

            var affectedGameIds = await _context.Reviews
                .Where(r => reviewIds.Contains(r.Id))
                .Select(r => r.GameId)
                .Distinct()
                .ToListAsync(cancellationToken);

            var affectedPostIds = (await _context.PostLikes
                    .Where(l => userIds.Contains(l.UserId) && !postIdList.Contains(l.PostId))
                    .Select(l => l.PostId)
                    .ToListAsync(cancellationToken))
                .Concat(await _context.Posts
                    .Where(p => postIdList.Contains(p.Id) && p.ParentPostId != null && !postIdList.Contains(p.ParentPostId.Value))
                    .Select(p => p.ParentPostId!.Value)
                    .ToListAsync(cancellationToken))
                .Concat(await _context.Posts
                    .Where(p => postIdList.Contains(p.Id) && p.RepostOfPostId != null && !postIdList.Contains(p.RepostOfPostId.Value))
                    .Select(p => p.RepostOfPostId!.Value)
                    .ToListAsync(cancellationToken))
                .Distinct()
                .ToList();

            var affectedListIds = await _context.UserListRatings
                .Where(r => userIds.Contains(r.UserId) && !listIds.Contains(r.UserListId))
                .Select(r => r.UserListId)
                .Distinct()
                .ToListAsync(cancellationToken);

            // --- Sayim / silme ---------------------------------------------------------------
            //
            // Her adim once sayar; dryRun degilse siler. Sayim ve silme AYNI filtreyi kullanir,
            // onizleme ile gercek silme arasinda sapma olmasin diye.

            async Task Step<T>(string key, IQueryable<T> rows) where T : class
            {
                if (dryRun)
                {
                    report.Counts[key] = report.Counts.GetValueOrDefault(key) + await rows.CountAsync(cancellationToken);
                }
                else
                {
                    report.Counts[key] = report.Counts.GetValueOrDefault(key) + await rows.ExecuteDeleteAsync(cancellationToken);
                }
            }

            // 1. Anket oylari (Option'a Restrict FK tasiyor, once bunlar).
            await Step("pollVotes", _context.PostPollVotes.Where(v => pollIds.Contains(v.PollId) || userIds.Contains(v.UserId)));

            // 2. Gonderiye bagli yan tablolar.
            await Step("postLikes", _context.PostLikes.Where(l => postIdList.Contains(l.PostId) || userIds.Contains(l.UserId)));
            await Step("postMentions", _context.PostMentions.Where(m =>
                postIdList.Contains(m.PostId) ||
                (m.TargetUserId != null && userIds.Contains(m.TargetUserId.Value)) ||
                (m.TargetListId != null && listIds.Contains(m.TargetListId.Value))));
            await Step("postImages", _context.PostImages.Where(i => postIdList.Contains(i.PostId)));
            await Step("pollOptions", _context.PostPollOptions.Where(o => pollIds.Contains(o.PollId)));
            await Step("polls", _context.PostPolls.Where(p => pollIds.Contains(p.Id)));

            // 3. Gonderiler: once repost ve yanitlar, sonra kokler (self-FK).
            await Step("posts", _context.Posts.Where(p => postIdList.Contains(p.Id) && (p.ParentPostId != null || p.RepostOfPostId != null)));
            await Step("posts", _context.Posts.Where(p => postIdList.Contains(p.Id) && p.ParentPostId == null && p.RepostOfPostId == null));

            // 4. Kullaniciya bagli Restrict FK tasiyan tablolar.
            await Step("follows", _context.Follows.Where(f => userIds.Contains(f.FollowerId) || userIds.Contains(f.FolloweeId)));
            await Step("blocks", _context.UserBlocks.Where(b => userIds.Contains(b.BlockerId) || userIds.Contains(b.BlockedId)));
            await Step("notifications", _context.Notifications.Where(n =>
                userIds.Contains(n.RecipientUserId) || (n.ActorUserId != null && userIds.Contains(n.ActorUserId.Value))));
            await Step("pushTokens", _context.PushTokens.Where(t => userIds.Contains(t.UserId)));
            await Step("refreshTokens", _context.RefreshTokens.Where(t => userIds.Contains(t.UserId)));
            await Step("userStats", _context.UserStats.Where(st => userIds.Contains(st.UserId)));

            // 5. Inceleme ve liste icerigi: once oylar, sonra yorumlar, sonra ana kayitlar.
            await Step("reviewCommentVotes", _context.ReviewCommentVotes.Where(v =>
                userIds.Contains(v.UserId) || reviewCommentIdList.Contains(v.ReviewCommentId)));
            // Yanitlar once (self-FK), sonra kokler.
            await Step("reviewComments", _context.ReviewComments.Where(c => reviewCommentIdList.Contains(c.Id) && c.ParentCommentId != null));
            await Step("reviewComments", _context.ReviewComments.Where(c => reviewCommentIdList.Contains(c.Id) && c.ParentCommentId == null));
            await Step("reviewVotes", _context.ReviewVotes.Where(v => userIds.Contains(v.UserId) || reviewIds.Contains(v.ReviewId)));
            await Step("reviews", _context.Reviews.Where(r => reviewIds.Contains(r.Id)));

            await Step("listCommentVotes", _context.UserListCommentVotes.Where(v =>
                userIds.Contains(v.UserId) || listCommentIdList.Contains(v.UserListCommentId)));
            await Step("listComments", _context.UserListComments.Where(c => listCommentIdList.Contains(c.Id) && c.ParentCommentId != null));
            await Step("listComments", _context.UserListComments.Where(c => listCommentIdList.Contains(c.Id) && c.ParentCommentId == null));
            await Step("listRatings", _context.UserListRatings.Where(r => userIds.Contains(r.UserId) || listIds.Contains(r.UserListId)));
            await Step("listFollows", _context.UserListFollows.Where(f => userIds.Contains(f.FollowerUserId) || listIds.Contains(f.FollowedListId)));
            await Step("listGames", _context.UserListGames.Where(g => listIds.Contains(g.UserListId)));
            await Step("lists", _context.UserLists.Where(l => listIds.Contains(l.Id)));

            await Step("messages", _context.Messages.Where(m => userIds.Contains(m.SenderId) || userIds.Contains(m.RecipientId)));
            await Step("achievements", _context.UserAchievements.Where(a => userIds.Contains(a.UserId)));

            // 6. Raporlar: sahtenin actiklari + silinen icerigi/kullaniciyi hedef alanlar.
            await Step("reports", _context.ContentReports.Where(r =>
                userIds.Contains(r.ReporterUserId) ||
                (r.EntityType == "User" && userIds.Contains(r.EntityId)) ||
                (r.EntityType == "Post" && postIdList.Contains(r.EntityId)) ||
                (r.EntityType == "Review" && reviewIds.Contains(r.EntityId)) ||
                (r.EntityType == "List" && listIds.Contains(r.EntityId)) ||
                (r.EntityType == "Comment" && listCommentIdList.Contains(r.EntityId)) ||
                (r.EntityType == "ReviewComment" && reviewCommentIdList.Contains(r.EntityId))));

            // 7. Kullanicilar.
            report.Counts.Remove("users");
            await Step("users", _context.Users.Where(u => userIds.Contains(u.Id)));

            report.AffectedGames = affectedGameIds.Count;
            report.AffectedPosts = affectedPostIds.Count;
            report.AffectedLists = affectedListIds.Count;

            if (dryRun) return report;

            // --- Sayac onarimi ------------------------------------------------------------

            // Oyun puani: kalan INSAN incelemelerinden (AI botlari puana girmez, bkz. ReviewService).
            foreach (var gameId in affectedGameIds)
            {
                var stats = await _context.Reviews
                    .Where(r => r.GameId == gameId && !r.User.IsAiAgent)
                    .GroupBy(r => r.GameId)
                    .Select(g => new { Average = g.Average(r => r.Rating), Count = g.Count() })
                    .FirstOrDefaultAsync(cancellationToken);

                await _context.Games.Where(g => g.Id == gameId).ExecuteUpdateAsync(set => set
                    .SetProperty(g => g.AverageRating, stats == null ? 0 : stats.Average)
                    .SetProperty(g => g.RatingCount, stats == null ? 0 : stats.Count), cancellationToken);
            }

            if (affectedPostIds.Count > 0)
            {
                await _context.Posts.Where(p => affectedPostIds.Contains(p.Id)).ExecuteUpdateAsync(set => set
                    .SetProperty(p => p.LikeCount, p => _context.PostLikes.Count(l => l.PostId == p.Id))
                    .SetProperty(p => p.ReplyCount, p => _context.Posts.Count(c => c.ParentPostId == p.Id))
                    .SetProperty(p => p.RepostCount, p => _context.Posts.Count(c => c.RepostOfPostId == p.Id)),
                    cancellationToken);
            }

            foreach (var listId in affectedListIds)
            {
                var stats = await _context.UserListRatings
                    .Where(r => r.UserListId == listId)
                    .GroupBy(r => r.UserListId)
                    .Select(g => new { Average = g.Average(r => r.Value), Count = g.Count() })
                    .FirstOrDefaultAsync(cancellationToken);

                await _context.UserLists.Where(l => l.Id == listId).ExecuteUpdateAsync(set => set
                    .SetProperty(l => l.AverageRating, stats == null ? 0 : stats.Average)
                    .SetProperty(l => l.RatingCount, stats == null ? 0 : stats.Count), cancellationToken);
            }

            _logger.LogInformation(
                "Fake content purged: {Users} users, {Games} games / {Posts} posts / {Lists} lists recounted.",
                report.Counts.GetValueOrDefault("users"), affectedGameIds.Count, affectedPostIds.Count, affectedListIds.Count);
            return report;
        }

        /// <summary>Yanit zincirini (ebeveyni kumede olan yorumlar) kume sabitlenene kadar genisletir.</summary>
        private static async Task ExpandRepliesAsync(
            HashSet<int> ids,
            Func<List<int>, IQueryable<int>> childrenOf,
            CancellationToken cancellationToken)
        {
            for (var depth = 0; depth < 10; depth++)
            {
                var current = ids.ToList();
                var children = await childrenOf(current).Where(id => !current.Contains(id)).ToListAsync(cancellationToken);
                if (children.Count == 0) return;
                foreach (var id in children) ids.Add(id);
            }
        }

        private async Task<List<User>> SeedUsersAsync(CancellationToken cancellationToken)
        {
            CreatePasswordHash(SeedPassword, out var hash, out var salt);

            var users = new List<User>();
            var now = DateTime.UtcNow;

            for (var i = 0; i < UserCount; i++)
            {
                var handle = $"{Handles[i % Handles.Length]}{i + 1:00}";
                var user = new User
                {
                    Username = handle,
                    UsernameNormalized = UsernameNormalizer.Normalize(handle),
                    Email = $"{handle.ToLowerInvariant()}@demo.gghub.social",
                    PasswordHash = hash,
                    PasswordSalt = salt,
                    FirstName = FirstNames[_random.Next(FirstNames.Length)],
                    LastName = LastNames[_random.Next(LastNames.Length)],
                    Bio = Bios[_random.Next(Bios.Length)],
                    // Avatarlar R2'ye YUKLENMEZ. pravatar seed'e gore deterministik
                    // bir yuz uretiyor: ayni kullanici adi hep ayni resmi verir.
                    // Sistemdeki mevcut sahte hesaplar da bu deseni kullaniyor,
                    // yeni seed onlarla gorsel olarak tutarli olsun diye ayni.
                    ProfileImageUrl = $"https://i.pravatar.cc/300?u={handle}",
                    // Gecmise yayilmis kayit tarihleri: hepsi ayni gun uye olmus
                    // gorunmesin, "yeni kullanici" listeleri gercekci kalsin.
                    CreatedAt = now.AddDays(-_random.Next(5, 400)),
                    UpdatedAt = now,
                    IsEmailVerified = true,
                    IsSeeded = true,
                    // Demo kullanicilari HERKESE ACIK: aksi halde akis bos gorunur.
                    ProfileVisibility = ProfileVisibilitySetting.Public,
                    PostVisibility = PostVisibilitySetting.Everyone,
                    PostReplyPermission = PostReplyPermissionSetting.Everyone
                };

                users.Add(user);
            }

            _context.Users.AddRange(users);
            await _context.SaveChangesAsync(cancellationToken);

            _context.UserStats.AddRange(users.Select(u => new UserStats { UserId = u.Id }));
            await _context.SaveChangesAsync(cancellationToken);

            return users;
        }

        private async Task SeedFollowsAsync(List<User> users, CancellationToken cancellationToken)
        {
            var follows = new List<Follow>();
            var seen = new HashSet<(int, int)>();

            foreach (var user in users)
            {
                var count = _random.Next(3, 15);
                for (var i = 0; i < count; i++)
                {
                    var target = users[_random.Next(users.Count)];
                    if (target.Id == user.Id) continue;
                    if (!seen.Add((user.Id, target.Id))) continue;

                    follows.Add(new Follow
                    {
                        FollowerId = user.Id,
                        FolloweeId = target.Id,
                        CreatedAt = DateTime.UtcNow.AddDays(-_random.Next(1, 200))
                    });
                }
            }

            _context.Follows.AddRange(follows);
            await _context.SaveChangesAsync(cancellationToken);
        }

        private async Task<List<int>> LoadGameIdsAsync(CancellationToken cancellationToken) =>
            await _context.Games
                .AsNoTracking()
                .OrderByDescending(g => g.RatingCount)
                .Select(g => g.Id)
                .Take(300)
                .ToListAsync(cancellationToken);

        private async Task<List<int>> LoadPublicListIdsAsync(CancellationToken cancellationToken) =>
            await _context.UserLists
                .AsNoTracking()
                .Where(l => l.Visibility == ListVisibilitySetting.Public)
                .Select(l => l.Id)
                .Take(100)
                .ToListAsync(cancellationToken);

        private async Task<List<Post>> SeedPostsAsync(
            List<User> users, List<int> gameIds, List<int> listIds, CancellationToken cancellationToken)
        {
            var posts = new List<Post>();
            var now = DateTime.UtcNow;

            for (var i = 0; i < TargetPostCount; i++)
            {
                var author = users[_random.Next(users.Count)];
                var template = PostTemplates[_random.Next(PostTemplates.Length)];

                // Sablondaki {game} yer tutucusu tipli etiket token'ina cevrilir;
                // boylece seed icerigi de Kesfet'in zevk grafigini besler.
                var content = template;
                var mentions = new List<PostMention>();

                if (content.Contains("{game}") && gameIds.Count > 0)
                {
                    var gameId = gameIds[_random.Next(gameIds.Count)];
                    var token = MentionTokens.Build(MentionTargetType.Game, gameId);
                    var position = content.IndexOf("{game}", StringComparison.Ordinal);
                    content = content.Replace("{game}", token);
                    mentions.Add(new PostMention
                    {
                        TargetType = MentionTargetType.Game,
                        TargetGameId = gameId,
                        Position = position,
                        Length = token.Length
                    });
                }

                if (content.Contains("{list}"))
                {
                    if (listIds.Count > 0)
                    {
                        var listId = listIds[_random.Next(listIds.Count)];
                        var token = MentionTokens.Build(MentionTargetType.List, listId);
                        var position = content.IndexOf("{list}", StringComparison.Ordinal);
                        content = content.Replace("{list}", token);
                        mentions.Add(new PostMention
                        {
                            TargetType = MentionTargetType.List,
                            TargetListId = listId,
                            Position = position,
                            Length = token.Length
                        });
                    }
                    else
                    {
                        // Herkese acik liste yoksa yer tutucu metinde kalmasin.
                        content = content.Replace("{list}", "listemde");
                    }
                }

                var post = new Post
                {
                    UserId = author.Id,
                    Content = content,
                    CreatedAt = now.AddMinutes(-_random.Next(30, 60 * 24 * 45)),
                    IsSeeded = true
                };

                foreach (var mention in mentions) post.Mentions.Add(mention);

                // ~%15 anketli. Gorsel ve anket ayni gonderide olmaz (composer da izin vermiyor).
                if (_random.Next(100) < 15)
                {
                    // Bitis SIMDIYE gore hesaplanir, gonderi tarihine gore DEGIL.
                    // Gonderiler 45 gune yayildigi icin gonderi tarihi + 1-7 gun
                    // demek anketlerin neredeyse tamaminin dogar dogmaz KAPALI
                    // olmasi demekti; demo akisinda her anket "Sona erdi" ve %0
                    // gorunuyor, hicbirine oy verilemiyordu.
                    //
                    // Besde biri bilerek kapali birakiliyor ki kapali anket
                    // gorunumu de demo icinde temsil edilsin.
                    var closed = _random.Next(5) == 0;
                    var poll = new PostPoll
                    {
                        EndsAt = closed
                            ? DateTime.UtcNow.AddDays(-_random.Next(1, 10))
                            : DateTime.UtcNow.AddDays(_random.Next(1, 8)),
                        CreatedAt = post.CreatedAt
                    };

                    var options = PollTemplates[_random.Next(PollTemplates.Length)];
                    for (var o = 0; o < options.Length; o++)
                        poll.Options.Add(new PostPollOption { Text = options[o], Position = o });

                    post.Poll = poll;
                }
                else if (_random.Next(100) < 25 && gameIds.Count > 0)
                {
                    // Gorseller R2'ye YUKLENMEZ: mevcut RAWG kapaklari kullaniliyor.
                    // Boylece seed ne depolama maliyeti ne de yetim dosya birakir.
                    var covers = await _context.Games
                        .AsNoTracking()
                        .Where(g => gameIds.Contains(g.Id) && g.CoverImage != null)
                        .OrderBy(g => g.Id)
                        .Select(g => g.CoverImage!)
                        .Skip(_random.Next(0, Math.Max(1, gameIds.Count - 4)))
                        .Take(_random.Next(1, 3))
                        .ToListAsync(cancellationToken);

                    for (var c = 0; c < covers.Count; c++)
                        post.Images.Add(new PostImage { Url = covers[c], Position = c });
                }

                posts.Add(post);
            }

            _context.Posts.AddRange(posts);
            await _context.SaveChangesAsync(cancellationToken);

            return posts;
        }

        private async Task SeedEngagementAsync(List<User> users, List<Post> posts, CancellationToken cancellationToken)
        {
            var likes = new List<PostLike>();
            var seenLikes = new HashSet<(int, int)>();

            foreach (var post in posts)
            {
                var likeCount = _random.Next(0, 25);
                for (var i = 0; i < likeCount; i++)
                {
                    var user = users[_random.Next(users.Count)];
                    if (!seenLikes.Add((user.Id, post.Id))) continue;

                    likes.Add(new PostLike { UserId = user.Id, PostId = post.Id, CreatedAt = post.CreatedAt.AddMinutes(_random.Next(1, 600)) });
                    post.LikeCount += 1;
                }
            }

            _context.PostLikes.AddRange(likes);

            // Yanitlar: koklerin bir kismina 1-4 yanit.
            var replies = new List<Post>();
            foreach (var post in posts.Where(_ => _random.Next(100) < 35))
            {
                var replyCount = _random.Next(1, 5);
                for (var i = 0; i < replyCount; i++)
                {
                    var author = users[_random.Next(users.Count)];
                    replies.Add(new Post
                    {
                        UserId = author.Id,
                        Content = ReplyTemplates[_random.Next(ReplyTemplates.Length)],
                        ParentPostId = post.Id,
                        CreatedAt = post.CreatedAt.AddMinutes(_random.Next(5, 2000)),
                        IsSeeded = true
                    });
                    post.ReplyCount += 1;
                }
            }

            _context.Posts.AddRange(replies);
            await _context.SaveChangesAsync(cancellationToken);
        }

        private static void CreatePasswordHash(string password, out byte[] passwordHash, out byte[] passwordSalt)
        {
            using var hmac = new HMACSHA512();
            passwordSalt = hmac.Key;
            passwordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
        }

        // ------------------------------------------------------------------
        // Icerik havuzlari. EM DASH KULLANILMAZ (kullaniciya gorunen metin).
        // ------------------------------------------------------------------

        private static readonly string[] Handles =
        {
            "pixelavcisi", "loot_kral", "gece_oyuncusu", "combo_master", "retroKafa",
            "speedrunner", "boss_avcisi", "co_op_dostu", "indie_sever", "rpg_bagimlisi",
            "fps_kurdu", "strateji_beyni", "platform_ustasi", "acikdunya", "kontrolcu",
            "klavyeci", "achievement", "yenimacera", "oyunkasifi", "levelUp"
        };

        private static readonly string[] FirstNames =
        {
            "Ahmet", "Elif", "Mert", "Zeynep", "Can", "Deniz", "Ece", "Burak",
            "Selin", "Emre", "Naz", "Kaan", "Irem", "Onur", "Sude", "Baris"
        };

        private static readonly string[] LastNames =
        {
            "Yilmaz", "Demir", "Kaya", "Sahin", "Celik", "Aydin", "Ozturk",
            "Arslan", "Dogan", "Kilic", "Aslan", "Cetin"
        };

        private static readonly string[] Bios =
        {
            "Oyun oynamak icin yasiyorum.",
            "Indie oyun avcisi, platin pesindeyim.",
            "Strateji ve RPG. Baska bir sey tanimam.",
            "Gece oynar, gunduz uyurum.",
            "Kooperatif oyunlar icin her zaman hazirim.",
            "Retro konsol koleksiyoneri.",
            "Speedrun denemeleri ve bol bol tekrar.",
            "Her ay bir oyun bitirmeye calisiyorum."
        };

        private static readonly string[] PostTemplates =
        {
            "{game} sonunda bitti. Final beklediğimden çok daha iyiydi.",
            "{game} oynayan var mı? Zorluk ayarını nasıl yaptınız?",
            "Bu hafta {game} indirimde, kaçırmayın derim.",
            "{game} grafikleri gerçekten çok iyi ama optimizasyon biraz sıkıntılı.",
            "Yeni kontrolcü aldım, {game} ile denedim. Fark inanılmaz.",
            "{game} için 40 saat harcadım ve hâlâ bitiremedim.",
            "Kooperatif oynamak isteyen var mı? {game} açık.",
            "{game} müzikleri gün boyu kulağımda.",
            "{list} listeme yeni oyunlar ekledim, önerilere açığım.",
            "Bu ay {list} listesindeki her şeyi bitirmeyi hedefliyorum.",
            "Uzun zamandır bu kadar keyif almamıştım.",
            "Bugün hiç oynayamadım, yarın telafi ederim.",
            "Boss savaşları için sabır gerekiyor, öğrendim.",
            "Yeni sezon başladı, herkes hazır mı?",
            "Klavye mi kontrolcü mü tartışması hiç bitmeyecek galiba.",
            "Bir oyunu ikinci kez bitirmek bambaşka bir deneyim.",
            "{game} bence son yılların en iyi işlerinden biri.",
            "Erken erişimden çıkalı bir yıl oldu ve hâlâ güncelleniyor, saygı duyuyorum.",
            "Hikâye odaklı oyunlar için önerilerinizi bekliyorum.",
            "{game} yeni yamayla çok daha akıcı çalışıyor."
        };

        private static readonly string[] ReplyTemplates =
        {
            "Kesinlikle katılıyorum.",
            "Bende de aynı sorun vardı, yamayla düzeldi.",
            "Listeye ekledim, teşekkürler.",
            "Ben pek sevmemiştim açıkçası.",
            "Hangi platformda oynuyorsun?",
            "Zorluk ayarını yükseltince çok daha keyifli.",
            "Bunu duyduğuma sevindim.",
            "Ben de tam bunu düşünüyordum.",
            "Kaç saat sürdü sende?",
            "Yorumun için teşekkürler."
        };

        private static readonly string[][] PollTemplates =
        {
            new[] { "Klavye ve fare", "Kontrolcü" },
            new[] { "Hikâye modu", "Çok oyunculu", "İkisi de" },
            new[] { "Kolay", "Normal", "Zor", "En zor" },
            new[] { "Hemen alırım", "İndirim beklerim", "İlgilenmiyorum" },
            new[] { "PC", "PlayStation", "Xbox", "Switch" }
        };
    }

    /// <summary>Sahte icerik temizliginin (ya da onizlemesinin) tablo bazli sonucu.</summary>
    public sealed class FakeContentPurgeReport
    {
        public bool DryRun { get; set; }
        public Dictionary<string, int> Counts { get; } = new();
        public int AffectedGames { get; set; }
        public int AffectedPosts { get; set; }
        public int AffectedLists { get; set; }
    }
}
