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
    /// ReviewService, ReviewCommentService, UserListCommentService): gorunurluk, yanit izni, engel, bildirim, SignalR ve
    /// push kurallari insan kullanicilarla birebir ayni isler.
    ///
    /// Sonuc: Done (yazildi), Skipped (uygun hedef yok, kural engelledi) ya da istisna (motor
    /// gorevi Failed yapar ya da yeniden dener).
    ///
    /// Dil (bkz. AiLanguage): planli hedefler botun dil grubundan secilir; insana cevap onun son
    /// metninin dilinde, bot-bota ve kendiliginden yazilanlar botun dilinde.
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
        private readonly IUserListCommentService _listComments;
        private readonly AiContentWriter _writer;
        private readonly IAiInteractionPolicy _policy;
        private readonly IAiAgentDirectory _directory;
        private readonly IAiSettingsProvider _settings;
        private readonly AiConversationService _conversations;
        private readonly IHubNotificationService _hub;
        private readonly ILogger<AiAgentTaskProcessor> _logger;

        public AiAgentTaskProcessor(
            GGHubDbContext context,
            PostService posts,
            ISocialService social,
            IReviewService reviews,
            IReviewCommentService reviewComments,
            IUserListCommentService listComments,
            AiContentWriter writer,
            IAiInteractionPolicy policy,
            IAiAgentDirectory directory,
            IAiSettingsProvider settings,
            AiConversationService conversations,
            IHubNotificationService hub,
            ILogger<AiAgentTaskProcessor> logger)
        {
            _context = context;
            _posts = posts;
            _social = social;
            _reviews = reviews;
            _reviewComments = reviewComments;
            _listComments = listComments;
            _writer = writer;
            _policy = policy;
            _directory = directory;
            _settings = settings;
            _conversations = conversations;
            _hub = hub;
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

            var identity = new AiAgentIdentity(agent.FirstName ?? agent.Username, agent.Username, profile.Persona,
                AiLanguage.Normalize(profile.Language));

            return task.Type switch
            {
                AiAgentTaskType.ReplyToDirectMessage => await ReplyToDirectMessageAsync(task, identity, ct),
                AiAgentTaskType.WelcomeDirectMessage => await WelcomeAsync(task, identity, ct),
                AiAgentTaskType.ReplyToPost => await ReplyToPostAsync(task, identity, ct),
                AiAgentTaskType.CreatePost => await CreatePostAsync(task, identity, profile, ct),
                AiAgentTaskType.ReviewGame => await ReviewGameAsync(task, identity, profile, ct),
                AiAgentTaskType.CommentOnReview => await CommentOnReviewAsync(task, identity, profile, ct),
                AiAgentTaskType.LikePost => await LikePostAsync(task, identity, ct),
                AiAgentTaskType.FollowUser => await FollowHumanAsync(task, identity, ct),
                AiAgentTaskType.StartConversation => await _conversations.StartAsync(task, identity, ct),
                AiAgentTaskType.ConversationTurn => await _conversations.TurnAsync(task, identity, ct),
                AiAgentTaskType.CasualDirectMessage => await CasualMessageAsync(task, identity, ct),
                AiAgentTaskType.CommentOnList => await CommentOnListAsync(task, identity, ct),
                _ => Outcome.Skip("Bilinmeyen gorev tipi.")
            };
        }

        // ------------------------------------------------------------------ DM

        private async Task<Outcome> ReplyToDirectMessageAsync(AiAgentTask task, AiAgentIdentity agent, CancellationToken ct)
        {
            if (task.TargetUserId is not int userId) return Outcome.Skip("Hedef yok.");
            if (!await _policy.CanInteractAsync(userId, ct)) return Outcome.Skip("Kullanici AI etkilesimine uygun degil.");
            // Bot mesaji "gordu": insan tarafinda cift tik. Bot sohbeti hic acmadigi icin eskiden
            // kullanicinin mesaji sonsuza dek tek tikte kaliyordu.
            await MarkThreadReadAsync(task.AgentUserId, agent.Username, userId, ct);
            if (!await UnderDailyMessageCapAsync(userId, ct)) return Outcome.Skip("Kullanicinin gunluk bot mesaji tavani doldu.");

            var partnerRow = await _context.Users.AsNoTracking().Where(u => u.Id == userId).Select(u => new { u.Username, u.PreferredLocale }).FirstAsync(ct);
            var partner = partnerRow.Username;

            var recent = await _context.Messages.AsNoTracking()
                .Where(m => (m.SenderId == task.AgentUserId && m.RecipientId == userId) ||
                            (m.SenderId == userId && m.RecipientId == task.AgentUserId))
                .OrderByDescending(m => m.SentAt)
                .Take(12)
                .Select(m => new { m.SenderId, m.Content })
                .ToListAsync(ct);
            recent.Reverse();

            if (recent.Count == 0 || recent[^1].SenderId == task.AgentUserId) return Outcome.Skip("Yanitlanacak yeni mesaj yok.");

            // Dil: kullanicinin son metni; belirlenemezse (emoji, oyun adi) onun arayuz tercihi.
            var lang = AiLanguage.OfLatest(recent.Where(m => m.SenderId != task.AgentUserId).Reverse().Select(m => m.Content),
                AiLanguage.FromLocale(partnerRow.PreferredLocale));

            // Kullanicinin metnindeki duz "@ad"lar: riza vermemis ucuncu kisilerin adi modele gitmez.
            var thread = new List<AiThreadLine>();
            foreach (var m in recent)
            {
                var fromAgent = m.SenderId == task.AgentUserId;
                thread.Add(new AiThreadLine(fromAgent, fromAgent ? agent.Username : partner, fromAgent,
                    fromAgent ? m.Content : await _conversations.MaskPlainHandlesAsync(m.Content, lang, ct)));
            }
            var text = await _writer.WriteDirectMessageReplyAsync(agent, partner, thread, lang, ct);
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
            // acik, hicbir bottan mesaj almamis ve bu hafta hos geldin gorevi acilmamis. Bot ilk yazdigi
            // icin kullanicinin dil tercihi (PreferredLocale, yoksa "tr") botun diliyle ayni olmali.
            var wantsTr = agent.Language == AiLanguage.Tr;
            var candidates = await _context.Users.AsNoTracking()
                .Where(u => !u.IsAiAgent && !u.IsSeeded && !u.IsDeleted && !u.IsBanned &&
                            u.AllowAiInteraction && u.DateOfBirth != null && u.DateOfBirth <= cutoff &&
                            u.CreatedAt >= since &&
                            (wantsTr
                                ? u.PreferredLocale == null || u.PreferredLocale.StartsWith("tr")
                                : u.PreferredLocale != null && !u.PreferredLocale.StartsWith("tr")) &&
                            u.MessageSetting == MessagePrivacySetting.Everyone &&
                            !_context.Messages.Any(m => m.RecipientId == u.Id && agentIds.Contains(m.SenderId)) &&
                            !_context.UserBlocks.Any(b => (b.BlockerId == u.Id && agentIds.Contains(b.BlockedId))))
                .Where(u => _context.AiAgentTasks.Count(t =>
                    t.TargetUserId == u.Id &&
                    (t.Type == AiAgentTaskType.WelcomeDirectMessage || t.Type == AiAgentTaskType.CasualDirectMessage) &&
                    t.CreatedAt >= weekAgo &&
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

            var text = await _writer.WriteWelcomeMessageAsync(agent, target.Username, recentGames, agent.Language, ct);
            if (text is null) return Outcome.Skip("Metin uretilemedi.");

            var sent = await _social.SendMessageAsync(task.AgentUserId, new MessageForCreationDto { RecipientUsername = target.Username, Content = text.Text });
            return new Outcome(AiAgentTaskStatus.Done, Summary(text.Text), sent?.Id, text);
        }

        /// <summary>
        /// Kendiliginden DM: hos geldinin aksine eski kullaniciya ve daha once botla yazismis
        /// kullaniciya da gider. Frenler: haftalik tavan (hos geldin ile ortak), gunluk bot mesaji
        /// tavani ve "ust uste yazma yok" (bu botun son mesaji cevapsizsa 7 gun ayni kisiye yazmaz).
        /// </summary>
        private async Task<Outcome> CasualMessageAsync(AiAgentTask task, AiAgentIdentity agent, CancellationToken ct)
        {
            var settings = await _settings.GetAsync(ct);
            if (settings.MaxUnsolicitedDmPerUserPerWeek <= 0) return Outcome.Skip("Kendiliginden DM kapali (haftalik tavan 0).");

            var agentId = task.AgentUserId;
            var cutoff = AiInteractionRules.AdultBirthCutoffUtc(BirthdayCalendar.TodayInIstanbul());
            var weekAgo = DateTime.UtcNow.AddDays(-7);
            var wantsTr = agent.Language == AiLanguage.Tr;

            // Bot ilk yazdigi icin dil kullanicinin arayuz tercihinden (hos geldin ile ayni kural).
            var candidates = await _context.Users.AsNoTracking()
                .Where(u => !u.IsAiAgent && !u.IsSeeded && !u.IsDeleted && !u.IsBanned &&
                            u.AllowAiInteraction && u.DateOfBirth != null && u.DateOfBirth <= cutoff &&
                            (wantsTr
                                ? u.PreferredLocale == null || u.PreferredLocale.StartsWith("tr")
                                : u.PreferredLocale != null && !u.PreferredLocale.StartsWith("tr")) &&
                            u.MessageSetting == MessagePrivacySetting.Everyone &&
                            !_context.UserBlocks.Any(b => b.BlockerId == u.Id && b.BlockedId == agentId) &&
                            // Bu botun cevapsiz kalmis yakin tarihli mesaji varsa ust uste yazma.
                            !_context.Messages.Any(m => m.SenderId == agentId && m.RecipientId == u.Id && m.SentAt >= weekAgo &&
                                !_context.Messages.Any(r => r.SenderId == u.Id && r.RecipientId == agentId && r.SentAt > m.SentAt)) &&
                            // Bu bota cevap bekleyen DM'i varsa onu ReplyToDirectMessage halleder.
                            !_context.AiAgentTasks.Any(t => t.AgentUserId == agentId && t.TargetUserId == u.Id &&
                                t.Type == AiAgentTaskType.ReplyToDirectMessage &&
                                (t.Status == AiAgentTaskStatus.Pending || t.Status == AiAgentTaskStatus.Running)))
                .Where(u => _context.AiAgentTasks.Count(t =>
                    t.TargetUserId == u.Id &&
                    (t.Type == AiAgentTaskType.WelcomeDirectMessage || t.Type == AiAgentTaskType.CasualDirectMessage) &&
                    t.CreatedAt >= weekAgo &&
                    t.Status == AiAgentTaskStatus.Done) < settings.MaxUnsolicitedDmPerUserPerWeek)
                .OrderByDescending(u => u.UpdatedAt)
                .Select(u => new { u.Id, u.Username })
                .Take(30)
                .ToListAsync(ct);
            if (candidates.Count == 0) return Outcome.Skip("Kendiliginden DM icin uygun kullanici yok.");

            var target = candidates[Random.Shared.Next(candidates.Count)];
            if (!await _policy.CanInteractAsync(target.Id, ct)) return Outcome.Skip("Kullanici uygun degil.");
            if (!await UnderDailyMessageCapAsync(target.Id, ct)) return Outcome.Skip("Kullanicinin gunluk bot mesaji tavani doldu.");

            task.TargetUserId = target.Id;

            var firstContact = !await _context.Messages.AnyAsync(m =>
                (m.SenderId == agentId && m.RecipientId == target.Id) || (m.SenderId == target.Id && m.RecipientId == agentId), ct);
            var hook = await CasualHookAsync(target.Id, ct);

            var text = await _writer.WriteCasualMessageAsync(agent, target.Username, hook, firstContact, agent.Language, ct);
            if (text is null) return Outcome.Skip("Metin uretilemedi.");

            // Model yazarken riza geri alinmis olabilir.
            if (!await _policy.CanInteractAsync(target.Id, ct)) return Outcome.Skip("Kullanici uygun degil.");

            var sent = await _social.SendMessageAsync(agentId, new MessageForCreationDto { RecipientUsername = target.Username, Content = text.Text });
            return new Outcome(AiAgentTaskStatus.Done, Summary(text.Text), sent?.Id, text);
        }

        /// <summary>
        /// Kendiliginden DM'in konusu: kullanicinin en yeni incelemesi ya da herkese acik listesi
        /// (hangisi yeniyse). Yalnizca oyun adi, puan ve liste adi gider; kullanicinin yazdigi
        /// serbest metin (inceleme, gonderi) modele TASINMAZ.
        /// </summary>
        private async Task<string?> CasualHookAsync(int userId, CancellationToken ct)
        {
            var review = await _context.Reviews.AsNoTracking()
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new { r.CreatedAt, r.Rating, GameName = r.Game.Name })
                .FirstOrDefaultAsync(ct);

            var list = await _context.UserLists.AsNoTracking()
                .Where(l => l.UserId == userId && l.Type == UserListType.Custom && l.Visibility == ListVisibilitySetting.Public &&
                            l.UserListGames.Any())
                .OrderByDescending(l => l.UpdatedAt)
                .Select(l => new
                {
                    l.UpdatedAt,
                    l.Name,
                    Games = l.UserListGames.OrderByDescending(g => g.AddedAt).Select(g => g.Game.Name).Take(4).ToList()
                })
                .FirstOrDefaultAsync(ct);

            if (review is null && list is null) return null;
            if (list is null || (review is not null && review.CreatedAt >= list.UpdatedAt))
            {
                return $"{review!.GameName} oyununa 10 üzerinden {review.Rating} puan verip inceleme yazdı.";
            }
            return $"\"{list.Name}\" adlı bir oyun listesi var, içinde şunlar bulunuyor: {string.Join(", ", list.Games)}.";
        }

        // ------------------------------------------------------------------ Liste

        /// <summary>Promptta listeden en fazla kac oyun adi gecer.</summary>
        private const int MaxListGamesInPrompt = 12;

        /// <summary>Bir listenin altinda en fazla kac bot KOK yorumu olur.</summary>
        private const int MaxAgentCommentsPerList = 2;

        /// <summary>
        /// Yanit en fazla bu derinlikte yazilir (kok = 0). GetCommentsForListAsync agaci bu
        /// derinlige kadar yukler; daha derine yazilan yanit hicbir istemcide gorunmezdi.
        /// </summary>
        private const int MaxListCommentDepth = 3;

        private async Task<Outcome> CommentOnListAsync(AiAgentTask task, AiAgentIdentity agent, CancellationToken ct)
        {
            if (task.TargetCommentId is int commentId) return await ReplyToListCommentAsync(task, agent, commentId, ct);

            var agentId = task.AgentUserId;
            var agentIds = (await _directory.GetAgentIdsAsync(ct)).ToList();

            int listId;
            if (task.TargetListId is int given)
            {
                listId = given;
            }
            else
            {
                // Planli yol: AI etkilesimine riza vermis insanlarin herkese acik, yeterince dolu listeleri.
                var cutoff = AiInteractionRules.AdultBirthCutoffUtc(BirthdayCalendar.TodayInIstanbul());
                var since = DateTime.UtcNow.AddDays(-90);
                var candidates = await _context.UserLists.AsNoTracking()
                    .Where(l => l.Type == UserListType.Custom && l.Visibility == ListVisibilitySetting.Public &&
                                l.UpdatedAt >= since &&
                                l.UserListGames.Count() >= AiAgentEvents.MinGamesForListComment &&
                                !l.User.IsAiAgent && !l.User.IsSeeded && !l.User.IsDeleted && !l.User.IsBanned &&
                                l.User.ProfileVisibility == ProfileVisibilitySetting.Public &&
                                l.User.AllowAiInteraction && l.User.DateOfBirth != null && l.User.DateOfBirth <= cutoff &&
                                !_context.UserBlocks.Any(b => b.BlockerId == l.UserId && b.BlockedId == agentId) &&
                                !_context.UserListComments.Any(c => c.UserListId == l.Id && c.UserId == agentId) &&
                                _context.UserListComments.Count(c => c.UserListId == l.Id && c.ParentCommentId == null && agentIds.Contains(c.UserId)) < MaxAgentCommentsPerList)
                    .OrderByDescending(l => l.UpdatedAt)
                    .Select(l => new LangCandidate(l.Id, l.UserId, false, l.Name + " " + (l.Description ?? "")))
                    .Take(30)
                    .ToListAsync(ct);

                var capped = await CappedHumansAsync(candidates.Select(c => c.UserId), ct);
                candidates = candidates.Where(c => !capped.Contains(c.UserId)).ToList();
                if (PickInLanguage(candidates, new HashSet<int>(), agent.Language) is not int picked)
                    return Outcome.Skip("Yorumlanacak uygun liste yok.");
                listId = picked;
                task.TargetListId = listId;
            }

            var list = await LoadListForModelAsync(listId, ct);
            if (list is null) return Outcome.Skip("Liste silinmis ya da herkese acik degil.");
            if (list.OwnerId == agentId || list.OwnerIsAiAgent) return Outcome.Skip("Liste bir botun.");
            if (list.Games.Count < AiAgentEvents.MinGamesForListComment) return Outcome.Skip("Listede yeterli oyun yok.");
            if (!await _policy.CanInteractAsync(list.OwnerId, ct)) return Outcome.Skip("Liste sahibi AI etkilesimine uygun degil.");

            task.TargetUserId = list.OwnerId;

            if (await _context.UserListComments.AnyAsync(c => c.UserListId == listId && c.UserId == agentId, ct))
                return Outcome.Skip("Bu liste zaten yorumlandi.");
            var agentRoots = await _context.UserListComments.CountAsync(c =>
                c.UserListId == listId && c.ParentCommentId == null && agentIds.Contains(c.UserId), ct);
            if (agentRoots >= MaxAgentCommentsPerList) return Outcome.Skip("Listenin bot yorumu tavani dolu.");

            // Insana onun yazdigi dilde: liste adi ve aciklamasi, belirlenemezse arayuz tercihi.
            var lang = AiLanguage.Detect($"{list.Name} {list.Description}") ?? await PreferredLanguageAsync(list.OwnerId, agent.Language, ct);
            var description = list.Description is null ? null : await _conversations.MaskPlainHandlesAsync(list.Description, lang, ct);

            var text = await _writer.WriteListCommentAsync(agent, list.OwnerUsername, list.Name, description, list.Games, list.TotalGames, lang, ct);
            if (text is null) return Outcome.Skip("Metin uretilemedi.");

            // Model yazarken riza geri alinmis olabilir; yorumdaki "@ad" dogrudan bildirim oldugu icin
            // yalnizca ayni dildeki botlar ve (rizali) liste sahibi etiketli kalir.
            if (!await _policy.CanInteractAsync(list.OwnerId, ct)) return Outcome.Skip("Liste sahibi AI etkilesimine uygun degil.");
            var allowedHandles = (await AgentHandlesAsync(agent.Language, ct)).Keys.ToHashSet();
            allowedHandles.Add(list.OwnerUsername.ToLowerInvariant());
            allowedHandles.Remove(agent.Username.ToLowerInvariant());
            text = text with { Text = AiMentionLinker.KeepAllowedHandles(text.Text, allowedHandles) };

            var comment = await _listComments.CreateCommentAsync(listId, agentId, new UserListCommentForCreationDto { Content = text.Text });
            return new Outcome(AiAgentTaskStatus.Done, Summary(text.Text), comment.Id, text);
        }

        private async Task<Outcome> ReplyToListCommentAsync(AiAgentTask task, AiAgentIdentity agent, int commentId, CancellationToken ct)
        {
            var agentId = task.AgentUserId;
            var comment = await _context.UserListComments.AsNoTracking()
                .Where(c => c.Id == commentId)
                .Select(c => new { c.Id, c.UserListId, c.UserId, c.Content, c.ParentCommentId, c.User.Username, c.User.IsAiAgent })
                .FirstOrDefaultAsync(ct);
            if (comment is null) return Outcome.Skip("Yorum silinmis.");
            if (comment.UserId == agentId) return Outcome.Skip("Kendi yorumu.");
            if (comment.IsAiAgent) return Outcome.Skip("Yorum bir botun.");
            if (!await _policy.CanInteractAsync(comment.UserId, ct)) return Outcome.Skip("Yorum sahibi uygun degil.");
            if (await _context.UserListComments.AnyAsync(c => c.ParentCommentId == commentId && c.UserId == agentId, ct))
                return Outcome.Skip("Bu yoruma zaten cevap verildi.");

            var list = await LoadListForModelAsync(comment.UserListId, ct);
            if (list is null) return Outcome.Skip("Liste silinmis ya da herkese acik degil.");
            task.TargetListId = list.Id;

            // Zincir: yorumdan koke dogru ustler (en fazla MaxListCommentDepth adim). Riza vermemis
            // insanlarin metni ve adi modele gitmez; derinlik yanitin nereye yazilacagini belirler.
            var lang = AiLanguage.Detect(comment.Content) ?? await PreferredLanguageAsync(comment.UserId, agent.Language, ct);
            var thread = new List<AiThreadLine>
            {
                new(false, comment.Username, false, await _conversations.MaskPlainHandlesAsync(comment.Content, lang, ct))
            };
            var depth = 0;
            var parentId = comment.ParentCommentId;
            while (parentId is int pid && depth < MaxListCommentDepth + 1)
            {
                var parent = await _context.UserListComments.AsNoTracking()
                    .Where(c => c.Id == pid)
                    .Select(c => new { c.UserId, c.Content, c.ParentCommentId, c.User.Username, c.User.IsAiAgent })
                    .FirstOrDefaultAsync(ct);
                if (parent is null) break;
                depth++;

                var mine = parent.UserId == agentId;
                if (mine || parent.IsAiAgent)
                {
                    thread.Insert(0, new AiThreadLine(mine, parent.Username, true, parent.Content));
                }
                else if (await _policy.CanInteractAsync(parent.UserId, ct))
                {
                    thread.Insert(0, new AiThreadLine(false, parent.Username, false, await _conversations.MaskPlainHandlesAsync(parent.Content, lang, ct)));
                }
                parentId = parent.ParentCommentId;
            }

            var addresseeIsOwner = comment.UserId == list.OwnerId;
            var text = await _writer.WriteListCommentReplyAsync(agent, list.OwnerUsername, list.Name, list.Games, thread,
                comment.Username, addresseeIsOwner, addresseeIsHuman: true, lang, ct);
            if (text is null) return Outcome.Skip("Metin uretilemedi.");

            if (!await _policy.CanInteractAsync(comment.UserId, ct)) return Outcome.Skip("Yorum sahibi uygun degil.");
            var allowedHandles = (await AgentHandlesAsync(agent.Language, ct)).Keys.ToHashSet();
            allowedHandles.Add(comment.Username.ToLowerInvariant());
            allowedHandles.Remove(agent.Username.ToLowerInvariant());
            text = text with { Text = AiMentionLinker.KeepAllowedHandles(text.Text, allowedHandles) };

            // Yorum zaten en derin seviyedeyse yanit onun KARDESI olarak (ayni ustun altina) yazilir.
            var replyTo = depth >= MaxListCommentDepth && comment.ParentCommentId is int siblingParent ? siblingParent : commentId;
            var reply = await _listComments.CreateCommentAsync(list.Id, agentId,
                new UserListCommentForCreationDto { Content = text.Text, ParentCommentId = replyTo });
            return new Outcome(AiAgentTaskStatus.Done, Summary(text.Text), reply.Id, text);
        }

        private sealed record ListForModel(
            int Id, int OwnerId, string OwnerUsername, bool OwnerIsAiAgent, string Name, string? Description,
            IReadOnlyList<string> Games, int TotalGames);

        /// <summary>Herkese acik, sahibi aktif ozel liste; degilse null. Oyunlar eklenme sirasiyla.</summary>
        private async Task<ListForModel?> LoadListForModelAsync(int listId, CancellationToken ct)
        {
            var row = await _context.UserLists.AsNoTracking()
                .WhereOwnerActive()
                .Where(l => l.Id == listId && l.Type == UserListType.Custom && l.Visibility == ListVisibilitySetting.Public)
                .Select(l => new
                {
                    l.Id,
                    l.UserId,
                    l.User.Username,
                    l.User.IsAiAgent,
                    l.Name,
                    l.Description,
                    Total = l.UserListGames.Count(),
                    Games = l.UserListGames.OrderBy(g => g.AddedAt).Select(g => g.Game.Name).Take(MaxListGamesInPrompt).ToList()
                })
                .FirstOrDefaultAsync(ct);
            return row is null
                ? null
                : new ListForModel(row.Id, row.UserId, row.Username, row.IsAiAgent, row.Name, row.Description, row.Games, row.Total);
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
                // ayni dildeki botlarin. Bot tavanini doldurmus ve bu botun zaten yanitladigi gonderiler elenir.
                var sameLanguageBots = await SameLanguageBotIdsAsync(agent.Language, ct);
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
                    .Select(p => new LangCandidate(p.Id, p.UserId, p.User.IsAiAgent, p.Content))
                    .Take(30)
                    .ToListAsync(ct);
                // Insan gonderisinde kullanici basina gunluk tepki tavani (olay yoluyla ortak sayim).
                var cappedHumans = await CappedHumansAsync(candidates.Where(c => !c.IsAiAgent).Select(c => c.UserId), ct);
                candidates = candidates.Where(c => c.IsAiAgent || !cappedHumans.Contains(c.UserId)).ToList();
                if (PickInLanguage(candidates, sameLanguageBots, agent.Language) is not int picked)
                    return Outcome.Skip("Yanitlanacak uygun gonderi yok.");
                rootId = picked;
                task.TargetPostId = rootId;
                var pickedRow = candidates.First(c => c.Id == picked);
                if (!pickedRow.IsAiAgent) task.TargetUserId = pickedRow.UserId;
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

            var isOwnPost = root.UserId == task.AgentUserId;
            var rootLine = new AiThreadLine(isOwnPost, root.Username, root.IsAiAgent, await _conversations.RenderForModelAsync(root.Content, agent.Language, ct));
            var replyLines = new List<AiThreadLine>();
            foreach (var r in replies)
            {
                replyLines.Add(new AiThreadLine(r.UserId == task.AgentUserId, r.Username, r.IsAiAgent, await _conversations.RenderForModelAsync(r.Content!, agent.Language, ct)));
            }

            // Muhatap: bu botun disinda son yazan (rizali insan ya da ayni dildeki bot); yoksa gonderi
            // sahibi. Kendi gonderisinin altinda bot kendine cevap vermez, yanitlayana doner.
            var lastOther = replies.LastOrDefault(r => r.UserId != task.AgentUserId);
            var addressee = lastOther?.Username ?? (isOwnPost ? null : root.Username);
            var addresseeIsHuman = lastOther is not null ? !lastOther.IsAiAgent : !isOwnPost && !root.IsAiAgent;
            int? humanId = lastOther is { IsAiAgent: false } ? lastOther.UserId : !root.IsAiAgent ? root.UserId : null;

            // Insana onun son metninin dilinde cevap: en yeni rizali insan yaniti, yoksa insan kok gonderisi;
            // belirlenemezse insanin arayuz tercihi. Konusmada insan yoksa (bot-bot) botun dili.
            var humanTexts = replies.Where(r => !r.IsAiAgent).Reverse().Select(r => r.Content);
            if (!root.IsAiAgent) humanTexts = humanTexts.Append(root.Content);
            var fallback = humanId is int hid ? await PreferredLanguageAsync(hid, agent.Language, ct) : agent.Language;
            var lang = AiLanguage.OfLatest(humanTexts, fallback);

            var text = await _writer.WritePostReplyAsync(agent, rootLine, replyLines, lang, ct, addressee, addresseeIsHuman);
            if (text is null) return Outcome.Skip("Metin uretilemedi.");

            // Model yazarken kullanici rizasini geri almis olabilir: yazmadan once yeniden kontrol.
            if (!root.IsAiAgent && !await _policy.CanInteractAsync(root.UserId, ct))
                return Outcome.Skip("Gonderi sahibi AI etkilesimine uygun degil.");

            // Etiket yalnizca ayni dildeki botlara ve riza vermis katilimcilara (gonderi sahibi dahil) donusur.
            // Baska dildeki bir botun gonderisinde bile o bot etiketlenmez (dil grubu kurali).
            var allowed = await AgentHandlesAsync(agent.Language, ct);
            foreach (var (id, name) in eligibleHumans) allowed[name.ToLowerInvariant()] = id;
            if (!root.IsAiAgent) allowed[root.Username.ToLowerInvariant()] = root.UserId;
            allowed.Remove(agent.Username.ToLowerInvariant());
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
            var roster = await _conversations.LoadRosterAsync(agent.Language, ct);
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

            var text = await _writer.WriteGamePostAsync(agent, Facts(game, agent.Language), angle, ct,
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

            var text = await _writer.WriteReviewAsync(agent, Facts(game, agent.Language), rating, ct);
            if (text is null) return Outcome.Skip("Metin uretilemedi.");
            // Incelemede "@ad" dogrudan bildirim: yalnizca ayni dildeki botlar etiketli kalir.
            text = text with { Text = AiMentionLinker.KeepAllowedHandles(text.Text, (await AgentHandlesAsync(agent.Language, ct)).Keys.ToHashSet()) };

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

            // Planli yolda yalniz ayni dildeki botlarin incelemeleri aday.
            var roster = await _conversations.LoadRosterAsync(agent.Language, ct);
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

            // Insan incelemesine onun yazdigi dilde (belirlenemezse arayuz tercihi), bot incelemesine botun dilinde.
            var lang = review.IsAiAgent
                ? agent.Language
                : AiLanguage.Detect(review.Content) ?? await PreferredLanguageAsync(review.UserId, agent.Language, ct);
            var reviewText = review.IsAiAgent ? review.Content : await _conversations.MaskPlainHandlesAsync(review.Content, lang, ct);
            var text = await _writer.WriteReviewCommentAsync(agent, review.Username, Facts(game, lang), review.Rating, reviewText, lang, ct,
                peerNote, myRating, authorIsHuman: !review.IsAiAgent);
            if (text is null) return Outcome.Skip("Metin uretilemedi.");

            // Model yazarken riza geri alinmis olabilir; yorumdaki "@ad" dogrudan bildirim oldugu icin
            // yalnizca ayni dildeki botlar ve (rizali) inceleme sahibi etiketli kalir.
            if (!review.IsAiAgent && !await _policy.CanInteractAsync(review.UserId, ct)) return Outcome.Skip("Inceleme sahibi AI etkilesimine uygun degil.");
            var allowedHandles = (await AgentHandlesAsync(agent.Language, ct)).Keys.ToHashSet();
            if (!review.IsAiAgent) allowedHandles.Add(review.Username.ToLowerInvariant());
            text = text with { Text = AiMentionLinker.KeepAllowedHandles(text.Text, allowedHandles) };

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

            var roster = await _conversations.LoadRosterAsync(agent.Language, ct);
            var me = roster.FirstOrDefault(a => a.UserId == task.AgentUserId);
            var commenter = roster.FirstOrDefault(a => a.UserId == comment.UserId);
            var peerNote = me is not null && commenter is not null
                ? $"Yorumu yazan da bir AI karakter: {AiConversationService.PeerNote(me, commenter)}"
                : null;

            var game = await _context.Games.AsNoTracking().FirstAsync(g => g.Id == comment.GameId, ct);
            var lang = comment.IsAiAgent
                ? agent.Language
                : AiLanguage.Detect(comment.Content) ?? await PreferredLanguageAsync(comment.UserId, agent.Language, ct);
            var commentText = comment.IsAiAgent ? comment.Content : await _conversations.MaskPlainHandlesAsync(comment.Content, lang, ct);
            var text = await _writer.WriteReviewCommentReplyAsync(agent, comment.Username, commentText, Facts(game, lang),
                comment.Rating, comment.ReviewContent, peerNote, lang, ct, commenterIsHuman: !comment.IsAiAgent);
            if (text is null) return Outcome.Skip("Metin uretilemedi.");

            if (!comment.IsAiAgent && !await _policy.CanInteractAsync(comment.UserId, ct)) return Outcome.Skip("Yorum sahibi uygun degil.");
            var allowedHandles = roster.Select(a => a.Username.ToLowerInvariant()).ToHashSet();
            if (!comment.IsAiAgent) allowedHandles.Add(comment.Username.ToLowerInvariant());
            text = text with { Text = AiMentionLinker.KeepAllowedHandles(text.Text, allowedHandles) };

            var reply = await _reviewComments.CreateCommentAsync(comment.ReviewId, task.AgentUserId,
                new ReviewCommentForCreationDto { Content = text.Text, ParentCommentId = commentId });
            return new Outcome(AiAgentTaskStatus.Done, Summary(text.Text), reply.Id, text);
        }

        // ------------------------------------------------------------------ LLM'siz

        private async Task<Outcome> LikePostAsync(AiAgentTask task, AiAgentIdentity agent, CancellationToken ct)
        {
            var sameLanguageBots = await SameLanguageBotIdsAsync(agent.Language, ct);
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
                .Select(p => new LangCandidate(p.Id, p.UserId, p.User.IsAiAgent, p.Content))
                .Take(30)
                .ToListAsync(ct);
            if (PickInLanguage(candidates, sameLanguageBots, agent.Language) is not int postId)
                return Outcome.Skip("Begenilecek gonderi yok.");

            task.TargetPostId = postId;
            await _posts.SetLikeAsync(postId, task.AgentUserId, true);
            return new Outcome(AiAgentTaskStatus.Done, $"Gonderi {postId} begenildi.", postId);
        }

        /// <summary>
        /// Takip gorevi yalniz INSANA: riza vermis aktif bir kullanici, tercihen botun dilini kullanan.
        /// Bot agi (tum acik botlar birbirini takip eder) admin tarafinda kurulur
        /// (AiAdminService.EnsureBotFollowNetworkAsync).
        /// </summary>
        private async Task<Outcome> FollowHumanAsync(AiAgentTask task, AiAgentIdentity agent, CancellationToken ct)
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
                .Select(u => new { u.Id, u.Username, u.PreferredLocale })
                .Take(20)
                .ToListAsync(ct);
            if (candidates.Count == 0) return Outcome.Skip("Takip edilecek uygun kullanici yok.");

            var sameLanguage = candidates.Where(c => AiLanguage.FromLocale(c.PreferredLocale) == agent.Language).ToList();
            var pool = sameLanguage.Count > 0 ? sameLanguage : candidates;
            var target = pool[Random.Shared.Next(pool.Count)];
            task.TargetUserId = target.Id;
            var ok = await _social.FollowUserAsync(task.AgentUserId, target.Username);
            return ok
                ? new Outcome(AiAgentTaskStatus.Done, $"@{target.Username} takip edildi.", target.Id)
                : Outcome.Skip("Takip yazilamadi.");
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

        /// <summary>
        /// Modele verilen oyun bilgisi. Aciklama cikti dilinde: Ingilizcede RAWG aciklamasi (Turkce
        /// ceviri Ingilizce metne dil sizdirirdi), Turkcede ceviri varsa o.
        /// </summary>
        internal static AiGameFacts Facts(Game g, string lang) => new(
            g.Name,
            g.Released,
            JoinNames(g.GenresJson),
            JoinNames(g.PlatformsJson),
            g.Metacritic,
            g.IgdbRating,
            StripHtml(AiLanguage.Normalize(lang) == AiLanguage.En ? g.Description : g.DescriptionTr ?? g.Description));

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

        /// <summary>Bir dil grubundaki acik botlarin kucuk harf kullanici adi -> kimlik sozlugu (etiket cevirici icin).</summary>
        private async Task<Dictionary<string, int>> AgentHandlesAsync(string lang, CancellationToken ct)
            => (await _conversations.LoadRosterAsync(lang, ct)).ToDictionary(a => a.Username.ToLowerInvariant(), a => a.UserId);

        /// <summary>
        /// Insanin bota gonderdigi okunmamis mesajlari okundu yapar ve gonderene SignalR ile bildirir
        /// (insanin sohbeti acmasindaki SocialService yoluyla ayni olay). Hata ana isi bozmaz.
        /// </summary>
        private async Task MarkThreadReadAsync(int agentId, string agentUsername, int humanId, CancellationToken ct)
        {
            try
            {
                var now = DateTime.UtcNow;
                var updated = await _context.Messages
                    .Where(m => m.SenderId == humanId && m.RecipientId == agentId && m.ReadAt == null)
                    .ExecuteUpdateAsync(s => s.SetProperty(m => m.ReadAt, now), ct);
                if (updated > 0) await _hub.MessageReadAsync(humanId, agentUsername);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "[AiAgents] Bot mesajlari okundu isaretleyemedi (kullanici {UserId}).", humanId);
            }
        }

        /// <summary>Insanin arayuz tercihinin bot dili karsiligi (metinden dil cikmazsa yedek).</summary>
        private async Task<string> PreferredLanguageAsync(int userId, string fallback, CancellationToken ct)
        {
            var locale = await _context.Users.AsNoTracking().Where(u => u.Id == userId).Select(u => u.PreferredLocale).FirstOrDefaultAsync(ct);
            return locale is null ? fallback : AiLanguage.FromLocale(locale);
        }

        /// <summary>Son 24 saatte bot tepki tavanini (AiAgentEvents ile ortak) doldurmus kullanicilar.</summary>
        private async Task<HashSet<int>> CappedHumansAsync(IEnumerable<int> userIds, CancellationToken ct)
        {
            var ids = userIds.Distinct().ToList();
            if (ids.Count == 0) return new HashSet<int>();
            var since = DateTime.UtcNow.AddHours(-24);
            return (await _context.AiAgentTasks.AsNoTracking()
                    .Where(t => t.TargetUserId != null && ids.Contains(t.TargetUserId.Value) && t.CreatedAt >= since &&
                                (t.Type == AiAgentTaskType.ReplyToPost || t.Type == AiAgentTaskType.CommentOnReview ||
                                 t.Type == AiAgentTaskType.CommentOnList))
                    .GroupBy(t => t.TargetUserId!.Value)
                    .Select(g => new { UserId = g.Key, Count = g.Count() })
                    .ToListAsync(ct))
                .Where(x => x.Count >= AiAgentEvents.MaxPublicReactionsPerUserPerDay)
                .Select(x => x.UserId)
                .ToHashSet();
        }

        private async Task<IReadOnlySet<int>> SameLanguageBotIdsAsync(string lang, CancellationToken ct)
            => (await _conversations.LoadRosterAsync(lang, ct)).Select(a => a.UserId).ToHashSet();

        private sealed record LangCandidate(int Id, int UserId, bool IsAiAgent, string? Content);

        /// <summary>
        /// Planli hedef dil grubunda kalir: yalniz ayni dildeki botlarin icerigi aday. Insan iceriginde
        /// metni botun dilinde olan (ya da dili belirsiz kisa metin) tercih edilir; yoksa digerleri
        /// (o zaman cevap yine insanin dilinde yazilir).
        /// </summary>
        private static int? PickInLanguage(IReadOnlyList<LangCandidate> candidates, IReadOnlySet<int> sameLanguageBots, string lang)
        {
            var pool = candidates.Where(c => !c.IsAiAgent || sameLanguageBots.Contains(c.UserId)).ToList();
            var preferred = pool.Where(c => c.IsAiAgent || AiLanguage.Matches(c.Content ?? string.Empty, lang)).ToList();
            var source = preferred.Count > 0 ? preferred : pool;
            return source.Count == 0 ? null : source[Random.Shared.Next(source.Count)].Id;
        }

        private static string ReplaceFirst(string text, string search, string replacement)
        {
            var i = text.IndexOf(search, StringComparison.Ordinal);
            return i < 0 ? text : text[..i] + replacement + text[(i + search.Length)..];
        }

        private static string Summary(string text) => SafeText.Ellipsis(text, 280);
    }
}
