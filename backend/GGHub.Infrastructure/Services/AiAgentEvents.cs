using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Core.Specifications;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Kullanici hareketlerinden bot tepki gorevi uretir (kuyruk: AiAgentTasks). Gorevi motor
    /// (AiAgentEngine) isler. Burada yalnizca "tepki verilsin mi, kim, ne zaman" karari var;
    /// metin uretimi ve yazma motorda.
    ///
    /// Kurallar:
    ///   - Motor kapaliysa (AiSettings.AgentsEnabled) hic gorev yazilmaz.
    ///   - Tetikleyen kullanici UYGUN olmali (AiInteractionPolicy): DOB, 18+, ayar acik.
    ///   - Bot DM'ine yanit 20-60 sn; bot gonderisine yanit ya da bot etiketlenmesi 1-5 dk;
    ///     kullanicinin ILK gonderisi/incelemesi kesin, sonrakiler olasilikla.
    ///   - Gonderi basina bot yaniti ve kullanici basina gunluk bot tepkisi tavanli.
    ///   - Kendiliginden tepki (ilk gonderi/inceleme) icin tercihen metnin dilindeki bir bot secilir;
    ///     cevap her durumda insanin yazdigi dilde yazilir (AiAgentTaskProcessor).
    /// </summary>
    public class AiAgentEvents : IAiAgentEvents
    {
        /// <summary>Bir kullaniciya gunde en fazla kac bot gonderi yaniti / inceleme yorumu / liste yorumu (tepki + planli).</summary>
        internal const int MaxPublicReactionsPerUserPerDay = 4;
        private const double LaterPostReplyChance = 0.25;
        private const double LaterReviewCommentChance = 0.30;
        private const double LaterListCommentChance = 0.30;

        /// <summary>Liste bu kadar oyuna ulasinca yorumlanabilir (daha azinda takilacak malzeme yok).</summary>
        internal const int MinGamesForListComment = 3;

        private readonly GGHubDbContext _context;
        private readonly IAiSettingsProvider _settings;
        private readonly IAiAgentDirectory _directory;
        private readonly IAiInteractionPolicy _policy;
        private readonly ILogger<AiAgentEvents> _logger;

        public AiAgentEvents(
            GGHubDbContext context,
            IAiSettingsProvider settings,
            IAiAgentDirectory directory,
            IAiInteractionPolicy policy,
            ILogger<AiAgentEvents> logger)
        {
            _context = context;
            _settings = settings;
            _directory = directory;
            _policy = policy;
            _logger = logger;
        }

        public async Task OnDirectMessageAsync(int senderId, int recipientId, int messageId)
        {
            try
            {
                if (!(await _settings.GetAsync()).AgentsEnabled) return;

                var agents = await _directory.GetAgentIdsAsync();
                if (!agents.Contains(recipientId) || agents.Contains(senderId)) return;
                if (!await IsEnabledAgentAsync(recipientId)) return;
                if (!await _policy.CanInteractAsync(senderId)) return;

                // Bekleyen yanit varsa yenisini acma: motor yanit yazarken konusmanin son
                // mesajlarini zaten okuyor; art arda uc mesaja uc ayri yanit gelmesin.
                var pending = await _context.AiAgentTasks.AnyAsync(t =>
                    t.AgentUserId == recipientId &&
                    t.TargetUserId == senderId &&
                    t.Type == AiAgentTaskType.ReplyToDirectMessage &&
                    (t.Status == AiAgentTaskStatus.Pending || t.Status == AiAgentTaskStatus.Running));
                if (pending) return;

                // Kisa gecikme: kullanici DM'de cevap bekler (gonderi yanitlarindaki dakikalar burada uzun).
                await AddTaskAsync(recipientId, AiAgentTaskType.ReplyToDirectMessage, TimeSpan.FromSeconds(Random.Shared.Next(5, 16)),
                    targetUserId: senderId, triggerMessageId: messageId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[AiAgents] DM tepki gorevi yazilamadi (mesaj {MessageId}).", messageId);
            }
        }

        public async Task OnPostCreatedAsync(int postId, int authorId, int? parentPostId, IReadOnlyCollection<int> mentionedUserIds)
        {
            try
            {
                var settings = await _settings.GetAsync();
                if (!settings.AgentsEnabled) return;

                var agents = await _directory.GetAgentIdsAsync();
                if (agents.Contains(authorId)) return;
                if (!await _policy.CanInteractAsync(authorId)) return;

                var rootId = parentPostId ?? postId;
                var responders = new List<int>();

                // (a) Bot gonderisine yanit verildi: o bot cevap versin.
                if (parentPostId.HasValue)
                {
                    var parentAuthor = await _context.Posts.AsNoTracking()
                        .Where(p => p.Id == parentPostId.Value)
                        .Select(p => (int?)p.UserId)
                        .FirstOrDefaultAsync();
                    if (parentAuthor.HasValue && agents.Contains(parentAuthor.Value))
                    {
                        responders.Add(parentAuthor.Value);
                    }
                }

                // (b) Bot etiketlendi.
                foreach (var mentioned in mentionedUserIds.Where(agents.Contains).Take(2))
                {
                    if (!responders.Contains(mentioned)) responders.Add(mentioned);
                }

                if (!await UnderUserDailyCapAsync(authorId)) return;

                if (responders.Count > 0)
                {
                    foreach (var agentId in responders)
                    {
                        if (!await IsEnabledAgentAsync(agentId)) continue;
                        if (!await UnderPostCapAsync(rootId, settings.MaxAgentRepliesPerPost)) break;
                        await AddTaskAsync(agentId, AiAgentTaskType.ReplyToPost, TimeSpan.FromSeconds(Random.Shared.Next(60, 301)),
                            targetUserId: authorId, targetPostId: rootId);
                    }
                    return;
                }

                // (c) Kok gonderi: ilk gonderi kesin, sonrakiler olasilikla.
                if (parentPostId.HasValue) return;

                var rootCount = await _context.Posts.CountAsync(p =>
                    p.UserId == authorId && p.ParentPostId == null && p.RepostOfPostId == null);
                var isFirst = rootCount <= 1;
                if (!isFirst && Random.Shared.NextDouble() >= LaterPostReplyChance) return;
                if (!await UnderPostCapAsync(rootId, settings.MaxAgentRepliesPerPost)) return;

                var content = await _context.Posts.AsNoTracking().Where(p => p.Id == postId).Select(p => p.Content).FirstOrDefaultAsync();
                var agent = await PickAgentAsync(await LanguageOfAsync(authorId, content));
                if (agent is null) return;

                var delay = isFirst
                    ? TimeSpan.FromSeconds(Random.Shared.Next(120, 601))
                    : TimeSpan.FromSeconds(Random.Shared.Next(300, 1801));
                await AddTaskAsync(agent.Value, AiAgentTaskType.ReplyToPost, delay, targetUserId: authorId, targetPostId: rootId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[AiAgents] Gonderi tepki gorevi yazilamadi (gonderi {PostId}).", postId);
            }
        }

        public async Task OnReviewCreatedAsync(int reviewId, int authorId)
        {
            try
            {
                if (!(await _settings.GetAsync()).AgentsEnabled) return;

                var agents = await _directory.GetAgentIdsAsync();
                if (agents.Contains(authorId)) return;
                if (!await _policy.CanInteractAsync(authorId)) return;
                if (!await UnderUserDailyCapAsync(authorId)) return;

                var content = await _context.Reviews.AsNoTracking().Where(r => r.Id == reviewId).Select(r => r.Content).FirstOrDefaultAsync();

                // (a) Incelemede bot etiketlendi: etiketlenen bot(lar) yorum yazar (gonderideki etiketle ayni kural).
                var mentioned = await MentionedEnabledAgentIdsAsync(content);
                if (mentioned.Count > 0)
                {
                    foreach (var agentId in mentioned.Take(2))
                    {
                        await AddTaskAsync(agentId, AiAgentTaskType.CommentOnReview, TimeSpan.FromSeconds(Random.Shared.Next(60, 301)),
                            targetUserId: authorId, targetReviewId: reviewId);
                    }
                    return;
                }

                // (b) Etiket yok: ilk inceleme kesin, sonrakiler olasilikla; metnin dilindeki bir bot.
                var reviewCount = await _context.Reviews.CountAsync(r => r.UserId == authorId);
                var isFirst = reviewCount <= 1;
                if (!isFirst && Random.Shared.NextDouble() >= LaterReviewCommentChance) return;

                var agent = await PickAgentAsync(await LanguageOfAsync(authorId, content));
                if (agent is null) return;

                await AddTaskAsync(agent.Value, AiAgentTaskType.CommentOnReview,
                    TimeSpan.FromSeconds(Random.Shared.Next(300, 2401)),
                    targetUserId: authorId, targetReviewId: reviewId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[AiAgents] Inceleme tepki gorevi yazilamadi (inceleme {ReviewId}).", reviewId);
            }
        }

        public async Task OnReviewCommentCreatedAsync(int reviewId, int commentId, int authorId)
        {
            try
            {
                if (!(await _settings.GetAsync()).AgentsEnabled) return;

                var agents = await _directory.GetAgentIdsAsync();
                if (agents.Contains(authorId)) return;
                if (!await _policy.CanInteractAsync(authorId)) return;

                // Yalniz BOTUN incelemesine gelen yorum: inceleme sahibi bot tek seviye cevap verir
                // (islenirken AiAgentTaskProcessor.ReplyToReviewCommentAsync). Baska birinin incelemesindeki
                // bot etiketi yalnizca riza kapisindan gecer, bot orada cevap yazmaz.
                var reviewAuthorId = await _context.Reviews.AsNoTracking()
                    .Where(r => r.Id == reviewId).Select(r => (int?)r.UserId).FirstOrDefaultAsync();
                if (reviewAuthorId is not int botId || !agents.Contains(botId)) return;
                if (!await IsEnabledAgentAsync(botId)) return;
                if (!await UnderUserDailyCapAsync(authorId)) return;

                var pending = await _context.AiAgentTasks.AnyAsync(t =>
                    t.TargetCommentId == commentId &&
                    (t.Status == AiAgentTaskStatus.Pending || t.Status == AiAgentTaskStatus.Running));
                if (pending) return;

                await AddTaskAsync(botId, AiAgentTaskType.CommentOnReview, TimeSpan.FromSeconds(Random.Shared.Next(60, 301)),
                    targetUserId: authorId, targetReviewId: reviewId, targetCommentId: commentId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[AiAgents] Inceleme yorumu tepki gorevi yazilamadi (yorum {CommentId}).", commentId);
            }
        }

        public async Task OnListCommentCreatedAsync(int listId, int commentId, int authorId, int? parentCommentId)
        {
            try
            {
                if (!(await _settings.GetAsync()).AgentsEnabled) return;

                var agents = await _directory.GetAgentIdsAsync();
                if (agents.Contains(authorId)) return;
                if (!await _policy.CanInteractAsync(authorId)) return;

                // Bot yalnizca herkese acik listede konusur (takipciye ozel listeyi gormesi icin
                // sahibini takip etmesi gerekirdi; gizli listede hic isi yok).
                var isPublic = await _context.UserLists.AsNoTracking()
                    .AnyAsync(l => l.Id == listId && l.Visibility == ListVisibilitySetting.Public);
                if (!isPublic) return;

                var content = await _context.UserListComments.AsNoTracking()
                    .Where(c => c.Id == commentId).Select(c => c.Content).FirstOrDefaultAsync();

                // (a) Yorumda bot etiketlendi: etiketlenen bot(lar) cevap verir.
                var responders = (await MentionedEnabledAgentIdsAsync(content)).Take(2).ToList();

                // (b) Botun liste yorumuna yanit verildi: o bot cevap verir.
                if (responders.Count == 0 && parentCommentId.HasValue)
                {
                    var parentAuthor = await _context.UserListComments.AsNoTracking()
                        .Where(c => c.Id == parentCommentId.Value).Select(c => (int?)c.UserId).FirstOrDefaultAsync();
                    if (parentAuthor is int botId && agents.Contains(botId) && await IsEnabledAgentAsync(botId))
                    {
                        responders.Add(botId);
                    }
                }

                if (responders.Count == 0) return;
                if (!await UnderUserDailyCapAsync(authorId)) return;

                var pending = await _context.AiAgentTasks.AnyAsync(t =>
                    t.Type == AiAgentTaskType.CommentOnList && t.TargetCommentId == commentId &&
                    (t.Status == AiAgentTaskStatus.Pending || t.Status == AiAgentTaskStatus.Running));
                if (pending) return;

                foreach (var agentId in responders)
                {
                    await AddTaskAsync(agentId, AiAgentTaskType.CommentOnList, TimeSpan.FromSeconds(Random.Shared.Next(60, 301)),
                        targetUserId: authorId, targetCommentId: commentId, targetListId: listId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[AiAgents] Liste yorumu tepki gorevi yazilamadi (yorum {CommentId}).", commentId);
            }
        }

        public async Task OnListGameAddedAsync(int listId, int ownerId)
        {
            try
            {
                if (!(await _settings.GetAsync()).AgentsEnabled) return;

                var agents = await _directory.GetAgentIdsAsync();
                if (agents.Contains(ownerId)) return;

                var list = await _context.UserLists.AsNoTracking()
                    .Where(l => l.Id == listId && l.UserId == ownerId)
                    .Select(l => new { l.Name, l.Description, l.Type, l.Visibility, GameCount = l.UserListGames.Count() })
                    .FirstOrDefaultAsync();
                if (list is null || list.Type != UserListType.Custom || list.Visibility != ListVisibilitySetting.Public) return;

                // Yalnizca esige ULASILDIGI anda: 4. ve sonraki oyunlar yeniden tetiklemez.
                if (list.GameCount != MinGamesForListComment) return;
                if (!await _policy.CanInteractAsync(ownerId)) return;
                if (!await UnderUserDailyCapAsync(ownerId)) return;

                // Liste basina tek kendiliginden yorum (oyun cikarip yeniden eklemek tekrar ettirmez).
                var already = await _context.AiAgentTasks.AnyAsync(t =>
                    t.Type == AiAgentTaskType.CommentOnList && t.TargetListId == listId && t.TargetCommentId == null);
                if (already) return;

                // Ilk yorumlanabilir liste kesin, sonrakiler olasilikla.
                var commentable = await _context.UserLists.CountAsync(l =>
                    l.UserId == ownerId && l.Type == UserListType.Custom && l.Visibility == ListVisibilitySetting.Public &&
                    l.UserListGames.Count() >= MinGamesForListComment);
                var isFirst = commentable <= 1;
                if (!isFirst && Random.Shared.NextDouble() >= LaterListCommentChance) return;

                var agent = await PickAgentAsync(await LanguageOfAsync(ownerId, $"{list.Name} {list.Description}"));
                if (agent is null) return;

                await AddTaskAsync(agent.Value, AiAgentTaskType.CommentOnList,
                    TimeSpan.FromSeconds(Random.Shared.Next(300, 1801)),
                    targetUserId: ownerId, targetListId: listId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[AiAgents] Liste tepki gorevi yazilamadi (liste {ListId}).", listId);
            }
        }

        // ------------------------------------------------------------------

        /// <summary>Metinde "@kullaniciadi" ile etiketlenen ACIK botlarin kimlikleri.</summary>
        private async Task<List<int>> MentionedEnabledAgentIdsAsync(string? content)
        {
            var handles = MentionService.ExtractHandles(content);
            if (handles.Count == 0) return new List<int>();
            var normalized = handles.Select(UsernameNormalizer.Normalize).ToList();
            return await _context.AiAgentProfiles
                .Where(p => p.IsEnabled && !p.User.IsDeleted && !p.User.IsBanned && normalized.Contains(p.User.UsernameNormalized))
                .Select(p => p.UserId)
                .ToListAsync();
        }

        private Task<bool> IsEnabledAgentAsync(int agentId)
            => _context.AiAgentProfiles.AnyAsync(p => p.UserId == agentId && p.IsEnabled);

        /// <summary>Insan metninin dili; belirlenemezse (emoji, yalniz oyun adi) yazarin arayuz tercihi.</summary>
        private async Task<string> LanguageOfAsync(int authorId, string? content)
        {
            var detected = AiLanguage.Detect(content);
            if (detected is not null) return detected;
            var locale = await _context.Users.AsNoTracking().Where(u => u.Id == authorId).Select(u => u.PreferredLocale).FirstOrDefaultAsync();
            return AiLanguage.FromLocale(locale);
        }

        /// <summary>Rastgele acik bot; dil verildiyse o dildekilerden (yoksa herhangi biri).</summary>
        private async Task<int?> PickAgentAsync(string? lang)
        {
            var agents = await _context.AiAgentProfiles
                .Where(p => p.IsEnabled && !p.User.IsDeleted && !p.User.IsBanned)
                .Select(p => new { p.UserId, p.Language })
                .ToListAsync();
            var sameLanguage = agents.Where(a => a.Language == lang).ToList();
            var pool = sameLanguage.Count > 0 ? sameLanguage : agents;
            return pool.Count == 0 ? null : pool[Random.Shared.Next(pool.Count)].UserId;
        }

        private async Task<bool> UnderPostCapAsync(int rootPostId, int cap)
        {
            // Bot sohbet sahnesinde tavan yok: botlar orada zaten konusuyor ve rizali bir insan araya
            // girince muhatap bot ona cevap verebilmeli. Kullanici basina gunluk tavan yine gecerli.
            if (await _context.AiConversations.AnyAsync(c => c.RootPostId == rootPostId)) return true;

            var agents = await _directory.GetAgentIdsAsync();
            var agentList = agents.ToList();
            var existing = await _context.Posts.CountAsync(p => p.ParentPostId == rootPostId && agentList.Contains(p.UserId));
            var pending = await _context.AiAgentTasks.CountAsync(t =>
                t.TargetPostId == rootPostId &&
                t.Type == AiAgentTaskType.ReplyToPost &&
                (t.Status == AiAgentTaskStatus.Pending || t.Status == AiAgentTaskStatus.Running));
            return existing + pending < cap;
        }

        private async Task<bool> UnderUserDailyCapAsync(int userId)
        {
            var since = DateTime.UtcNow.AddHours(-24);
            var count = await _context.AiAgentTasks.CountAsync(t =>
                t.TargetUserId == userId &&
                (t.Type == AiAgentTaskType.ReplyToPost || t.Type == AiAgentTaskType.CommentOnReview ||
                 t.Type == AiAgentTaskType.CommentOnList) &&
                t.CreatedAt >= since);
            return count < MaxPublicReactionsPerUserPerDay;
        }

        private async Task AddTaskAsync(
            int agentId, AiAgentTaskType type, TimeSpan delay,
            int? targetUserId = null, int? targetPostId = null, int? targetReviewId = null, int? triggerMessageId = null,
            int? targetCommentId = null, int? targetListId = null)
        {
            var task = new AiAgentTask
            {
                AgentUserId = agentId,
                Type = type,
                Status = AiAgentTaskStatus.Pending,
                TargetUserId = targetUserId,
                TargetPostId = targetPostId,
                TargetReviewId = targetReviewId,
                TargetCommentId = targetCommentId,
                TargetListId = targetListId,
                TriggerMessageId = triggerMessageId,
                ScheduledAt = DateTime.UtcNow + delay,
                CreatedAt = DateTime.UtcNow
            };

            // Cagiranla AYNI DbContext paylasiliyor. Kayit basarisiz olursa gorevi izleyiciden
            // cikar; yoksa cagiranin sonraki SaveChanges'i onu tekrar yazmaya calisip patlardi.
            _context.AiAgentTasks.Add(task);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch
            {
                _context.Entry(task).State = EntityState.Detached;
                throw;
            }
        }
    }
}
