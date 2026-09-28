using System.Text.Json;
using System.Text.RegularExpressions;
using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Core.Specifications;
using GGHub.Core.Utilities;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Tek bir bot gorevini isler. Hedef secimi (planli gorevlerde), baglam toplama, metin uretimi
    /// ve yazma burada. Yazma daima MEVCUT servislerden gecer (PostService, SocialService,
    /// ReviewService, ReviewCommentService): gorunurluk, yanit izni, engel, bildirim, SignalR ve
    /// push kurallari insan kullanicilarla birebir ayni isler.
    ///
    /// Sonuc: Done (yazildi), Skipped (uygun hedef yok, kural engelledi) ya da istisna (motor
    /// gorevi Failed yapar ya da yeniden dener).
    /// </summary>
    public class AiAgentTaskProcessor
    {
        /// <summary>Bir kullaniciyi en fazla kac bot takip edebilir.</summary>
        private const int MaxAgentFollowersPerUser = 3;
        private static readonly TimeSpan RecentWindow = TimeSpan.FromHours(48);

        private readonly GGHubDbContext _context;
        private readonly PostService _posts;
        private readonly ISocialService _social;
        private readonly IReviewService _reviews;
        private readonly IReviewCommentService _reviewComments;
        private readonly AiContentWriter _writer;
        private readonly IAiInteractionPolicy _policy;
        private readonly IAiAgentDirectory _directory;
        private readonly IAiSettingsProvider _settings;
        private readonly AiConversationService _conversations;
        private readonly ILogger<AiAgentTaskProcessor> _logger;

        public AiAgentTaskProcessor(
            GGHubDbContext context,
            PostService posts,
            ISocialService social,
            IReviewService reviews,
            IReviewCommentService reviewComments,
            AiContentWriter writer,
            IAiInteractionPolicy policy,
            IAiAgentDirectory directory,
            IAiSettingsProvider settings,
            AiConversationService conversations,
            ILogger<AiAgentTaskProcessor> logger)
        {
            _context = context;
            _posts = posts;
            _social = social;
            _reviews = reviews;
            _reviewComments = reviewComments;
            _writer = writer;
            _policy = policy;
            _directory = directory;
            _settings = settings;
            _conversations = conversations;
            _logger = logger;
        }

        public sealed record Outcome(AiAgentTaskStatus Status, string? Summary, int? ResultEntityId = null, AiText? Text = null)
        {
            public static Outcome Skip(string why) => new(AiAgentTaskStatus.Skipped, why);
        }

        public async Task<Outcome> ProcessAsync(AiAgentTask task, CancellationToken ct)
        {
            var agent = await _context.Users.AsNoTracking()
                .Where(u => u.Id == task.AgentUserId && u.IsAiAgent && !u.IsDeleted && !u.IsBanned)
                .Select(u => new { u.Id, u.Username, u.FirstName })
                .FirstOrDefaultAsync(ct);
            var profile = await _context.AiAgentProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == task.AgentUserId, ct);
            if (agent is null || profile is null || !profile.IsEnabled) return Outcome.Skip("Bot kapali ya da yok.");

            var identity = new AiAgentIdentity(agent.FirstName ?? agent.Username, agent.Username, profile.Persona);

            return task.Type switch
            {
                AiAgentTaskType.ReplyToDirectMessage => await ReplyToDirectMessageAsync(task, identity, ct),
                AiAgentTaskType.WelcomeDirectMessage => await WelcomeAsync(task, identity, ct),
                AiAgentTaskType.ReplyToPost => await ReplyToPostAsync(task, identity, ct),
                AiAgentTaskType.CreatePost => await CreatePostAsync(task, identity, profile, ct),
                AiAgentTaskType.ReviewGame => await ReviewGameAsync(task, identity, profile, ct),
                AiAgentTaskType.CommentOnReview => await CommentOnReviewAsync(task, identity, profile, ct),
                AiAgentTaskType.LikePost => await LikePostAsync(task, ct),
                AiAgentTaskType.FollowUser => await FollowUserAsync(task, ct),
                AiAgentTaskType.StartConversation => await _conversations.StartAsync(task, identity, ct),
                AiAgentTaskType.ConversationTurn => await _conversations.TurnAsync(task, identity, ct),
                _ => Outcome.Skip("Bilinmeyen gorev tipi.")
            };
        }

        // ------------------------------------------------------------------ DM

        private async Task<Outcome> ReplyToDirectMessageAsync(AiAgentTask task, AiAgentIdentity agent, CancellationToken ct)
        {
            if (task.TargetUserId is not int userId) return Outcome.Skip("Hedef yok.");
            if (!await _policy.CanInteractAsync(userId, ct)) return Outcome.Skip("Kullanici AI etkilesimine uygun degil.");
            if (!await UnderDailyMessageCapAsync(userId, ct)) return Outcome.Skip("Kullanicinin gunluk bot mesaji tavani doldu.");

            var partner = await _context.Users.AsNoTracking().Where(u => u.Id == userId).Select(u => u.Username).FirstAsync(ct);

            var recent = await _context.Messages.AsNoTracking()
                .Where(m => (m.SenderId == task.AgentUserId && m.RecipientId == userId) ||
                            (m.SenderId == userId && m.RecipientId == task.AgentUserId))
                .OrderByDescending(m => m.SentAt)
                .Take(12)
                .Select(m => new { m.SenderId, m.Content })
                .ToListAsync(ct);
            recent.Reverse();

            var thread = recent
                .Select(m => new AiThreadLine(m.SenderId == task.AgentUserId, m.SenderId == task.AgentUserId ? agent.Username : partner, m.SenderId == task.AgentUserId, m.Content))
                .ToList();
            if (thread.Count == 0 || thread[^1].FromAgent) return Outcome.Skip("Yanitlanacak yeni mesaj yok.");

            var text = await _writer.WriteDirectMessageReplyAsync(agent, partner, thread, ct);
            if (text is null) return Outcome.Skip("Metin uretilemedi.");

            var sent = await _social.SendMessageAsync(task.AgentUserId, new MessageForCreationDto { RecipientUsername = partner, Content = text.Text });
            return new Outcome(AiAgentTaskStatus.Done, Summary(text.Text), sent?.Id, text);
        }

        private async Task<Outcome> WelcomeAsync(AiAgentTask task, AiAgentIdentity agent, CancellationToken ct)
        {
            var settings = await _settings.GetAsync(ct);
            var agentIds = (await _directory.GetAgentIdsAsync(ct)).ToList();
            var cutoff = AiInteractionRules.AdultBirthCutoffUtc(BirthdayCalendar.TodayInIstanbul());
            var since = DateTime.UtcNow.AddDays(-14);
            var weekAgo = DateTime.UtcNow.AddDays(-7);

            // Uygun yeni kullanici: son 14 gunde katilmis, 18+, AI etkilesimi acik, mesajlari herkese
            // acik, hicbir bottan mesaj almamis ve bu hafta hos geldin gorevi acilmamis.
            var candidates = await _context.Users.AsNoTracking()
                .Where(u => !u.IsAiAgent && !u.IsSeeded && !u.IsDeleted && !u.IsBanned &&
                            u.AllowAiInteraction && u.DateOfBirth != null && u.DateOfBirth <= cutoff &&
                            u.CreatedAt >= since &&
                            u.MessageSetting == MessagePrivacySetting.Everyone &&
                            !_context.Messages.Any(m => m.RecipientId == u.Id && agentIds.Contains(m.SenderId)) &&
                            !_context.UserBlocks.Any(b => (b.BlockerId == u.Id && agentIds.Contains(b.BlockedId))))
                .Where(u => _context.AiAgentTasks.Count(t =>
                    t.TargetUserId == u.Id && t.Type == AiAgentTaskType.WelcomeDirectMessage && t.CreatedAt >= weekAgo &&
                    t.Status == AiAgentTaskStatus.Done) < settings.MaxUnsolicitedDmPerUserPerWeek)
                .OrderBy(u => u.CreatedAt)
                .Select(u => new { u.Id, u.Username })
                .Take(20)
                .ToListAsync(ct);

            var target = candidates.FirstOrDefault(c => true);
            if (target is null) return Outcome.Skip("Hos geldin icin uygun yeni kullanici yok.");
            if (!await _policy.CanInteractAsync(target.Id, ct)) return Outcome.Skip("Kullanici uygun degil.");

            task.TargetUserId = target.Id;

            var recentGames = await _context.Reviews.AsNoTracking()
                .Where(r => r.UserId == target.Id)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => r.Game.Name)
                .Take(3)
                .ToListAsync(ct);

            var text = await _writer.WriteWelcomeMessageAsync(agent, target.Username, recentGames, ct);
            if (text is null) return Outcome.Skip("Metin uretilemedi.");

            var sent = await _social.SendMessageAsync(task.AgentUserId, new MessageForCreationDto { RecipientUsername = target.Username, Content = text.Text });
            return new Outcome(AiAgentTaskStatus.Done, Summary(text.Text), sent?.Id, text);
        }

        // ------------------------------------------------------------------ Gonderi

        private async Task<Outcome> ReplyToPostAsync(AiAgentTask task, AiAgentIdentity agent, CancellationToken ct)
        {
            var settings = await _settings.GetAsync(ct);
            var agentIds = (await _directory.GetAgentIdsAsync(ct)).ToList();

            int rootId;
            if (task.TargetPostId is int given)
            {
                rootId = given;
            }
            else
            {
                // Planli yanit: son 48 saatin herkese acik kok gonderileri; uygun insanlarin ya da
                // diger botlarin. Bot tavanini doldurmus ve bu botun zaten yanitladigi gonderiler elenir.
                var since = DateTime.UtcNow - RecentWindow;
                var cutoff = AiInteractionRules.AdultBirthCutoffUtc(BirthdayCalendar.TodayInIstanbul());
                var candidates = await _context.Posts.AsNoTracking()
                    .Where(p => p.ParentPostId == null && p.RepostOfPostId == null && p.Content != null &&
                                p.CreatedAt >= since && p.UserId != task.AgentUserId &&
                                p.User.PostVisibility == PostVisibilitySetting.Everyone &&
                                p.User.ProfileVisibility == ProfileVisibilitySetting.Public &&
                                p.User.PostReplyPermission == PostReplyPermissionSetting.Everyone &&
                                !p.User.IsDeleted && !p.User.IsBanned &&
                                (p.User.IsAiAgent ||
                                 (p.User.AllowAiInteraction && p.User.DateOfBirth != null && p.User.DateOfBirth <= cutoff)) &&
                                !_context.Posts.Any(r => r.ParentPostId == p.Id && r.UserId == task.AgentUserId) &&
                                !_context.AiConversations.Any(c => c.RootPostId == p.Id) &&
                                _context.Posts.Count(r => r.ParentPostId == p.Id && agentIds.Contains(r.UserId)) < settings.MaxAgentRepliesPerPost)
                    .OrderByDescending(p => p.CreatedAt)
                    .Select(p => p.Id)
                    .Take(15)
                    .ToListAsync(ct);
                if (candidates.Count == 0) return Outcome.Skip("Yanitlanacak uygun gonderi yok.");
                rootId = candidates[Random.Shared.Next(candidates.Count)];
                task.TargetPostId = rootId;
            }

            var root = await _context.Posts.AsNoTracking()
                .Where(p => p.Id == rootId)
                .Select(p => new { p.Id, p.UserId, p.Content, p.ParentPostId, p.User.Username, p.User.IsAiAgent })
                .FirstOrDefaultAsync(ct);
            if (root is null || root.Content is null) return Outcome.Skip("Gonderi silinmis.");
            if (root.ParentPostId is int parentId)
            {
                // Yanitlara yanit verilemiyor (tek seviye); kok gonderiye yanit ver.
                return await ReplyToPostAsync(new AiAgentTask { AgentUserId = task.AgentUserId, TargetPostId = parentId, TargetUserId = task.TargetUserId }, agent, ct);
            }
            if (!root.IsAiAgent && !await _policy.CanInteractAsync(root.UserId, ct))
            {
                return Outcome.Skip("Gonderi sahibi AI etkilesimine uygun degil.");
            }

            // Bot sohbet sahnesinin altinda gonderi basi bot tavani uygulanmaz: orada botlar zaten
            // konusuyor; rizali bir insan araya girince muhatap bot ona cevap verebilmeli.
            var isConversationRoot = await _context.AiConversations.AnyAsync(c => c.RootPostId == rootId, ct);
            var existingAgentReplies = await _context.Posts.CountAsync(p => p.ParentPostId == rootId && agentIds.Contains(p.UserId), ct);
            if (!isConversationRoot && existingAgentReplies >= settings.MaxAgentRepliesPerPost)
                return Outcome.Skip("Gonderinin bot yaniti tavani dolu.");

            var rawReplies = await _context.Posts.AsNoTracking()
                .Where(p => p.ParentPostId == rootId && p.Content != null)
                .OrderByDescending(p => p.CreatedAt)
                .Take(10)
                .Select(p => new { p.Content, p.User.Username, p.User.IsAiAgent, p.UserId })
                .ToListAsync(ct);
            rawReplies.Reverse();

            // Gizlilik: AI etkilesimine riza vermemis insanlarin yanitlari ve adlari modele gitmez.
            var eligibleHumans = new Dictionary<int, string>();
            foreach (var human in rawReplies.Where(r => !r.IsAiAgent).Select(r => new { r.UserId, r.Username }).Distinct())
            {
                if (await _policy.CanInteractAsync(human.UserId, ct)) eligibleHumans[human.UserId] = human.Username;
            }
            var replies = rawReplies.Where(r => r.IsAiAgent || eligibleHumans.ContainsKey(r.UserId)).TakeLast(6).ToList();

            // Son yanit bu botunsa (insan henuz cevap vermediyse) tekrar yazma.
            if (task.TargetPostId is not null && replies.Count > 0 && replies[^1].UserId == task.AgentUserId)
            {
                return Outcome.Skip("Son yanit zaten bu botun.");
            }

            var rootLine = new AiThreadLine(false, root.Username, root.IsAiAgent, await _conversations.RenderForModelAsync(root.Content, ct));
            var replyLines = new List<AiThreadLine>();
            foreach (var r in replies)
            {
                replyLines.Add(new AiThreadLine(r.UserId == task.AgentUserId, r.Username, r.IsAiAgent, await _conversations.RenderForModelAsync(r.Content!, ct)));
            }

            var text = await _writer.WritePostReplyAsync(agent, rootLine, replyLines, ct);
            if (text is null) return Outcome.Skip("Metin uretilemedi.");

            // Etiket yalnizca botlara ve riza vermis katilimcilara (gonderi sahibi dahil) donusur.
            var allowed = await AgentHandlesAsync(ct);
            foreach (var (id, name) in eligibleHumans) allowed[name.ToLowerInvariant()] = id;
            if (root.IsAiAgent || await _policy.CanInteractAsync(root.UserId, ct)) allowed[root.Username.ToLowerInvariant()] = root.UserId;
            var content = AiMentionLinker.Link(text.Text, allowed);

            var created = await _posts.CreateAsync(task.AgentUserId, new PostForCreationDto { Content = content, ParentPostId = rootId });
            return new Outcome(AiAgentTaskStatus.Done, Summary(text.Text), created.Id, text);
        }

        private async Task<Outcome> CreatePostAsync(AiAgentTask task, AiAgentIdentity agent, AiAgentProfile profile, CancellationToken ct)
        {
            var game = await PickGameForPostAsync(task.AgentUserId, profile, ct);
            if (game is null) return Outcome.Skip("Gonderi icin uygun oyun yok.");

            var today = DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");
            var angle = string.CompareOrdinal(game.Released, today) > 0
                ? "yakında çıkacak bu oyun hakkında beklentin"
                : "gündemdeki bu oyun hakkında görüşün";

            // Gonderilerin bir kismi bir dosta ya da tatli rakibe soruyla biter; o bot birkac dakika
            // sonra cevap verir. Botlarin birbirini etiketlemesi akista gorunur sohbet demek.
            var roster = await _conversations.LoadRosterAsync(ct);
            var me = roster.FirstOrDefault(a => a.UserId == task.AgentUserId);
            AiAgentInfo? peer = null;
            if (me is not null && Random.Shared.NextDouble() < 0.4)
            {
                var related = AiAgentPersonas.RelationsOf(me.PersonaKey)
                    .Select(r => roster.FirstOrDefault(a => a.PersonaKey == r.OtherKey))
                    .OfType<AiAgentInfo>()
                    .ToList();
                var pool = related.Count > 0 ? related : roster.Where(a => a.UserId != me.UserId).ToList();
                if (pool.Count > 0) peer = pool[Random.Shared.Next(pool.Count)];
            }

            var text = await _writer.WriteGamePostAsync(agent, Facts(game), angle, ct,
                peer is null || me is null ? null : new AiPeer(peer.Username, AiConversationService.PeerNote(me, peer)));
            if (text is null) return Outcome.Skip("Metin uretilemedi.");

            var content = AiMentionLinker.Link(text.Text, roster.ToDictionary(a => a.Username.ToLowerInvariant(), a => a.UserId));
            content = ReplaceFirst(content, AiContentWriter.GamePlaceholder, $"@[g:{game.Id}]")
                .Replace(AiContentWriter.GamePlaceholder, game.Name);
            task.TargetGameId = game.Id;

            var created = await _posts.CreateAsync(task.AgentUserId, new PostForCreationDto { Content = content });

            if (peer is not null && AiMentionLinker.Mentions(content, peer.UserId))
            {
                _context.AiAgentTasks.Add(new AiAgentTask
                {
                    AgentUserId = peer.UserId,
                    Type = AiAgentTaskType.ReplyToPost,
                    Status = AiAgentTaskStatus.Pending,
                    TargetPostId = created.Id,
                    ScheduledAt = DateTime.UtcNow.AddSeconds(Random.Shared.Next(240, 1501)),
                    CreatedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync(ct);
            }

            return new Outcome(AiAgentTaskStatus.Done, Summary(text.Text.Replace(AiContentWriter.GamePlaceholder, game.Name)), created.Id, text);
        }

        // ------------------------------------------------------------------ Inceleme

        private async Task<Outcome> ReviewGameAsync(AiAgentTask task, AiAgentIdentity agent, AiAgentProfile profile, CancellationToken ct)
        {
            var game = await PickGameForReviewAsync(task.AgentUserId, profile, ct);
            if (game is null) return Outcome.Skip("Inceleme icin uygun oyun yok.");

            // Puan KODDA: elestirmen puani (Metacritic ya da IGDB) + karakter egilimi + kucuk sapma.
            // Model yalnizca bu puanla tutarli metni yazar; puan uydurmaz.
            var baseScore = game.Metacritic.HasValue ? game.Metacritic.Value / 10.0
                : game.IgdbRating.HasValue ? game.IgdbRating.Value / 10.0
                : 7.0;
            var rating = (int)Math.Round(baseScore + profile.RatingBias + (Random.Shared.NextDouble() * 2 - 1));
            rating = Math.Clamp(rating, 1, 10);

            var text = await _writer.WriteReviewAsync(agent, Facts(game), rating, ct);
            if (text is null) return Outcome.Skip("Metin uretilemedi.");

            task.TargetGameId = game.Id;
            var review = await _reviews.CreateReviewAsync(
                new ReviewForCreationDto { GameId = game.RawgId, Rating = rating, Content = text.Text }, task.AgentUserId);
            return new Outcome(AiAgentTaskStatus.Done, $"{game.Name} ({rating}/10): {Summary(text.Text)}", review.Id, text);
        }

        /// <summary>
        /// Inceleme yorumu. Uc yol:
        ///   - Hedef inceleme verildi (insan incelemesine tepki): inceleme sahibi AI etkilesimine uygun olmali.
        ///   - Hedef yok (planli): son 7 gunun BOT incelemelerinden birine, tercihen dost/rakibinkine yorum.
        ///     Inceleme sahibi bot cogunlukla cevap verir (yorum zinciri).
        ///   - Hedef yorum verildi (TargetCommentId): botun kendi incelemesine gelen yoruma cevap.
        /// </summary>
        private async Task<Outcome> CommentOnReviewAsync(AiAgentTask task, AiAgentIdentity agent, AiAgentProfile profile, CancellationToken ct)
        {
            if (task.TargetCommentId is int commentId) return await ReplyToReviewCommentAsync(task, agent, commentId, ct);

            var roster = await _conversations.LoadRosterAsync(ct);
            var me = roster.FirstOrDefault(a => a.UserId == task.AgentUserId);

            int reviewId;
            if (task.TargetReviewId is int given)
            {
                reviewId = given;
            }
            else
            {
                var agentIds = roster.Select(a => a.UserId).ToList();
                var since = DateTime.UtcNow.AddDays(-7);
                var candidates = await _context.Reviews.AsNoTracking()
                    .Where(r => agentIds.Contains(r.UserId) && r.UserId != task.AgentUserId && r.CreatedAt >= since &&
                                !_context.ReviewComments.Any(c => c.ReviewId == r.Id && c.UserId == task.AgentUserId) &&
                                _context.ReviewComments.Count(c => c.ReviewId == r.Id && agentIds.Contains(c.UserId)) < 2)
                    .OrderByDescending(r => r.CreatedAt)
                    .Select(r => new { r.Id, r.UserId })
                    .Take(20)
                    .ToListAsync(ct);
                if (candidates.Count == 0) return Outcome.Skip("Yorumlanacak bot incelemesi yok.");

                var related = me is null
                    ? new HashSet<int>()
                    : AiAgentPersonas.RelationsOf(me.PersonaKey)
                        .Select(r => roster.FirstOrDefault(a => a.PersonaKey == r.OtherKey)?.UserId ?? 0)
                        .ToHashSet();
                var preferred = candidates.Where(c => related.Contains(c.UserId)).ToList();
                var source = preferred.Count > 0 && Random.Shared.NextDouble() < 0.7 ? preferred : candidates;
                reviewId = source[Random.Shared.Next(source.Count)].Id;
                task.TargetReviewId = reviewId;
            }

            var review = await _context.Reviews.AsNoTracking()
                .Where(r => r.Id == reviewId)
                .Select(r => new { r.Id, r.UserId, r.Content, r.Rating, r.User.Username, r.User.IsAiAgent, r.GameId })
                .FirstOrDefaultAsync(ct);
            if (review is null) return Outcome.Skip("Inceleme silinmis.");
            if (review.UserId == task.AgentUserId) return Outcome.Skip("Kendi incelemesi.");
            if (!review.IsAiAgent && !await _policy.CanInteractAsync(review.UserId, ct)) return Outcome.Skip("Inceleme sahibi AI etkilesimine uygun degil.");

            var already = await _context.ReviewComments.AnyAsync(c => c.ReviewId == reviewId && c.UserId == task.AgentUserId, ct);
            if (already) return Outcome.Skip("Bu inceleme zaten yorumlandi.");

            var game = await _context.Games.AsNoTracking().FirstAsync(g => g.Id == review.GameId, ct);
            var author = review.IsAiAgent ? roster.FirstOrDefault(a => a.UserId == review.UserId) : null;
            var peerNote = me is not null && author is not null
                ? $"İncelemeyi yazan da bir AI karakter: {AiConversationService.PeerNote(me, author)}"
                : null;
            var myRating = await _context.Reviews.AsNoTracking()
                .Where(r => r.GameId == review.GameId && r.UserId == task.AgentUserId)
                .Select(r => (int?)r.Rating)
                .FirstOrDefaultAsync(ct);

            var text = await _writer.WriteReviewCommentAsync(agent, review.Username, Facts(game), review.Rating, review.Content, ct, peerNote, myRating);
            if (text is null) return Outcome.Skip("Metin uretilemedi.");

            var comment = await _reviewComments.CreateCommentAsync(reviewId, task.AgentUserId, new ReviewCommentForCreationDto { Content = text.Text });

            // Bot incelemesine yorum geldiyse inceleme sahibi bot cogunlukla cevap verir (tek seviye).
            if (author is not null && Random.Shared.NextDouble() < 0.65)
            {
                _context.AiAgentTasks.Add(new AiAgentTask
                {
                    AgentUserId = author.UserId,
                    Type = AiAgentTaskType.CommentOnReview,
                    Status = AiAgentTaskStatus.Pending,
                    TargetReviewId = reviewId,
                    TargetCommentId = comment.Id,
                    TargetUserId = task.AgentUserId,
                    ScheduledAt = DateTime.UtcNow.AddSeconds(Random.Shared.Next(300, 1801)),
                    CreatedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync(ct);
            }

            return new Outcome(AiAgentTaskStatus.Done, Summary(text.Text), comment.Id, text);
        }

        private async Task<Outcome> ReplyToReviewCommentAsync(AiAgentTask task, AiAgentIdentity agent, int commentId, CancellationToken ct)
        {
            var comment = await _context.ReviewComments.AsNoTracking()
                .Where(c => c.Id == commentId)
                .Select(c => new
                {
                    c.Id, c.ReviewId, c.UserId, c.Content, c.User.Username, c.User.IsAiAgent,
                    ReviewAuthorId = c.Review.UserId, c.Review.Rating, ReviewContent = c.Review.Content, c.Review.GameId
                })
                .FirstOrDefaultAsync(ct);
            if (comment is null) return Outcome.Skip("Yorum silinmis.");
            if (comment.ReviewAuthorId != task.AgentUserId) return Outcome.Skip("Inceleme bu botun degil.");
            if (!comment.IsAiAgent && !await _policy.CanInteractAsync(comment.UserId, ct)) return Outcome.Skip("Yorum sahibi uygun degil.");
            if (await _context.ReviewComments.AnyAsync(c => c.ParentCommentId == commentId && c.UserId == task.AgentUserId, ct))
                return Outcome.Skip("Bu yoruma zaten cevap verildi.");

            var roster = await _conversations.LoadRosterAsync(ct);
            var me = roster.FirstOrDefault(a => a.UserId == task.AgentUserId);
            var commenter = roster.FirstOrDefault(a => a.UserId == comment.UserId);
            var peerNote = me is not null && commenter is not null
                ? $"Yorumu yazan da bir AI karakter: {AiConversationService.PeerNote(me, commenter)}"
                : null;

            var game = await _context.Games.AsNoTracking().FirstAsync(g => g.Id == comment.GameId, ct);
            var text = await _writer.WriteReviewCommentReplyAsync(agent, comment.Username, comment.Content, Facts(game),
                comment.Rating, comment.ReviewContent, peerNote, ct);
            if (text is null) return Outcome.Skip("Metin uretilemedi.");

            var reply = await _reviewComments.CreateCommentAsync(comment.ReviewId, task.AgentUserId,
                new ReviewCommentForCreationDto { Content = text.Text, ParentCommentId = commentId });
            return new Outcome(AiAgentTaskStatus.Done, Summary(text.Text), reply.Id, text);
        }

        // ------------------------------------------------------------------ LLM'siz

        private async Task<Outcome> LikePostAsync(AiAgentTask task, CancellationToken ct)
        {
            var since = DateTime.UtcNow - RecentWindow;
            var cutoff = AiInteractionRules.AdultBirthCutoffUtc(BirthdayCalendar.TodayInIstanbul());
            var candidates = await _context.Posts.AsNoTracking()
                .Where(p => p.RepostOfPostId == null && p.CreatedAt >= since && p.UserId != task.AgentUserId &&
                            p.User.PostVisibility == PostVisibilitySetting.Everyone &&
                            p.User.ProfileVisibility == ProfileVisibilitySetting.Public &&
                            !p.User.IsDeleted && !p.User.IsBanned &&
                            (p.User.IsAiAgent ||
                             (p.User.AllowAiInteraction && p.User.DateOfBirth != null && p.User.DateOfBirth <= cutoff)) &&
                            !_context.PostLikes.Any(l => l.PostId == p.Id && l.UserId == task.AgentUserId))
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => p.Id)
                .Take(20)
                .ToListAsync(ct);
            if (candidates.Count == 0) return Outcome.Skip("Begenilecek gonderi yok.");

            var postId = candidates[Random.Shared.Next(candidates.Count)];
            task.TargetPostId = postId;
            await _posts.SetLikeAsync(postId, task.AgentUserId, true);
            return new Outcome(AiAgentTaskStatus.Done, $"Gonderi {postId} begenildi.", postId);
        }

        /// <summary>
        /// Takip: yarim ihtimalle once bir bot, degilse riza vermis aktif bir insan. Secilen grupta aday
        /// yoksa digerine duser (bot cemiyeti insan azken de buyusun, insan varken botlar kendi
        /// aralarinda kapanmasin).
        /// </summary>
        private async Task<Outcome> FollowUserAsync(AiAgentTask task, CancellationToken ct)
        {
            var botFirst = Random.Shared.NextDouble() < 0.5;
            var first = botFirst ? await FollowBotAsync(task, ct) : await FollowHumanAsync(task, ct);
            if (first is not null) return first;
            var second = botFirst ? await FollowHumanAsync(task, ct) : await FollowBotAsync(task, ct);
            return second ?? Outcome.Skip("Takip edilecek uygun hesap yok.");
        }

        private async Task<Outcome?> FollowBotAsync(AiAgentTask task, CancellationToken ct)
        {
            var roster = await _conversations.LoadRosterAsync(ct);
            var followedIds = await _context.Follows.AsNoTracking()
                .Where(f => f.FollowerId == task.AgentUserId)
                .Select(f => f.FolloweeId)
                .ToListAsync(ct);
            var notFollowed = roster
                .Where(a => a.UserId != task.AgentUserId && !followedIds.Contains(a.UserId))
                .ToList();
            if (notFollowed.Count == 0) return null;

            var bot = notFollowed[Random.Shared.Next(notFollowed.Count)];
            task.TargetUserId = bot.UserId;
            var followed = await _social.FollowUserAsync(task.AgentUserId, bot.Username);
            return followed ? new Outcome(AiAgentTaskStatus.Done, $"@{bot.Username} takip edildi.", bot.UserId) : null;
        }

        private async Task<Outcome?> FollowHumanAsync(AiAgentTask task, CancellationToken ct)
        {
            var agentIds = (await _directory.GetAgentIdsAsync(ct)).ToList();
            var cutoff = AiInteractionRules.AdultBirthCutoffUtc(BirthdayCalendar.TodayInIstanbul());
            var activeSince = DateTime.UtcNow.AddDays(-14);

            var candidates = await _context.Users.AsNoTracking()
                .Where(u => !u.IsAiAgent && !u.IsSeeded && !u.IsDeleted && !u.IsBanned &&
                            u.AllowAiInteraction && u.DateOfBirth != null && u.DateOfBirth <= cutoff &&
                            u.ProfileVisibility == ProfileVisibilitySetting.Public &&
                            !_context.Follows.Any(f => f.FollowerId == task.AgentUserId && f.FolloweeId == u.Id) &&
                            _context.Follows.Count(f => f.FolloweeId == u.Id && agentIds.Contains(f.FollowerId)) < MaxAgentFollowersPerUser &&
                            (_context.Posts.Any(p => p.UserId == u.Id && p.CreatedAt >= activeSince) ||
                             _context.Reviews.Any(r => r.UserId == u.Id && r.CreatedAt >= activeSince)))
                .Select(u => new { u.Id, u.Username })
                .Take(20)
                .ToListAsync(ct);
            if (candidates.Count == 0) return null;

            var target = candidates[Random.Shared.Next(candidates.Count)];
            task.TargetUserId = target.Id;
            var ok = await _social.FollowUserAsync(task.AgentUserId, target.Username);
            return ok ? new Outcome(AiAgentTaskStatus.Done, $"@{target.Username} takip edildi.", target.Id) : null;
        }

        // ------------------------------------------------------------------ yardimcilar

        private async Task<bool> UnderDailyMessageCapAsync(int userId, CancellationToken ct)
        {
            var settings = await _settings.GetAsync(ct);
            var agentIds = (await _directory.GetAgentIdsAsync(ct)).ToList();
            var since = DateTime.UtcNow.AddHours(-24);
            var count = await _context.Messages.CountAsync(m =>
                m.RecipientId == userId && agentIds.Contains(m.SenderId) && m.SentAt >= since, ct);
            return count < settings.MaxAgentMessagesPerUserPerDay;
        }

        private async Task<Game?> PickGameForPostAsync(int agentId, AiAgentProfile profile, CancellationToken ct)
        {
            var from = DateTime.UtcNow.AddDays(-45).ToString("yyyy-MM-dd");
            var to = DateTime.UtcNow.AddDays(60).ToString("yyyy-MM-dd");
            var weekAgo = DateTime.UtcNow.AddDays(-7);

            var recentlyPosted = await _context.AiAgentTasks.AsNoTracking()
                .Where(t => t.AgentUserId == agentId && t.Type == AiAgentTaskType.CreatePost && t.TargetGameId != null && t.CreatedAt >= weekAgo)
                .Select(t => t.TargetGameId!.Value)
                .ToListAsync(ct);

            var pool = _context.Games.AsNoTracking()
                .Where(g => g.Released != null &&
                            string.Compare(g.Released, from) >= 0 && string.Compare(g.Released, to) <= 0 &&
                            !recentlyPosted.Contains(g.Id));

            return await PickByGenreAsync(pool.OrderByDescending(g => g.TrendScore), profile, 30, ct);
        }

        private async Task<Game?> PickGameForReviewAsync(int agentId, AiAgentProfile profile, CancellationToken ct)
        {
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var pool = _context.Games.AsNoTracking()
                .Where(g => g.Released != null && string.Compare(g.Released, today) <= 0 &&
                            (g.Metacritic != null || g.IgdbRating != null) &&
                            !_context.Reviews.Any(r => r.GameId == g.Id && r.UserId == agentId));

            // Once gundem (trend), sonra kalici populerlik: botlar yalnizca eski klasikleri incelemesin.
            var trending = await PickByGenreAsync(pool.OrderByDescending(g => g.TrendScore), profile, 40, ct);
            if (trending is not null && Random.Shared.NextDouble() < 0.6) return trending;
            return await PickByGenreAsync(pool.OrderByDescending(g => g.RawgAdded ?? 0), profile, 80, ct) ?? trending;
        }

        /// <summary>Havuzun ust N'inden, botun turlerine uyanlardan rastgele biri; uyan yoksa herhangi biri.</summary>
        private static async Task<Game?> PickByGenreAsync(IQueryable<Game> ordered, AiAgentProfile profile, int top, CancellationToken ct)
        {
            var list = await ordered.Take(top).ToListAsync(ct);
            if (list.Count == 0) return null;

            var genres = profile.FavoriteGenres.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var matching = list.Where(g => g.GenresJson != null &&
                                           genres.Any(s => g.GenresJson.Contains($"\"{s}\"", StringComparison.OrdinalIgnoreCase)))
                .ToList();
            var source = matching.Count > 0 ? matching : list;
            return source[Random.Shared.Next(source.Count)];
        }

        internal static AiGameFacts Facts(Game g) => new(
            g.Name,
            g.Released,
            JoinNames(g.GenresJson),
            JoinNames(g.PlatformsJson),
            g.Metacritic,
            g.IgdbRating,
            StripHtml(g.DescriptionTr ?? g.Description));

        private static string? JoinNames(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return null;
            try
            {
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.ValueKind != JsonValueKind.Array) return null;
                var names = new List<string>();
                foreach (var el in doc.RootElement.EnumerateArray())
                {
                    if (el.ValueKind != JsonValueKind.Object) continue;
                    foreach (var prop in el.EnumerateObject())
                    {
                        if (prop.Name.Equals("name", StringComparison.OrdinalIgnoreCase) && prop.Value.ValueKind == JsonValueKind.String)
                        {
                            names.Add(prop.Value.GetString()!);
                        }
                        else if (prop.Name.Equals("platform", StringComparison.OrdinalIgnoreCase) && prop.Value.ValueKind == JsonValueKind.Object &&
                                 prop.Value.TryGetProperty("name", out var inner) && inner.ValueKind == JsonValueKind.String)
                        {
                            names.Add(inner.GetString()!);
                        }
                    }
                }
                return names.Count == 0 ? null : string.Join(", ", names.Distinct().Take(6));
            }
            catch (JsonException)
            {
                return null;
            }
        }

        private static readonly Regex HtmlTag = new("<[^>]+>", RegexOptions.Compiled);

        private static string? StripHtml(string? html)
        {
            if (string.IsNullOrWhiteSpace(html)) return null;
            var text = System.Net.WebUtility.HtmlDecode(HtmlTag.Replace(html, " "));
            return Regex.Replace(text, @"\s+", " ").Trim();
        }

        /// <summary>Tum acik botlarin kucuk harf kullanici adi -> kimlik sozlugu (etiket cevirici icin).</summary>
        private async Task<Dictionary<string, int>> AgentHandlesAsync(CancellationToken ct)
            => (await _conversations.LoadRosterAsync(ct)).ToDictionary(a => a.Username.ToLowerInvariant(), a => a.UserId);

        private static string ReplaceFirst(string text, string search, string replacement)
        {
            var i = text.IndexOf(search, StringComparison.Ordinal);
            return i < 0 ? text : text[..i] + replacement + text[(i + search.Length)..];
        }

        private static string Summary(string text) => text.Length <= 280 ? text : text[..277] + "...";
    }
}
