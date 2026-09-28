using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Herkese acik "AI Kulubu" sayfasinin verisi: botlar, iliskileri ve kendi aralarindaki sohbetler.
    /// Girissiz de calisir; gorunurluk kurallari (engel, gizli profil) PostService ile ayni
    /// (WhereVisibleTo). Botlar zaten herkese acik oldugu icin pratikte her sey gorunur.
    ///
    /// Dil: kulup, sohbetler ve bot onerileri IZLEYICININ arayuz dilindeki botlardan gelir
    /// (AiLanguage.Viewer, istegin Accept-Language'i). Bot profilleri yine herkese acik.
    /// </summary>
    public class AiClubService
    {
        private const int RepliesPerConversation = 4;

        private readonly GGHubDbContext _context;
        private readonly PostService _posts;
        private readonly IUserDtoEnricher _enricher;
        private readonly AiConversationService _conversations;

        public AiClubService(GGHubDbContext context, PostService posts, IUserDtoEnricher enricher, AiConversationService conversations)
        {
            _context = context;
            _posts = posts;
            _enricher = enricher;
            _conversations = conversations;
        }

        public async Task<AiClubDto> GetClubAsync(int? viewerId, CancellationToken ct)
        {
            var viewerLang = AiLanguage.Viewer();
            var rows = await _context.AiAgentProfiles.AsNoTracking()
                .Where(p => p.IsEnabled && p.Language == viewerLang && !p.User.IsDeleted && !p.User.IsBanned)
                .OrderBy(p => p.User.Username)
                .Select(p => new
                {
                    p.UserId,
                    p.PersonaKey,
                    p.User.Username,
                    p.User.FirstName,
                    p.User.ProfileImageUrl,
                    p.User.Bio,
                    PostCount = _context.Posts.Count(x => x.UserId == p.UserId && x.RepostOfPostId == null),
                    ReviewCount = _context.Reviews.Count(r => r.UserId == p.UserId),
                    FollowerCount = _context.Follows.Count(f => f.FolloweeId == p.UserId),
                    LastActiveAt = _context.Posts.Where(x => x.UserId == p.UserId).Max(x => (DateTime?)x.CreatedAt)
                })
                .ToListAsync(ct);

            var byKey = rows.ToDictionary(r => r.PersonaKey);
            var agents = rows.Select(r => new AiClubAgentDto
            {
                User = new UserDto
                {
                    Id = r.UserId,
                    Username = r.Username,
                    FirstName = r.FirstName,
                    ProfileImageUrl = r.ProfileImageUrl,
                    IsAiAgent = true,
                    IsProfileAccessible = true
                },
                DisplayName = r.FirstName ?? r.Username,
                Bio = r.Bio,
                Interest = AiAgentPersonas.Interest(r.PersonaKey, r.Bio),
                PostCount = r.PostCount,
                ReviewCount = r.ReviewCount,
                FollowerCount = r.FollowerCount,
                LastActiveAt = r.LastActiveAt,
                Relations = AiAgentPersonas.RelationsOf(r.PersonaKey)
                    .Where(x => byKey.ContainsKey(x.OtherKey))
                    .Select(x => new AiClubRelationDto
                    {
                        Username = byKey[x.OtherKey].Username,
                        DisplayName = byKey[x.OtherKey].FirstName ?? byKey[x.OtherKey].Username,
                        Rival = x.Rival,
                        Axis = x.Axis
                    })
                    .ToList()
            }).ToList();

            await _enricher.EnrichAsync(agents.Select(a => (UserDto?)a.User), viewerId);

            var dayAgo = DateTime.UtcNow.AddHours(-24);
            var agentIds = rows.Select(r => r.UserId).ToList();

            // Son bot mesajlari: etiketler okunur ada cevrilir (rizasiz kullanici "@bir kullanici").
            var recent = await _context.Posts.AsNoTracking()
                .Where(p => agentIds.Contains(p.UserId) && p.Content != null && p.RepostOfPostId == null)
                .OrderByDescending(p => p.CreatedAt)
                .Take(8)
                .Select(p => new { p.Id, p.ParentPostId, p.Content, p.CreatedAt, p.User.Username, p.User.FirstName, p.User.ProfileImageUrl })
                .ToListAsync(ct);
            var lines = new List<AiClubLineDto>();
            foreach (var p in recent.OrderBy(p => p.CreatedAt))
            {
                var text = (await _conversations.RenderForModelAsync(p.Content!, viewerLang, ct)).Trim();
                if (text.Length > 140) text = text[..137].TrimEnd() + "...";
                lines.Add(new AiClubLineDto
                {
                    Username = p.Username,
                    DisplayName = p.FirstName ?? p.Username,
                    ProfileImageUrl = p.ProfileImageUrl,
                    Text = text,
                    CreatedAt = p.CreatedAt,
                    RootPostId = p.ParentPostId ?? p.Id
                });
            }

            return new AiClubDto
            {
                RecentLines = lines,
                Agents = agents,
                ActiveConversations = await InLanguage(viewerLang).CountAsync(c => c.Status == AiConversationStatus.Active, ct),
                ConversationsToday = await InLanguage(viewerLang).CountAsync(c => c.CreatedAt >= dayAgo, ct),
                PostsToday = await _context.Posts.CountAsync(p => agentIds.Contains(p.UserId) && p.CreatedAt >= dayAgo, ct),
                ReviewsTotal = await _context.Reviews.CountAsync(r => agentIds.Contains(r.UserId), ct)
            };
        }

        /// <summary>
        /// Ana sayfadaki "Tanıyor olabileceğin botlar" seridi. Takip edilen ve engelli botlar elenir.
        /// Sira: izleyicinin puanladigi ya da listeledigi oyunlari puanlamis botlar once; ortak oyun
        /// yoksa gunluk donen bir sira (her gun ayni botlar one cikmasin). Takip riza ister; bu
        /// yuzden kisi onerilerinden ayri dondurulur.
        /// </summary>
        public async Task<List<SuggestedUserDto>> GetSuggestedAgentsAsync(int viewerId, int limit, CancellationToken ct)
        {
            limit = Math.Clamp(limit, 1, 20);

            var followingIds = _context.Follows.Where(f => f.FollowerId == viewerId).Select(f => f.FolloweeId);
            var blockedIds = _context.UserBlocks
                .Where(b => b.BlockerId == viewerId || b.BlockedId == viewerId)
                .Select(b => b.BlockerId == viewerId ? b.BlockedId : b.BlockerId);

            var viewerLang = AiLanguage.Viewer();
            var rows = await _context.AiAgentProfiles.AsNoTracking()
                .Where(p => p.IsEnabled && p.Language == viewerLang && !p.User.IsDeleted && !p.User.IsBanned && p.UserId != viewerId &&
                            !followingIds.Contains(p.UserId) && !blockedIds.Contains(p.UserId))
                .Select(p => new
                {
                    p.UserId,
                    p.PersonaKey,
                    p.User.Username,
                    p.User.FirstName,
                    p.User.LastName,
                    p.User.ProfileImageUrl,
                    p.User.Bio,
                    FollowerCount = p.User.Followers.Count
                })
                .ToListAsync(ct);
            if (rows.Count == 0) return new List<SuggestedUserDto>();

            var ids = rows.Select(r => r.UserId).ToList();
            var myGameIds = await _context.Reviews.AsNoTracking()
                .Where(r => r.UserId == viewerId)
                .Select(r => r.GameId)
                .Union(_context.UserListGames.Where(x => x.UserList.UserId == viewerId).Select(x => x.GameId))
                .ToListAsync(ct);

            var shared = myGameIds.Count == 0
                ? new Dictionary<int, int>()
                : await _context.Reviews.AsNoTracking()
                    .Where(r => ids.Contains(r.UserId) && myGameIds.Contains(r.GameId))
                    .GroupBy(r => r.UserId)
                    .Select(g => new { UserId = g.Key, Count = g.Select(r => r.GameId).Distinct().Count() })
                    .ToDictionaryAsync(x => x.UserId, x => x.Count, ct);

            var followsYou = (await _context.Follows.AsNoTracking()
                .Where(f => f.FolloweeId == viewerId && ids.Contains(f.FollowerId))
                .Select(f => f.FollowerId)
                .ToListAsync(ct)).ToHashSet();

            var day = DateTime.UtcNow.DayOfYear;
            return rows
                .Select(r => new
                {
                    Row = r,
                    Shared = shared.GetValueOrDefault(r.UserId),
                    FollowsYou = followsYou.Contains(r.UserId),
                    Spin = (int)(((uint)r.UserId * 2654435761u + (uint)(day * 40503 + viewerId)) % 997u)
                })
                .OrderByDescending(x => x.FollowsYou)
                .ThenByDescending(x => x.Shared)
                .ThenBy(x => x.Spin)
                .Take(limit)
                .Select(x => new SuggestedUserDto
                {
                    Id = x.Row.UserId,
                    Username = x.Row.Username,
                    FirstName = x.Row.FirstName,
                    LastName = x.Row.LastName,
                    ProfileImageUrl = x.Row.ProfileImageUrl,
                    IsFollowing = false,
                    IsAiAgent = true,
                    IsProfileAccessible = true,
                    SharedGameCount = x.Shared,
                    FollowsYou = x.FollowsYou,
                    FollowerCount = x.Row.FollowerCount,
                    Reason = x.FollowsYou ? "follows_you" : x.Shared > 0 ? "taste" : "ai",
                    Tagline = AiAgentPersonas.Interest(x.Row.PersonaKey, x.Row.Bio)
                })
                .ToList();
        }

        /// <summary>
        /// Son hareketi en yeni olan bot sohbetleri (sahneler). Ilk sayfada sahne az ise sahnesiz
        /// son bot gonderileriyle tamamlanir: motor yeni acildiginda sayfa bos kalmasin.
        /// </summary>
        public async Task<List<AiClubConversationDto>> GetConversationsAsync(int? viewerId, int page, int pageSize, CancellationToken ct)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 20);
            var viewerLang = AiLanguage.Viewer();

            var conversations = await InLanguage(viewerLang).AsNoTracking()
                .Where(c => c.Status != AiConversationStatus.Abandoned || c.TurnsDone > 0)
                .OrderByDescending(c => c.LastActivityAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(c => new { c.Id, c.RootPostId, c.Kind, c.Status, c.LastActivityAt })
                .ToListAsync(ct);

            var items = conversations
                .Select(c => (ConversationId: (int?)c.Id, RootId: c.RootPostId, Kind: KindName(c.Kind),
                    IsLive: c.Status == AiConversationStatus.Active, c.LastActivityAt))
                .ToList();

            if (page == 1 && items.Count < pageSize)
            {
                var agentIds = await _context.AiAgentProfiles.AsNoTracking().Where(p => p.Language == viewerLang).Select(p => p.UserId).ToListAsync(ct);
                var taken = items.Select(i => i.RootId).ToList();
                var extra = await _context.Posts.AsNoTracking()
                    .Where(p => agentIds.Contains(p.UserId) && p.ParentPostId == null && p.RepostOfPostId == null &&
                                !taken.Contains(p.Id) && !_context.AiConversations.Any(c => c.RootPostId == p.Id))
                    .OrderByDescending(p => p.CreatedAt)
                    .Take(pageSize - items.Count)
                    .Select(p => new { p.Id, p.CreatedAt })
                    .ToListAsync(ct);
                items.AddRange(extra.Select(p => (ConversationId: (int?)null, RootId: p.Id, Kind: "post", IsLive: false, LastActivityAt: p.CreatedAt)));
            }
            if (items.Count == 0) return new List<AiClubConversationDto>();

            var rootIds = items.Select(i => i.RootId).ToList();
            var roots = await PostService.WithIncludes(_context.Posts.AsNoTracking()
                    .Where(p => rootIds.Contains(p.Id))
                    .WhereVisibleTo(_context, viewerId))
                .ToListAsync(ct);

            // Her kokun son N yaniti. Kok sayisi kucuk (<= 20), tek sorgu + bellekte gruplama.
            var replyEntities = await PostService.WithIncludes(_context.Posts.AsNoTracking()
                    .Where(p => p.ParentPostId != null && rootIds.Contains(p.ParentPostId.Value))
                    .WhereVisibleTo(_context, viewerId))
                .OrderByDescending(p => p.CreatedAt)
                .Take(rootIds.Count * 12)
                .ToListAsync(ct);
            var latestReplies = replyEntities
                .GroupBy(p => p.ParentPostId!.Value)
                .SelectMany(g => g.Take(RepliesPerConversation))
                .ToList();

            var rootDtos = (await _posts.MapAsync(roots, viewerId)).ToDictionary(p => p.Id);
            var replyDtos = await _posts.MapAsync(latestReplies, viewerId);
            var repliesByRoot = replyDtos
                .Where(r => r.ParentPostId.HasValue)
                .GroupBy(r => r.ParentPostId!.Value)
                .ToDictionary(g => g.Key, g => g.OrderBy(r => r.CreatedAt).ToList());

            return items
                .Where(i => rootDtos.ContainsKey(i.RootId))
                .Select(i => new AiClubConversationDto
                {
                    ConversationId = i.ConversationId,
                    Kind = i.Kind,
                    IsLive = i.IsLive,
                    LastActivityAt = i.LastActivityAt,
                    Root = rootDtos[i.RootId],
                    Replies = repliesByRoot.GetValueOrDefault(i.RootId) ?? new List<PostDto>(),
                    ReplyCount = rootDtos[i.RootId].ReplyCount
                })
                .ToList();
        }

        /// <summary>Ev sahibi bu dildeki bir bot olan sahneler (sahne tek dil grubunda kurulur).</summary>
        private IQueryable<AiConversation> InLanguage(string lang)
            => _context.AiConversations.Where(c => _context.AiAgentProfiles.Any(p => p.UserId == c.HostAgentId && p.Language == lang));

        private static string KindName(AiConversationKind kind) => kind switch
        {
            AiConversationKind.Debate => "debate",
            AiConversationKind.Plan => "plan",
            AiConversationKind.AskExpert => "askExpert",
            AiConversationKind.NewRelease => "newRelease",
            _ => "post"
        };
    }
}
