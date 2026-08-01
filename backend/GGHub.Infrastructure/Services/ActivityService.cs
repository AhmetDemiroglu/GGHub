using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Enums;
using GGHub.Core.Specifications;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Services
{
    public class ActivityService : IActivityService
    {
        private readonly GGHubDbContext _context;
        private readonly IUserDtoEnricher _userDtoEnricher;

        // Somut tip (arayuz degil) BILEREK: gonderi kartinin cizimi MapAsync ve
        // WithIncludes uzerinden yapiliyor, ikisi de Post ENTITY'siyle calisiyor.
        // Bunlari IPostService'e tasimak Core entity'lerini Application arayuzune
        // sizdirirdi; kod tabani entity'leri o katmanin disinda tutuyor.
        private readonly PostService _postService;

        public ActivityService(
            GGHubDbContext context,
            IUserDtoEnricher userDtoEnricher,
            PostService postService)
        {
            _context = context;
            _userDtoEnricher = userDtoEnricher;
            _postService = postService;
        }

        /// <summary>
        /// Bir aktivite kartinda okuyucuya bagli alani olan tum UserDto'lari duzlestirir.
        /// Enricher sayfa basina tek batch calissin diye.
        /// </summary>
        private static IEnumerable<UserDto?> CollectUsers(IEnumerable<ActivityDto> activities)
        {
            foreach (var activity in activities)
            {
                yield return activity.Actor;
                yield return activity.FollowData;

                // Gonderi kartinda yazar Actor ile ayni nesne DEGIL; repost'ta
                // ise kaynak gonderinin yazari bambaska biri. Ikisi de buraya
                // girmezse profil linki ve takip butonu bos bayrakla cizilir.
                if (activity.PostData != null)
                {
                    yield return activity.PostData.Author;
                    if (activity.PostData.RepostOf != null) yield return activity.PostData.RepostOf.Author;
                }
            }
        }

        public async Task<IEnumerable<ActivityDto>> GetUserActivityFeedAsync(string username, int? currentUserId = null, int limit = 20)
        {
            // Gorunurluk + engel kontrolu tek kapidan gecer (ProfileContentAccess).
            var user = await ProfileContentAccess.GetViewableUserAsync(_context, username, currentUserId);

            if (user == null) return Enumerable.Empty<ActivityDto>();

            // Kapiyi gectikten SONRA liste gorunurlugu icin gerekli: kapi "profili gorebilir mi"yi,
            // bu ikisi "hangi listeleri gorebilir"i yanitlar.
            var isOwner = currentUserId == user.Id;
            var isFollowing = currentUserId.HasValue &&
                              await _context.Follows.AnyAsync(f => f.FollowerId == currentUserId.Value && f.FolloweeId == user.Id);

            // 1. REVIEWS (Son X adet)
            var reviews = await _context.Reviews
                .AsNoTracking()
                .Where(r => r.UserId == user.Id)
                .Include(r => r.Game)
                .OrderByDescending(r => r.CreatedAt)
                .Take(limit)
                .Select(r => new ActivityDto
                {
                    Id = r.Id,
                    Type = ActivityType.Review,
                    OccurredAt = r.CreatedAt,
                    ReviewData = new ReviewActivityDto
                    {
                        ReviewId = r.Id,
                        Rating = r.Rating,
                        ContentSnippet = r.Content.Length > 100 ? r.Content.Substring(0, 100) + "..." : r.Content,
                        Game = new GameSummaryDto
                        {
                            Id = r.Game.Id,
                            Name = r.Game.Name,
                            Slug = r.Game.Slug,
                            CoverImage = r.Game.CoverImage,
                            BackgroundImage = r.Game.BackgroundImage,
                            Rating = r.Game.Rating
                        }
                    }
                })
                .ToListAsync();

            // 2. LISTS  
            var lists = await _context.UserLists
                .AsNoTracking()
                .Where(l => l.UserId == user.Id)
                .Where(l =>
                    isOwner ||
                    l.Visibility == ListVisibilitySetting.Public ||
                    (l.Visibility == ListVisibilitySetting.Followers && isFollowing))
                .Include(l => l.UserListGames).ThenInclude(ulg => ulg.Game)
                .OrderByDescending(l => l.CreatedAt)
                .Take(limit)
                .Select(l => new ActivityDto
                {
                    Id = l.Id,
                    Type = ActivityType.ListCreated,
                    OccurredAt = l.CreatedAt,
                    ListData = new ListActivityDto
                    {
                        ListId = l.Id,
                        Name = l.Name,
                        GameCount = l.UserListGames.Count,
                        PreviewImages = l.UserListGames.OrderBy(g => g.AddedAt).Take(3).Select(g => g.Game.BackgroundImage).ToList()
                    }
                })
                .ToListAsync();

            // 3. FOLLOWS  
            var follows = await _context.Follows
                .AsNoTracking()
                .Where(f => f.FollowerId == user.Id && !f.Followee.IsDeleted)
                .Include(f => f.Followee)
                .OrderByDescending(f => f.CreatedAt) 
                .Take(limit)
                .Select(f => new ActivityDto
                {
                    Id = f.FolloweeId,
                    Type = ActivityType.FollowUser,
                    OccurredAt = f.CreatedAt,
                    FollowData = new UserDto
                    {
                        Id = f.Followee.Id,
                        Username = f.Followee.Username,
                        ProfileImageUrl = f.Followee.ProfileImageUrl,
                        FirstName = f.Followee.FirstName,
                        LastName = f.Followee.LastName
                    }
                })
                .ToListAsync();

            // 4. MERGE & SORT
            var feed = reviews
                .Concat(lists)
                .Concat(follows)
                .OrderByDescending(a => a.OccurredAt)
                .Take(limit)
                .ToList();

            // Yalnizca donen sayfa zenginlestirilir; Take'ten once cagirmak bosa is olurdu.
            await _userDtoEnricher.EnrichAsync(CollectUsers(feed), currentUserId);

            return feed;
        }
        public async Task<IEnumerable<ActivityDto>> GetPersonalizedFeedAsync(int currentUserId, int limit = 20, DateTime? cursor = null, ActivityType? type = null)
        {
            if (limit <= 0) limit = 20;
            if (limit > 50) limit = 50;

            // Mobil sekmeler tek tipe filtreler (İncelemeler/Listeler/Takipler);
            // null ise "Hepsi" (tümü birleşir).
            var wantReviews = type is null or ActivityType.Review;
            var wantLists = type is null or ActivityType.ListCreated;
            var wantFollows = type is null or ActivityType.FollowUser;

            // Npgsql timestamptz için UTC Kind zorunlu; query-string binding Local/Unspecified verebilir.
            if (cursor.HasValue && cursor.Value.Kind != DateTimeKind.Utc)
            {
                cursor = cursor.Value.Kind == DateTimeKind.Local
                    ? cursor.Value.ToUniversalTime()
                    : DateTime.SpecifyKind(cursor.Value, DateTimeKind.Utc);
            }

            var followingIds = await _context.Follows
                .AsNoTracking()
                .Where(f => f.FollowerId == currentUserId)
                .Select(f => f.FolloweeId)
                .ToListAsync();

            // X'in Following akışı gibi: kullanıcı kendi aktivitelerini de akışta görür.
            if (!followingIds.Contains(currentUserId))
                followingIds.Add(currentUserId);

            // Engel listesi (iki yönlü): takip kartlarının hedefi engelli kullanıcı olabilir.
            var blockedIds = await _context.UserBlocks
                .AsNoTracking()
                .Where(b => b.BlockerId == currentUserId || b.BlockedId == currentUserId)
                .Select(b => b.BlockerId == currentUserId ? b.BlockedId : b.BlockerId)
                .ToListAsync();
            var blockedSet = blockedIds.ToHashSet();

            // Karşılıklı takip (affinity sinyali): beni de takip eden takip ettiklerim.
            var mutualIds = (await _context.Follows
                .AsNoTracking()
                .Where(f => f.FolloweeId == currentUserId && followingIds.Contains(f.FollowerId))
                .Select(f => f.FollowerId)
                .ToListAsync()).ToHashSet();

            var candidates = new List<(ActivityDto Dto, int Engagement)>();

            if (wantReviews)
                candidates.AddRange(await BuildReviewCandidatesAsync(currentUserId, followingIds, limit, cursor));

            if (wantLists)
                candidates.AddRange(await BuildListCandidatesAsync(followingIds, limit, cursor));

            if (wantFollows)
                candidates.AddRange(await BuildFollowCandidatesAsync(followingIds, blockedSet, limit, cursor));

            // Sayfa = cursor sonrası kronolojik ilk `limit` kayıt (cursor tutarlılığı için).
            // Sıralama = sayfa içinde skorlamalı (recency decay x tip ağırlığı + engagement + affinity).
            var page = candidates
                .OrderByDescending(c => c.Dto.OccurredAt)
                .Take(limit)
                .ToList();

            var now = DateTime.UtcNow;
            var scored = page
                .Select(c => (c.Dto, Score: ComputeFeedScore(c.Dto, c.Engagement, now, mutualIds)))
                .OrderByDescending(x => x.Score)
                .ToList();

            // Yazar çeşitliliği: aynı kullanıcının ardışık kartları sayfayı domine etmesin.
            var actorSeen = new Dictionary<int, int>();
            var reranked = scored
                .Select(x =>
                {
                    var actorId = x.Dto.Actor?.Id ?? 0;
                    actorSeen.TryGetValue(actorId, out var n);
                    actorSeen[actorId] = n + 1;
                    return (x.Dto, Score: x.Score * Math.Pow(0.85, n));
                })
                .OrderByDescending(x => x.Score)
                .Select(x => x.Dto)
                .ToList();

            await _userDtoEnricher.EnrichAsync(CollectUsers(reranked), currentUserId);

            return reranked;
        }

        // ==================================================================
        // Sekme tabanli akis (yeni istemciler)
        // ==================================================================

        public async Task<IEnumerable<ActivityDto>> GetFeedAsync(
            int currentUserId, FeedTab tab, int limit = 20, DateTime? cursor = null)
        {
            if (limit <= 0) limit = 20;
            if (limit > 50) limit = 50;
            cursor = NormalizeCursor(cursor);

            return tab switch
            {
                // Sekme, eski ?type=0 yolunun BIREBIR aynisi. Tek satirda
                // delege ediliyor ki iki yol zamanla birbirinden sapmasin.
                FeedTab.Reviews => await GetPersonalizedFeedAsync(currentUserId, limit, cursor, ActivityType.Review),
                FeedTab.Discover => await GetDiscoverFeedAsync(currentUserId, limit, cursor),
                _ => await GetPostFeedAsync(currentUserId, limit, cursor)
            };
        }

        /// <summary>
        /// "Gonderiler" sekmesi: takip ettiklerimin ve kendimin gonderi/repost'lari.
        /// X'in Following akisinin gonderi karsiligi.
        /// </summary>
        private async Task<IEnumerable<ActivityDto>> GetPostFeedAsync(
            int currentUserId, int limit, DateTime? cursor)
        {
            var (followingIds, blockedSet, mutualIds) = await LoadSocialGraphAsync(currentUserId);
            var candidates = await BuildPostCandidatesAsync(currentUserId, followingIds, limit, cursor);

            return await FinalizeAsync(candidates, currentUserId, limit, mutualIds, null);
        }

        /// <summary>
        /// "Kesfet" sekmesi. Kaldirilan Listeler/Takipler/Hepsi sekmelerinin
        /// icerigini TASIR (ag ici kaynak) ve uzerine zevk grafigine dayali ag
        /// disi kesfi ekler. Boylece eski sekmelerde gorunen hicbir sey kaybolmuyor.
        ///
        /// Maliyet kontrolu: her aday sorgusunda sabit Take var, zevk kumesi
        /// TasteGameCap ile kirpiliyor. Istek basina sorgu sayisi gonderi
        /// sayisindan BAGIMSIZ.
        /// </summary>
        private async Task<IEnumerable<ActivityDto>> GetDiscoverFeedAsync(
            int currentUserId, int limit, DateTime? cursor)
        {
            var (followingIds, blockedSet, mutualIds) = await LoadSocialGraphAsync(currentUserId);
            var taste = await BuildTasteProfileAsync(currentUserId);

            // --- (a) AG ICI: eski sekmelerin icerigi ---
            var candidates = new List<(ActivityDto Dto, int Engagement)>();
            var sourceOf = new Dictionary<ActivityDto, DiscoverSource>();
            var seenKeys = new HashSet<string>();

            void Add(IEnumerable<(ActivityDto Dto, int Engagement)> items, DiscoverSource source)
            {
                foreach (var item in items)
                {
                    // Tekillestirme ICERIK anahtariyla: ActivityDto bir sinif ve
                    // deger esitligi yok, dolayisiyla nesne referansiyla kiyaslamak
                    // ayni gonderinin iki farkli kaynaktan gelen kopyalarini
                    // yakalamazdi. Bugun aday kaynaklari ayrik yazar kumeleri
                    // uzerinden calisiyor ama bu ince bir degismez; kaynak eklerken
                    // birinin gozunden kacarsa akista cift kart cikardi.
                    if (!seenKeys.Add(ActivityKey(item.Dto))) continue;
                    candidates.Add(item);
                    sourceOf[item.Dto] = source;
                }
            }

            Add(await BuildPostCandidatesAsync(currentUserId, followingIds, limit, cursor), DiscoverSource.InNetwork);
            Add(await BuildReviewCandidatesAsync(currentUserId, followingIds, limit, cursor), DiscoverSource.InNetwork);
            Add(await BuildListCandidatesAsync(followingIds, limit, cursor), DiscoverSource.InNetwork);
            Add(await BuildFollowCandidatesAsync(followingIds, blockedSet, limit, cursor), DiscoverSource.InNetwork);

            var seenIds = new HashSet<int>(followingIds);

            // --- (b) AG DISI ZEVK: ilgilendigim oyunlar hakkinda yazanlar ---
            if (taste.GameIds.Count > 0)
            {
                var tasteAuthorIds = await _context.Reviews
                    .AsNoTracking()
                    .Where(r => taste.GameIds.Contains(r.GameId) && !seenIds.Contains(r.UserId))
                    .Where(r => !blockedSet.Contains(r.UserId))
                    .OrderByDescending(r => r.CreatedAt)
                    .Select(r => r.UserId)
                    .Distinct()
                    .Take(AuthorFanoutCap)
                    .ToListAsync();

                // Ayni oyunlari ETIKETLEYEN gonderiler de zevk sinyali.
                var mentionAuthorIds = await _context.PostMentions
                    .AsNoTracking()
                    .Where(m => m.TargetGameId != null && taste.GameIds.Contains(m.TargetGameId.Value))
                    .Where(m => !seenIds.Contains(m.Post.UserId) && !blockedSet.Contains(m.Post.UserId))
                    .OrderByDescending(m => m.Post.CreatedAt)
                    .Select(m => m.Post.UserId)
                    .Distinct()
                    .Take(AuthorFanoutCap)
                    .ToListAsync();

                var tasteIds = tasteAuthorIds.Concat(mentionAuthorIds).Distinct().ToList();
                if (tasteIds.Count > 0)
                {
                    Add(await BuildPostCandidatesAsync(currentUserId, tasteIds, limit, cursor), DiscoverSource.Taste);
                    Add(await BuildReviewCandidatesAsync(currentUserId, tasteIds, limit, cursor), DiscoverSource.Taste);
                    foreach (var id in tasteIds) seenIds.Add(id);
                }
            }

            // --- (c) AG DISI SOSYAL: takip ettiklerimden en az 2 kisinin takip ettikleri ---
            var fofCounts = await _context.Follows
                .AsNoTracking()
                .Where(f => followingIds.Contains(f.FollowerId) && !seenIds.Contains(f.FolloweeId))
                .Where(f => !blockedSet.Contains(f.FolloweeId))
                .GroupBy(f => f.FolloweeId)
                .Select(g => new { UserId = g.Key, Count = g.Count() })
                .Where(x => x.Count >= MinMutualFollowersForFof)
                .OrderByDescending(x => x.Count)
                .Take(AuthorFanoutCap)
                .ToDictionaryAsync(x => x.UserId, x => x.Count);

            if (fofCounts.Count > 0)
            {
                var fofIds = fofCounts.Keys.ToList();
                Add(await BuildPostCandidatesAsync(currentUserId, fofIds, limit, cursor), DiscoverSource.FriendOfFriend);
                Add(await BuildReviewCandidatesAsync(currentUserId, fofIds, limit, cursor), DiscoverSource.FriendOfFriend);
                foreach (var id in fofIds) seenIds.Add(id);
            }

            // --- (d) TREND: yalnizca sayfa kisa kalirsa (soguk acilis) ---
            if (candidates.Count < limit)
            {
                var trendingAuthorIds = await _context.Posts
                    .AsNoTracking()
                    .WhereRootLevel()
                    .WhereVisibleTo(_context, currentUserId)
                    .Where(p => p.CreatedAt > DateTime.UtcNow.AddHours(-TrendingWindowHours))
                    .Where(p => !seenIds.Contains(p.UserId))
                    .OrderByDescending(p => p.LikeCount + p.ReplyCount + p.RepostCount)
                    .Select(p => p.UserId)
                    .Distinct()
                    .Take(AuthorFanoutCap)
                    .ToListAsync();

                if (trendingAuthorIds.Count > 0)
                    Add(await BuildPostCandidatesAsync(currentUserId, trendingAuthorIds, limit, cursor), DiscoverSource.Trending);
            }

            return await FinalizeAsync(candidates, currentUserId, limit, mutualIds, new DiscoverContext(taste, sourceOf, followingIds.ToHashSet()));
        }

        /// <summary>
        /// Adaylari sayfaya indirger: kronolojik kirpma -> skorlama ->
        /// yazar cesitliligi -> (Kesfet'te) kaynak cesitliligi -> zenginlestirme.
        /// </summary>
        private async Task<IEnumerable<ActivityDto>> FinalizeAsync(
            List<(ActivityDto Dto, int Engagement)> candidates,
            int currentUserId,
            int limit,
            HashSet<int> mutualIds,
            DiscoverContext? discover)
        {
            // Sayfa = cursor sonrasi kronolojik ilk `limit` kayit (cursor tutarliligi).
            var page = candidates
                .OrderByDescending(c => c.Dto.OccurredAt)
                .Take(limit)
                .ToList();

            var now = DateTime.UtcNow;
            var scored = page
                .Select(c =>
                {
                    var score = ComputeFeedScore(c.Dto, c.Engagement, now, mutualIds);
                    if (discover != null) score += DiscoverBoost(c.Dto, discover);
                    return (c.Dto, Score: score);
                })
                .OrderByDescending(x => x.Score)
                .ToList();

            // Yazar cesitliligi: ayni kullanicinin ardisik kartlari sayfayi domine etmesin.
            var actorSeen = new Dictionary<int, int>();
            var reranked = scored
                .Select(x =>
                {
                    var actorId = x.Dto.Actor?.Id ?? 0;
                    actorSeen.TryGetValue(actorId, out var n);
                    actorSeen[actorId] = n + 1;
                    return (x.Dto, Score: x.Score * Math.Pow(0.85, n));
                })
                .OrderByDescending(x => x.Score)
                .Select(x => x.Dto)
                .ToList();

            if (discover != null) reranked = ApplySourceDiversity(reranked, discover, limit);

            await _userDtoEnricher.EnrichAsync(CollectUsers(reranked), currentUserId);

            return reranked;
        }

        /// <summary>
        /// Kesfet'e ozgu skor eklentileri.
        /// </summary>
        private static double DiscoverBoost(ActivityDto activity, DiscoverContext ctx)
        {
            var boost = 0.0;

            // Konu oyunu dogrudan zevk kumemde.
            var gameId = activity.ReviewData?.Game?.Id;
            if (gameId.HasValue && ctx.Taste.GameIds.Contains(gameId.Value)) boost += 0.25;

            // Gonderi ilgilendigim bir oyunu etiketlemis.
            if (activity.PostData?.Mentions.Any(m =>
                    m.Type == MentionTargetType.Game && ctx.Taste.GameIds.Contains(m.Id)) == true)
            {
                boost += 0.25;
            }

            // Ag disi ceza: tanidiklarim once gelsin, kesif onlarin arasina serpilsin.
            var actorId = activity.Actor?.Id ?? 0;
            if (actorId != 0 && !ctx.FollowingIds.Contains(actorId)) boost -= 0.10;

            if (ctx.SourceOf.TryGetValue(activity, out var source) && source == DiscoverSource.FriendOfFriend)
                boost += 0.08;

            return boost;
        }

        /// <summary>
        /// Tek bir aday kaynagi sayfanin %40'indan fazlasini dolduramaz. Bu
        /// tavan olmadan Kesfet, kullanicinin ag'i sessiz oldugu gun tamamen
        /// trend listesine donusur ve "kesif" hissi kaybolur.
        /// </summary>
        private static List<ActivityDto> ApplySourceDiversity(
            List<ActivityDto> ranked, DiscoverContext ctx, int limit)
        {
            var cap = Math.Max(1, (int)Math.Ceiling(limit * SourceShareCap));
            var used = new Dictionary<DiscoverSource, int>();
            var kept = new List<ActivityDto>();
            var overflow = new List<ActivityDto>();

            foreach (var dto in ranked)
            {
                var source = ctx.SourceOf.TryGetValue(dto, out var s) ? s : DiscoverSource.InNetwork;
                used.TryGetValue(source, out var n);

                if (n < cap)
                {
                    used[source] = n + 1;
                    kept.Add(dto);
                }
                else
                {
                    overflow.Add(dto);
                }
            }

            // Tavan yuzunden sayfa eksik kaldiysa taşanlarla doldur: kullaniciya
            // bos akis gostermektense cesitlilikten odun vermek yeglenir.
            if (kept.Count < limit) kept.AddRange(overflow.Take(limit - kept.Count));

            return kept;
        }

        /// <summary>
        /// Kullanicinin ilgilendigi oyun kumesi. En son TasteGameCap kayitla
        /// sinirli: sinir olmadan cok listeli bir hesap her Kesfet isteginde
        /// binlerce satir okuturdu.
        /// </summary>
        private async Task<TasteProfile> BuildTasteProfileAsync(int currentUserId)
        {
            // Kendi olusturdugum + takip ettigim listelerdeki oyunlar.
            // Istek listesi ve favoriler de birer UserList (sistem listesi).
            var listIds = await _context.UserLists
                .AsNoTracking()
                .Where(l => l.UserId == currentUserId)
                .Select(l => l.Id)
                .Union(_context.UserListFollows
                    .AsNoTracking()
                    .Where(f => f.FollowerUserId == currentUserId)
                    .Select(f => f.FollowedListId))
                .ToListAsync();

            var gameIds = new HashSet<int>();

            if (listIds.Count > 0)
            {
                var fromLists = await _context.UserListGames
                    .AsNoTracking()
                    .Where(ulg => listIds.Contains(ulg.UserListId))
                    .OrderByDescending(ulg => ulg.AddedAt)
                    .Select(ulg => ulg.GameId)
                    .Take(TasteGameCap)
                    .ToListAsync();

                foreach (var id in fromLists) gameIds.Add(id);
            }

            // Yuksek puan verdigim oyunlar en guclu sinyal.
            var fromReviews = await _context.Reviews
                .AsNoTracking()
                .Where(r => r.UserId == currentUserId && r.Rating >= HighRatingThreshold)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => r.GameId)
                .Take(TasteGameCap)
                .ToListAsync();

            foreach (var id in fromReviews) gameIds.Add(id);

            // Kendi gonderilerimde etiketledigim oyunlar.
            var fromMentions = await _context.PostMentions
                .AsNoTracking()
                .Where(m => m.TargetGameId != null && m.Post.UserId == currentUserId)
                .OrderByDescending(m => m.Post.CreatedAt)
                .Select(m => m.TargetGameId!.Value)
                .Take(TasteGameCap)
                .ToListAsync();

            foreach (var id in fromMentions) gameIds.Add(id);

            return new TasteProfile(gameIds);
        }

        private async Task<(List<int> FollowingIds, HashSet<int> BlockedSet, HashSet<int> MutualIds)>
            LoadSocialGraphAsync(int currentUserId)
        {
            var followingIds = await _context.Follows
                .AsNoTracking()
                .Where(f => f.FollowerId == currentUserId)
                .Select(f => f.FolloweeId)
                .ToListAsync();

            // X'in Following akisi gibi: kullanici kendi aktivitelerini de gorur.
            if (!followingIds.Contains(currentUserId)) followingIds.Add(currentUserId);

            var blockedSet = (await _context.UserBlocks
                .AsNoTracking()
                .Where(b => b.BlockerId == currentUserId || b.BlockedId == currentUserId)
                .Select(b => b.BlockerId == currentUserId ? b.BlockedId : b.BlockerId)
                .ToListAsync()).ToHashSet();

            var mutualIds = (await _context.Follows
                .AsNoTracking()
                .Where(f => f.FolloweeId == currentUserId && followingIds.Contains(f.FollowerId))
                .Select(f => f.FollowerId)
                .ToListAsync()).ToHashSet();

            return (followingIds, blockedSet, mutualIds);
        }

        private static DateTime? NormalizeCursor(DateTime? cursor)
        {
            if (!cursor.HasValue || cursor.Value.Kind == DateTimeKind.Utc) return cursor;

            return cursor.Value.Kind == DateTimeKind.Local
                ? cursor.Value.ToUniversalTime()
                : DateTime.SpecifyKind(cursor.Value, DateTimeKind.Utc);
        }

        /// <summary>
        /// Bir aktivite kartinin icerik kimligi. Takip kartlarinda Id her zaman
        /// 0 oldugu icin aktor + hedef ikilisi kullanilmak zorunda; istemcilerdeki
        /// activityKey/getActivityKey ile ayni mantik.
        /// </summary>
        private static string ActivityKey(ActivityDto dto) => dto.Type switch
        {
            ActivityType.FollowUser => $"f-{dto.Actor?.Id}-{dto.FollowData?.Id}-{dto.OccurredAt:O}",
            _ => $"{(int)dto.Type}-{dto.Id}"
        };

        private enum DiscoverSource { InNetwork, Taste, FriendOfFriend, Trending }

        private sealed record TasteProfile(HashSet<int> GameIds);

        private sealed record DiscoverContext(
            TasteProfile Taste,
            Dictionary<ActivityDto, DiscoverSource> SourceOf,
            HashSet<int> FollowingIds);

        // Zevk kumesi tavani: bunsuz cok listeli bir hesapta her istek binlerce satir okur.
        private const int TasteGameCap = 200;
        // Her aday kaynagindan cekilecek azami YAZAR sayisi.
        private const int AuthorFanoutCap = 40;
        // Arkadasin arkadasi sayilmak icin gereken ortak takipci sayisi.
        private const int MinMutualFollowersForFof = 2;
        // "Yuksek puan" esigi (Rating 1-10 olcegi).
        private const int HighRatingThreshold = 7;
        private const int TrendingWindowHours = 48;
        // Tek kaynagin sayfadaki azami payi.
        private const double SourceShareCap = 0.40;

        // ==================================================================
        // Aday ureticileri
        //
        // GetPersonalizedFeedAsync (eski ?type= yolu) ve Kesfet AYNI kaynaklari
        // kullaniyor. Sorgular kopyalansaydi iki akis zamanla birbirinden
        // sapardi; bu yuzden tek yerde duruyorlar.
        // ==================================================================

        private async Task<List<(ActivityDto Dto, int Engagement)>> BuildReviewCandidatesAsync(
            int currentUserId, List<int> authorIds, int limit, DateTime? cursor)
        {
            var query = _context.Reviews
                .AsNoTracking()
                .Where(r => authorIds.Contains(r.UserId) && !r.User.IsDeleted && !r.User.IsBanned);

            // Yazarin profil gorunurlugu: akista da oyun sayfasindaki gibi suzuluyor.
            query = query.Where(r =>
                r.User.ProfileVisibility == ProfileVisibilitySetting.Public ||
                r.User.Id == currentUserId ||
                (r.User.ProfileVisibility == ProfileVisibilitySetting.Followers &&
                 _context.Follows.Any(f => f.FolloweeId == r.User.Id && f.FollowerId == currentUserId)));

            if (cursor.HasValue) query = query.Where(r => r.CreatedAt < cursor.Value);

            var reviews = await query
                .OrderByDescending(r => r.CreatedAt)
                .Take(limit)
                .Select(r => new
                {
                    LikeCount = r.ReviewVotes.Count(v => v.Value == 1),
                    CommentCount = r.Comments.Count(c => c.ParentCommentId == null),
                    MyVote = r.ReviewVotes
                        .Where(v => v.UserId == currentUserId)
                        .Select(v => (int?)v.Value)
                        .FirstOrDefault(),
                    Dto = new ActivityDto
                    {
                        Id = r.Id,
                        Type = ActivityType.Review,
                        OccurredAt = r.CreatedAt,
                        Actor = new UserDto
                        {
                            Id = r.User.Id,
                            Username = r.User.Username,
                            ProfileImageUrl = r.User.ProfileImageUrl,
                            FirstName = r.User.FirstName,
                            LastName = r.User.LastName
                        },
                        ReviewData = new ReviewActivityDto
                        {
                            ReviewId = r.Id,
                            Rating = r.Rating,
                            ContentSnippet = r.Content.Length > 100 ? r.Content.Substring(0, 100) + "..." : r.Content,
                            Game = new GameSummaryDto
                            {
                                Id = r.Game.Id,
                                RawgId = r.Game.RawgId,
                                Name = r.Game.Name,
                                Slug = r.Game.Slug,
                                CoverImage = r.Game.CoverImage,
                                BackgroundImage = r.Game.BackgroundImage,
                                Released = r.Game.Released
                            }
                        }
                    }
                })
                .ToListAsync();

            foreach (var r in reviews)
            {
                r.Dto.ReviewData!.LikeCount = r.LikeCount;
                r.Dto.ReviewData!.CommentCount = r.CommentCount;
                r.Dto.ReviewData!.MyVote = r.MyVote;
            }

            return reviews.Select(r => (r.Dto, r.LikeCount + r.CommentCount)).ToList();
        }

        private async Task<List<(ActivityDto Dto, int Engagement)>> BuildListCandidatesAsync(
            List<int> authorIds, int limit, DateTime? cursor)
        {
            var query = _context.UserLists
                .AsNoTracking()
                .Where(l => authorIds.Contains(l.UserId) && !l.User.IsDeleted && !l.User.IsBanned &&
                           (l.Visibility == ListVisibilitySetting.Public || l.Visibility == ListVisibilitySetting.Followers));

            if (cursor.HasValue) query = query.Where(l => l.CreatedAt < cursor.Value);

            var lists = await query
                .OrderByDescending(l => l.CreatedAt)
                .Take(limit)
                .Select(l => new
                {
                    Dto = new ActivityDto
                    {
                        Id = l.Id,
                        Type = ActivityType.ListCreated,
                        OccurredAt = l.CreatedAt,
                        Actor = new UserDto
                        {
                            Id = l.User.Id,
                            Username = l.User.Username,
                            ProfileImageUrl = l.User.ProfileImageUrl,
                            FirstName = l.User.FirstName,
                            LastName = l.User.LastName
                        },
                        ListData = new ListActivityDto
                        {
                            ListId = l.Id,
                            Name = l.Name,
                            GameCount = l.UserListGames.Count,
                            PreviewImages = l.UserListGames
                                             .OrderBy(ulg => ulg.AddedAt)
                                             .Take(3)
                                             .Select(ulg => ulg.Game.CoverImage)
                                             .ToList()
                        }
                    },
                    Engagement = l.RatingCount + l.Followers.Count + l.Comments.Count
                })
                .ToListAsync();

            return lists.Select(l => (l.Dto, l.Engagement)).ToList();
        }

        private async Task<List<(ActivityDto Dto, int Engagement)>> BuildFollowCandidatesAsync(
            List<int> actorIds, HashSet<int> blockedSet, int limit, DateTime? cursor)
        {
            var query = _context.Follows
                .AsNoTracking()
                .Where(f => actorIds.Contains(f.FollowerId) &&
                            !f.Follower.IsDeleted && !f.Follower.IsBanned &&
                            !f.Followee.IsDeleted && !f.Followee.IsBanned);

            if (cursor.HasValue) query = query.Where(f => f.CreatedAt < cursor.Value);

            var followDtos = await query
                .OrderByDescending(f => f.CreatedAt)
                .Take(limit)
                .Select(f => new ActivityDto
                {
                    Id = 0,
                    Type = ActivityType.FollowUser,
                    OccurredAt = f.CreatedAt,
                    Actor = new UserDto
                    {
                        Id = f.Follower.Id,
                        Username = f.Follower.Username,
                        ProfileImageUrl = f.Follower.ProfileImageUrl,
                        FirstName = f.Follower.FirstName,
                        LastName = f.Follower.LastName
                    },
                    FollowData = new UserDto
                    {
                        Id = f.FolloweeId,
                        Username = f.Followee.Username,
                        ProfileImageUrl = f.Followee.ProfileImageUrl,
                        FirstName = f.Followee.FirstName,
                        LastName = f.Followee.LastName
                    }
                })
                .ToListAsync();

            return followDtos
                .Where(f => f.FollowData == null || !blockedSet.Contains(f.FollowData.Id))
                .Select(f => (f, 0))
                .ToList();
        }

        /// <summary>
        /// Gonderi ve repost adaylari. Gorunurluk suzgeci EF tarafinda
        /// PostQueryExtensions.WhereVisibleTo ile uygulaniyor; repost zinciri de
        /// orada kontrol ediliyor.
        /// </summary>
        private async Task<List<(ActivityDto Dto, int Engagement)>> BuildPostCandidatesAsync(
            int currentUserId, List<int>? authorIds, int limit, DateTime? cursor)
        {
            var query = _context.Posts
                .AsNoTracking()
                .WhereRootLevel()
                .WhereVisibleTo(_context, currentUserId);

            // authorIds null ise ag disi arama (Kesfet); dolu ise ag ici.
            if (authorIds != null) query = query.Where(p => authorIds.Contains(p.UserId));

            query = PostService.ApplyCursor(query, cursor);

            var posts = await PostService.WithIncludes(query)
                .OrderByDescending(p => p.CreatedAt)
                .Take(limit)
                .ToListAsync();

            if (posts.Count == 0) return new List<(ActivityDto, int)>();

            var mapped = await _postService.MapAsync(posts, currentUserId);

            return mapped.Select(p => (
                new ActivityDto
                {
                    Id = p.Id,
                    Type = p.RepostOf != null ? ActivityType.Repost : ActivityType.Post,
                    OccurredAt = p.CreatedAt,
                    Actor = p.Author,
                    PostData = p
                },
                p.LikeCount + p.ReplyCount + p.RepostCount)).ToList();
        }

        private static double ComputeFeedScore(ActivityDto activity, int engagement, DateTime now, HashSet<int> mutualIds)
        {
            var hours = Math.Max(0, (now - activity.OccurredAt).TotalHours);
            var recency = Math.Exp(-hours / 36.0);

            var typeWeight = activity.Type switch
            {
                ActivityType.Review => 1.0,
                // Gonderi platformun birincil icerigi; inceleme ile ayni agirlikta.
                ActivityType.Post => 1.0,
                ActivityType.ListCreated => 0.92,
                // Repost turetilmis icerik: ayni sey iki kez one cikmasin.
                ActivityType.Repost => 0.70,
                ActivityType.FollowUser => 0.55,
                _ => 0.5
            };

            var engagementBoost = Math.Log10(1 + Math.Min(engagement, 50)) * 0.15;
            var affinityBoost = activity.Actor != null && mutualIds.Contains(activity.Actor.Id) ? 0.10 : 0.0;

            return recency * typeWeight + engagementBoost + affinityBoost;
        }
    }
}
