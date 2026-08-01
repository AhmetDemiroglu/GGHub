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
            if (await _context.Users.AnyAsync(u => u.IsSeeded, cancellationToken))
            {
                _logger.LogInformation("Demo content already seeded, skipping.");
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
        /// Demo icerigi tamamen geri alir.
        ///
        /// Silme SIRASI zorunlu: Follow ve UserBlock iki FK'da da Restrict,
        /// PostPollVote.OptionId de Restrict. Sira bozulursa
        /// ReferenceConstraintException alinir ve islem yarida kalir.
        /// </summary>
        public async Task<int> PurgeAsync(CancellationToken cancellationToken = default)
        {
            var userIds = await _context.Users
                .Where(u => u.IsSeeded)
                .Select(u => u.Id)
                .ToListAsync(cancellationToken);

            if (userIds.Count == 0) return 0;

            var postIds = await _context.Posts
                .Where(p => p.IsSeeded || userIds.Contains(p.UserId))
                .Select(p => p.Id)
                .ToListAsync(cancellationToken);

            var pollIds = await _context.PostPolls
                .Where(p => postIds.Contains(p.PostId))
                .Select(p => p.Id)
                .ToListAsync(cancellationToken);

            // 1. Anket oylari (Option'a Restrict FK tasiyor, once bunlar).
            await _context.PostPollVotes
                .Where(v => pollIds.Contains(v.PollId) || userIds.Contains(v.UserId))
                .ExecuteDeleteAsync(cancellationToken);

            // 2. Gonderiye bagli yan tablolar.
            await _context.PostLikes
                .Where(l => postIds.Contains(l.PostId) || userIds.Contains(l.UserId))
                .ExecuteDeleteAsync(cancellationToken);

            await _context.PostMentions
                .Where(m => postIds.Contains(m.PostId) || (m.TargetUserId != null && userIds.Contains(m.TargetUserId.Value)))
                .ExecuteDeleteAsync(cancellationToken);

            await _context.PostImages.Where(i => postIds.Contains(i.PostId)).ExecuteDeleteAsync(cancellationToken);
            await _context.PostPollOptions.Where(o => pollIds.Contains(o.PollId)).ExecuteDeleteAsync(cancellationToken);
            await _context.PostPolls.Where(p => pollIds.Contains(p.Id)).ExecuteDeleteAsync(cancellationToken);

            // 3. Gonderiler: once repost ve yanitlar, sonra kokler (self-FK).
            await _context.Posts
                .Where(p => postIds.Contains(p.Id) && (p.ParentPostId != null || p.RepostOfPostId != null))
                .ExecuteDeleteAsync(cancellationToken);
            await _context.Posts.Where(p => postIds.Contains(p.Id)).ExecuteDeleteAsync(cancellationToken);

            // 4. Kullaniciya bagli Restrict FK tasiyan tablolar.
            await _context.Follows
                .Where(f => userIds.Contains(f.FollowerId) || userIds.Contains(f.FolloweeId))
                .ExecuteDeleteAsync(cancellationToken);

            await _context.UserBlocks
                .Where(b => userIds.Contains(b.BlockerId) || userIds.Contains(b.BlockedId))
                .ExecuteDeleteAsync(cancellationToken);

            await _context.Notifications
                .Where(n => userIds.Contains(n.RecipientUserId) || (n.ActorUserId != null && userIds.Contains(n.ActorUserId.Value)))
                .ExecuteDeleteAsync(cancellationToken);

            await _context.PushTokens.Where(t => userIds.Contains(t.UserId)).ExecuteDeleteAsync(cancellationToken);
            await _context.RefreshTokens.Where(t => userIds.Contains(t.UserId)).ExecuteDeleteAsync(cancellationToken);
            await _context.UserStats.Where(s => userIds.Contains(s.UserId)).ExecuteDeleteAsync(cancellationToken);

            // 5. Kullanicilar.
            var deleted = await _context.Users.Where(u => userIds.Contains(u.Id)).ExecuteDeleteAsync(cancellationToken);

            _logger.LogInformation("Demo content purged: {UserCount} users removed.", deleted);
            return deleted;
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
                    Email = $"{handle}@demo.gghub.social",
                    PasswordHash = hash,
                    PasswordSalt = salt,
                    FirstName = FirstNames[_random.Next(FirstNames.Length)],
                    LastName = LastNames[_random.Next(LastNames.Length)],
                    Bio = Bios[_random.Next(Bios.Length)],
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
                    var poll = new PostPoll
                    {
                        EndsAt = post.CreatedAt.AddDays(_random.Next(1, 8)),
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
}
