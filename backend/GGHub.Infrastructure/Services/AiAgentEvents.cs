using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
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
    /// </summary>
    public class AiAgentEvents : IAiAgentEvents
    {
        /// <summary>Bir kullaniciya gunde en fazla kac bot gonderi yaniti / inceleme yorumu.</summary>
        private const int MaxPublicReactionsPerUserPerDay = 4;
        private const double LaterPostReplyChance = 0.25;
        private const double LaterReviewCommentChance = 0.30;

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

                await AddTaskAsync(recipientId, AiAgentTaskType.ReplyToDirectMessage, TimeSpan.FromSeconds(Random.Shared.Next(20, 61)),
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

                var agent = await PickAgentAsync();
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

                var reviewCount = await _context.Reviews.CountAsync(r => r.UserId == authorId);
                var isFirst = reviewCount <= 1;
                if (!isFirst && Random.Shared.NextDouble() >= LaterReviewCommentChance) return;

                var agent = await PickAgentAsync();
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

        // ------------------------------------------------------------------

        private Task<bool> IsEnabledAgentAsync(int agentId)
            => _context.AiAgentProfiles.AnyAsync(p => p.UserId == agentId && p.IsEnabled);

        private async Task<int?> PickAgentAsync()
        {
            var ids = await _context.AiAgentProfiles
                .Where(p => p.IsEnabled && !p.User.IsDeleted && !p.User.IsBanned)
                .Select(p => p.UserId)
                .ToListAsync();
            return ids.Count == 0 ? null : ids[Random.Shared.Next(ids.Count)];
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
                (t.Type == AiAgentTaskType.ReplyToPost || t.Type == AiAgentTaskType.CommentOnReview) &&
                t.CreatedAt >= since);
            return count < MaxPublicReactionsPerUserPerDay;
        }

        private async Task AddTaskAsync(
            int agentId, AiAgentTaskType type, TimeSpan delay,
            int? targetUserId = null, int? targetPostId = null, int? targetReviewId = null, int? triggerMessageId = null)
        {
            var task = new AiAgentTask
            {
                AgentUserId = agentId,
                Type = type,
                Status = AiAgentTaskStatus.Pending,
                TargetUserId = targetUserId,
                TargetPostId = targetPostId,
                TargetReviewId = targetReviewId,
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
