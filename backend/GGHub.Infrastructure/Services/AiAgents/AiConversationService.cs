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
using Outcome = GGHub.Infrastructure.Services.AiAgentTaskProcessor.Outcome;

namespace GGHub.Infrastructure.Services
{
    /// <summary>Acik bir botun ozeti: sahne ve iliski kurgusu icin. Language botun ana dili ("tr" | "en").</summary>
    public sealed record AiAgentInfo(
        int UserId, string Username, string DisplayName, string PersonaKey, string Genres, int RatingBias, string Language);

    /// <summary>
    /// Botlarin kendi aralarindaki ACIK sohbetleri ("sahne"). Ev sahibi bot, diger botlari etiketleyen
    /// bir kok gonderi acar; katilimcilar sirayla yanitlasir. Her tur ayri bir gorevdir (tur arasi
    /// dakikalar), boylece sohbet akista insan temposunda ilerler ve herkes izleyebilir.
    ///
    /// Sahne tipleri (hepsi yalnizca DB bilgisiyle):
    ///   - Debate: iki bot ayni oyuna farkli puan verdi ya da iliski ekseninde (eski/yeni, huzur/rekabet)
    ///     zit taraftalar. Motor her bota tarafini acikca verir.
    ///   - Plan: ev sahibi gundemden secenekli anket acar, katilimcilar oy verip gerekcesini yazar,
    ///     ev sahibi sonucu duyurur.
    ///   - AskExpert: ev sahibi alani disindaki bir oyunu o turun uzmani olan bota sorar.
    ///   - NewRelease: yeni/yaklasan bir cikis uzerine heyecanli ve temkinli iki bakis.
    ///
    /// Gizlilik: tur baglamina yalnizca botlarin ve AI etkilesimine riza vermis insanlarin metni girer;
    /// rizasiz kullanicinin yaniti ve adi modele gitmez (bkz. RenderForModelAsync).
    ///
    /// Dil: sahne ev sahibinin dil grubunda kurulur (katilimcilar ve etiketler o gruptan). Araya giren
    /// rizali bir insana cevap onun yazdigi dilde verilir.
    /// </summary>
    public class AiConversationService
    {
        public const int MaxActiveConversations = 3;
        private static readonly TimeSpan StaleAfter = TimeSpan.FromHours(6);
        private static readonly TimeSpan GameCooldown = TimeSpan.FromDays(10);

        private readonly GGHubDbContext _context;
        private readonly PostService _posts;
        private readonly AiContentWriter _writer;
        private readonly IAiInteractionPolicy _policy;
        private readonly IAiSettingsProvider _settings;
        private readonly ILogger<AiConversationService> _logger;

        public AiConversationService(
            GGHubDbContext context,
            PostService posts,
            AiContentWriter writer,
            IAiInteractionPolicy policy,
            IAiSettingsProvider settings,
            ILogger<AiConversationService> logger)
        {
            _context = context;
            _posts = posts;
            _writer = writer;
            _policy = policy;
            _settings = settings;
            _logger = logger;
        }

        private sealed record ScenePlan(
            AiConversationKind Kind,
            List<AiAgentInfo> Participants,
            Game? Game,
            string Brief,
            Dictionary<string, string> Stances,
            int PlannedTurns,
            List<Game>? PollGames = null);

        // ------------------------------------------------------------------ ortak

        public async Task<List<AiAgentInfo>> LoadRosterAsync(CancellationToken ct)
            => await _context.AiAgentProfiles.AsNoTracking()
                .Where(p => p.IsEnabled && !p.User.IsDeleted && !p.User.IsBanned)
                .Select(p => new AiAgentInfo(p.UserId, p.User.Username, p.User.FirstName ?? p.User.Username,
                    p.PersonaKey, p.FavoriteGenres, p.RatingBias, p.Language))
                .ToListAsync(ct);

        /// <summary>Tek dil grubunun acik botlari (sahne, etiket ve hedef secimi bu grupta kalir).</summary>
        public async Task<List<AiAgentInfo>> LoadRosterAsync(string lang, CancellationToken ct)
            => (await LoadRosterAsync(ct)).Where(a => a.Language == lang).ToList();

        /// <summary>"other" botunu "self" botuna anlatan kisa not: ilgi alani + aralarindaki iliski.</summary>
        public static string PeerNote(AiAgentInfo self, AiAgentInfo other)
        {
            var interest = AiAgentPersonas.Interest(other.PersonaKey);
            var who = string.IsNullOrWhiteSpace(interest) ? other.DisplayName : $"{other.DisplayName} ({interest})";
            var rel = AiAgentPersonas.Between(self.PersonaKey, other.PersonaKey);
            if (rel is null) return $"{who}. Aranız iyi, ara sıra takılırsınız.";
            return rel.Value.Rival
                ? $"{who}. Tatlı rakibin: \"{rel.Value.Axis}\" konusunda hep atışırsınız."
                : $"{who}. Yakın arkadaşın, ortak noktanız: {rel.Value.Axis}.";
        }

        /// <summary>
        /// Gonderi metnindeki etiket token'larini okunur adlara cevirir (model baglami ve AI Kulubu'ndeki
        /// canli satirlar icin). Bot ve riza vermis kullanicilar adiyla, digerleri "@bir kullanici" /
        /// "@a user" olarak gider: rizasiz kullanicinin adi modele sizmaz. lang yer tutucularin dili.
        /// </summary>
        public async Task<string> RenderForModelAsync(string content, string lang, CancellationToken ct)
        {
            var matches = MentionToken.Matches(content);
            if (matches.Count == 0) return content;

            var userIds = matches.Where(m => m.Groups[1].Value == "u").Select(m => int.Parse(m.Groups[2].Value)).Distinct().ToList();
            var gameIds = matches.Where(m => m.Groups[1].Value == "g").Select(m => int.Parse(m.Groups[2].Value)).Distinct().ToList();
            var listIds = matches.Where(m => m.Groups[1].Value == "l").Select(m => int.Parse(m.Groups[2].Value)).Distinct().ToList();

            var en = AiLanguage.Normalize(lang) == AiLanguage.En;
            var someone = en ? "@a user" : "@bir kullanıcı";
            var today = BirthdayCalendar.TodayInIstanbul();
            var users = (await _context.Users.AsNoTracking()
                    .Where(u => userIds.Contains(u.Id))
                    .Select(u => new { u.Id, u.Username, u.IsAiAgent, u.IsDeleted, u.IsBanned, u.AllowAiInteraction, u.DateOfBirth })
                    .ToListAsync(ct))
                .ToDictionary(u => u.Id, u => u.IsAiAgent ||
                    AiInteractionRules.IsEligible(false, u.IsDeleted, u.IsBanned, u.AllowAiInteraction, u.DateOfBirth, today)
                        ? "@" + u.Username
                        : someone);
            var games = await _context.Games.AsNoTracking().Where(g => gameIds.Contains(g.Id)).ToDictionaryAsync(g => g.Id, g => g.Name, ct);
            var lists = await _context.UserLists.AsNoTracking().Where(l => listIds.Contains(l.Id)).ToDictionaryAsync(l => l.Id, l => l.Name, ct);

            return MentionToken.Replace(content, m =>
            {
                var id = int.Parse(m.Groups[2].Value);
                return m.Groups[1].Value switch
                {
                    "u" => users.GetValueOrDefault(id, someone),
                    "g" => games.GetValueOrDefault(id, en ? "a game" : "bir oyun"),
                    _ => lists.GetValueOrDefault(id, en ? "a list" : "bir liste")
                };
            });
        }

        private static readonly Regex MentionToken = new(MentionTokens.PatternSource, RegexOptions.Compiled);

        /// <summary>6 saattir hareket olmayan acik sahneleri kapatir (kok silinmis, gorevler dusmus...).</summary>
        public async Task AbandonStaleAsync(CancellationToken ct)
        {
            var before = DateTime.UtcNow - StaleAfter;
            await _context.AiConversations
                .Where(c => c.Status == AiConversationStatus.Active && c.LastActivityAt < before)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(c => c.Status, AiConversationStatus.Abandoned)
                    .SetProperty(c => c.FinishedAt, DateTime.UtcNow), ct);
        }

        // ------------------------------------------------------------------ sahne acilisi

        public async Task<Outcome> StartAsync(AiAgentTask task, AiAgentIdentity identity, CancellationToken ct)
        {
            var settings = await _settings.GetAsync(ct);
            var dayAgo = DateTime.UtcNow.AddHours(-24);

            var active = await _context.AiConversations.CountAsync(c => c.Status == AiConversationStatus.Active, ct);
            if (active >= MaxActiveConversations) return Outcome.Skip("Acik sahne tavani dolu.");
            var today = await _context.AiConversations.CountAsync(c => c.CreatedAt >= dayAgo, ct);
            if (today >= settings.ConversationsPerDay) return Outcome.Skip("Gunluk sahne tavani dolu.");
            if (await _context.AiConversations.AnyAsync(c => c.Status == AiConversationStatus.Active && c.HostAgentId == task.AgentUserId, ct))
                return Outcome.Skip("Bu botun zaten acik bir sahnesi var.");

            // Sahne ev sahibinin dil grubunda kurulur: Plan*/PickThird/Friends bu kadrodan secer.
            var roster = await LoadRosterAsync(identity.Language, ct);
            var host = roster.FirstOrDefault(a => a.UserId == task.AgentUserId);
            if (host is null || roster.Count < 2) return Outcome.Skip("Sahne icin dil grubunda yeterli bot yok.");

            var maxTurns = Math.Clamp(settings.MaxConversationTurns, 2, 12);
            var recentGameIds = await _context.AiConversations.AsNoTracking()
                .Where(c => c.GameId != null && c.CreatedAt >= DateTime.UtcNow - GameCooldown)
                .Select(c => c.GameId!.Value)
                .ToListAsync(ct);

            ScenePlan? plan = null;
            foreach (var kind in KindOrder())
            {
                plan = kind switch
                {
                    AiConversationKind.Debate => await PlanDebateAsync(host, roster, recentGameIds, maxTurns, ct),
                    AiConversationKind.Plan => await PlanPollAsync(host, roster, recentGameIds, maxTurns, ct),
                    AiConversationKind.AskExpert => await PlanAskExpertAsync(host, roster, recentGameIds, maxTurns, ct),
                    _ => await PlanNewReleaseAsync(host, roster, recentGameIds, maxTurns, ct)
                };
                if (plan is not null) break;
            }
            if (plan is null) return Outcome.Skip("Sahne icin uygun konu bulunamadi.");

            var addressees = plan.Participants.Where(p => p.UserId != host.UserId).ToList();
            var isPoll = plan.Kind == AiConversationKind.Plan;
            var text = await _writer.WriteConversationOpeningAsync(
                identity,
                plan.Brief,
                plan.Stances.GetValueOrDefault(host.UserId.ToString()),
                addressees.Select(a => new AiPeer(a.Username, PeerNote(host, a))).ToList(),
                plan.Game is null ? null : AiAgentTaskProcessor.Facts(plan.Game, host.Language),
                isPoll,
                ct);
            if (text is null) return Outcome.Skip("Metin uretilemedi.");

            var allowed = roster.ToDictionary(a => a.Username.ToLowerInvariant(), a => a.UserId);
            var content = AiMentionLinker.Link(text.Text, allowed);
            if (plan.Game is not null)
            {
                content = ReplaceFirst(content, AiContentWriter.GamePlaceholder, $"@[g:{plan.Game.Id}]")
                    .Replace(AiContentWriter.GamePlaceholder, plan.Game.Name);
            }
            var first = addressees[0];
            if (!AiMentionLinker.Mentions(content, first.UserId)) content = $"@[u:{first.UserId}] {content}";

            var dto = new PostForCreationDto { Content = content };
            if (isPoll && plan.PollGames is { Count: >= 2 })
            {
                dto.Poll = new PostPollForCreationDto
                {
                    Options = plan.PollGames.Select(g => Truncate(g.Name, 40)).ToList(),
                    DurationDays = 2
                };
            }

            var created = await _posts.CreateAsync(host.UserId, dto);

            var stances = new Dictionary<string, string>(plan.Stances);
            if (plan.PollGames is not null) stances["options"] = string.Join(",", plan.PollGames.Select(g => g.Id));

            var now = DateTime.UtcNow;
            var conversation = new AiConversation
            {
                RootPostId = created.Id,
                HostAgentId = host.UserId,
                Kind = plan.Kind,
                Status = AiConversationStatus.Active,
                ParticipantIds = string.Join(",", plan.Participants.Select(p => p.UserId)),
                GameId = plan.Game?.Id,
                Brief = Truncate(plan.Brief, 2000),
                StancesJson = JsonSerializer.Serialize(stances),
                PlannedTurns = plan.PlannedTurns,
                CreatedAt = now,
                LastActivityAt = now
            };
            _context.AiConversations.Add(conversation);
            await _context.SaveChangesAsync(ct);

            _context.AiAgentTasks.Add(new AiAgentTask
            {
                AgentUserId = first.UserId,
                Type = AiAgentTaskType.ConversationTurn,
                Status = AiAgentTaskStatus.Pending,
                ConversationId = conversation.Id,
                TargetPostId = created.Id,
                ScheduledAt = now.AddSeconds(Random.Shared.Next(180, 721)),
                CreatedAt = now
            });
            await _context.SaveChangesAsync(ct);

            task.TargetPostId = created.Id;
            task.TargetGameId = plan.Game?.Id;
            task.ConversationId = conversation.Id;
            return new Outcome(AiAgentTaskStatus.Done, $"[{plan.Kind}] {Summary(text.Text)}", created.Id, text);
        }

        private static IEnumerable<AiConversationKind> KindOrder()
        {
            // Agirlikli karisik sira (Efraimidis-Spirakis: u^(1/w)): tartisma biraz daha sik, ortak plan
            // (anket) ve uzmana soru esit, yeni cikis sohbeti biraz daha seyrek. Secilen tip konu
            // bulamazsa siradakine gecilir.
            var weighted = new List<(AiConversationKind Kind, double Key)>
            {
                (AiConversationKind.Debate, Math.Pow(Random.Shared.NextDouble(), 1 / 0.30)),
                (AiConversationKind.Plan, Math.Pow(Random.Shared.NextDouble(), 1 / 0.27)),
                (AiConversationKind.AskExpert, Math.Pow(Random.Shared.NextDouble(), 1 / 0.25)),
                (AiConversationKind.NewRelease, Math.Pow(Random.Shared.NextDouble(), 1 / 0.18)),
            };
            return weighted.OrderByDescending(w => w.Key).Select(w => w.Kind);
        }

        private async Task<ScenePlan?> PlanDebateAsync(
            AiAgentInfo host, List<AiAgentInfo> roster, List<int> recentGameIds, int maxTurns, CancellationToken ct)
        {
            var agentIds = roster.Select(a => a.UserId).ToList();
            var byId = roster.ToDictionary(a => a.UserId);

            // (a) Puan kavgasi: ev sahibi ile baska bir bot ayni oyuna en az 2 puan farkla not verdi.
            var mine = _context.Reviews.Where(r => r.UserId == host.UserId);
            var clashes = await _context.Reviews.AsNoTracking()
                .Where(r => agentIds.Contains(r.UserId) && r.UserId != host.UserId && !recentGameIds.Contains(r.GameId))
                .Join(mine, r => r.GameId, m => m.GameId, (r, m) => new { r.GameId, OtherId = r.UserId, Other = r.Rating, Mine = m.Rating })
                .Where(x => x.Other - x.Mine >= 2 || x.Mine - x.Other >= 2)
                .Take(30)
                .ToListAsync(ct);

            if (clashes.Count > 0)
            {
                var pick = clashes
                    .OrderByDescending(c => byId.TryGetValue(c.OtherId, out var o) && AiAgentPersonas.Between(host.PersonaKey, o.PersonaKey)?.Rival == true)
                    .ThenBy(_ => Random.Shared.Next())
                    .First();
                var other = byId[pick.OtherId];
                var game = await _context.Games.AsNoTracking().FirstOrDefaultAsync(g => g.Id == pick.GameId, ct);
                if (game is not null)
                {
                    var participants = new List<AiAgentInfo> { host, other };
                    var stances = new Dictionary<string, string>
                    {
                        [host.UserId.ToString()] = $"Sen bu oyuna {pick.Mine}/10 verdin. @{other.Username} ise {pick.Other}/10 verdi; sen onun puanını {(pick.Mine > pick.Other ? "fazla düşük" : "fazla yüksek")} buluyorsun ve bunu ona açıkça söylüyorsun.",
                        [other.UserId.ToString()] = $"Sen bu oyuna {pick.Other}/10 verdin ve puanının arkasındasın. @{host.Username} ile aynı fikirde değilsin; çok ikna edici bir argüman gelirse biraz yumuşayabilirsin."
                    };
                    var referee = PickThird(host, roster, participants, preferFriendOf: other);
                    if (referee is not null && Random.Shared.NextDouble() < 0.45)
                    {
                        participants.Add(referee);
                        stances[referee.UserId.ToString()] = "İkisinin arasına hakem gibi giriyorsun ama kendi zevkine göre bir tarafa hafifçe kayıyorsun.";
                    }
                    return new ScenePlan(AiConversationKind.Debate, participants, game,
                        $"{host.DisplayName} ile {other.DisplayName} aynı oyuna çok farklı puan verdi ({pick.Mine}/10 ve {pick.Other}/10) ve bunu tartışıyorlar.",
                        stances, Random.Shared.Next(4, Math.Max(5, maxTurns) + 1));
                }
            }

            // (b) Iliski ekseni: ev sahibinin tatli rakibiyle gundemdeki bir oyun uzerinden.
            var rivals = AiAgentPersonas.RelationsOf(host.PersonaKey).Where(r => r.Rival).ToList();
            var rivalPick = rivals
                .Select(r => (Info: roster.FirstOrDefault(a => a.PersonaKey == r.OtherKey), r.Axis))
                .Where(r => r.Info is not null)
                .OrderBy(_ => Random.Shared.Next())
                .FirstOrDefault();
            if (rivalPick.Info is null) return null;

            var pool = await TrendingReleasedAsync(recentGameIds, 40, ct);
            var topic = PickMatching(pool, host.Genres, rivalPick.Info.Genres);
            if (topic is null) return null;

            var rival = rivalPick.Info;
            return new ScenePlan(AiConversationKind.Debate, new List<AiAgentInfo> { host, rival }, topic,
                $"Gündemdeki bir oyun üzerinden eski tartışma yeniden alevleniyor: {rivalPick.Axis}.",
                new Dictionary<string, string>
                {
                    [host.UserId.ToString()] = $"\"{rivalPick.Axis}\" tartışmasında kendi karakterinin tarafını savunuyorsun ve oyunu bu gözle değerlendiriyorsun.",
                    [rival.UserId.ToString()] = $"\"{rivalPick.Axis}\" tartışmasında @{host.Username} ile ters taraftasın, kendi karakterinin tarafını savunuyorsun."
                },
                Random.Shared.Next(4, Math.Max(5, maxTurns) + 1));
        }

        private async Task<ScenePlan?> PlanPollAsync(
            AiAgentInfo host, List<AiAgentInfo> roster, List<int> recentGameIds, int maxTurns, CancellationToken ct)
        {
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var from = DateTime.UtcNow.AddDays(-14).ToString("yyyy-MM-dd");
            var to = DateTime.UtcNow.AddDays(45).ToString("yyyy-MM-dd");
            var pool = await _context.Games.AsNoTracking()
                .Where(g => g.Released != null &&
                            string.Compare(g.Released, from) >= 0 && string.Compare(g.Released, to) <= 0 &&
                            !recentGameIds.Contains(g.Id))
                .OrderByDescending(g => g.TrendScore)
                .Take(12)
                .ToListAsync(ct);

            var games = pool
                .GroupBy(g => Truncate(g.Name, 40), StringComparer.OrdinalIgnoreCase)
                .Select(g => g.First())
                .OrderBy(_ => Random.Shared.Next())
                .Take(Random.Shared.Next(3, 5))
                .ToList();
            if (games.Count < 3) return null;

            var participants = new List<AiAgentInfo> { host };
            foreach (var friend in Friends(host, roster).OrderBy(_ => Random.Shared.Next()))
            {
                if (participants.Count >= 3) break;
                participants.Add(friend);
            }
            foreach (var other in roster.Where(a => participants.All(p => p.UserId != a.UserId)).OrderBy(_ => Random.Shared.Next()))
            {
                if (participants.Count >= 4) break;
                participants.Add(other);
            }
            if (participants.Count < 3) return null;

            var names = string.Join(", ", games.Select(g => g.Name));
            var turns = Math.Min(maxTurns, participants.Count - 1 + 1 + Random.Shared.Next(0, 2));
            return new ScenePlan(AiConversationKind.Plan, participants, null,
                $"{host.DisplayName}, AI arkadaşlarıyla bu dönem hangi oyunu birlikte takip edeceklerini planlıyor ve anket açtı. Seçenekler: {names}. Herkes bir oyun seçip gerekçesini söyleyecek, sonda {host.DisplayName} sonucu duyuracak.",
                new Dictionary<string, string>
                {
                    [host.UserId.ToString()] = "Anketi sen açıyorsun: arkadaşlarını oy vermeye çağır, biraz da kendi favorini ima et."
                },
                Math.Max(3, turns), games);
        }

        private async Task<ScenePlan?> PlanAskExpertAsync(
            AiAgentInfo host, List<AiAgentInfo> roster, List<int> recentGameIds, int maxTurns, CancellationToken ct)
        {
            var pool = await TrendingReleasedAsync(recentGameIds, 40, ct);
            foreach (var game in pool.OrderBy(_ => Random.Shared.Next()))
            {
                if (GenreMatches(game, host.Genres)) continue;
                var expert = roster
                    .Where(a => a.UserId != host.UserId && GenreMatches(game, a.Genres))
                    .OrderBy(_ => Random.Shared.Next())
                    .FirstOrDefault();
                if (expert is null) continue;

                var participants = new List<AiAgentInfo> { host, expert };
                var stances = new Dictionary<string, string>
                {
                    [host.UserId.ToString()] = $"Bu oyunun türü senin alanın değil. Merak ediyorsun, biraz da şüphecisin; @{expert.Username} konunun uzmanı olduğu için ona soruyorsun ve cevaplarını kendi zevkinle kıyaslıyorsun.",
                    [expert.UserId.ToString()] = $"Bu türün uzmanısın. @{host.Username} sana soruyor: bilgini paylaş, gerekirse onun zevkine tatlı tatlı takıl."
                };
                var third = PickThird(host, roster, participants, preferFriendOf: host);
                if (third is not null && Random.Shared.NextDouble() < 0.4)
                {
                    participants.Add(third);
                    stances[third.UserId.ToString()] = "Araya girip kendi bakış açını ekliyorsun, iki tarafa da biraz takılıyorsun.";
                }
                return new ScenePlan(AiConversationKind.AskExpert, participants, game,
                    $"{host.DisplayName} alanı dışındaki bir oyunu merak ediyor ve uzmanı {expert.DisplayName}'e soruyor.",
                    stances, Random.Shared.Next(3, Math.Max(4, Math.Min(maxTurns, 6)) + 1));
            }
            return null;
        }

        private async Task<ScenePlan?> PlanNewReleaseAsync(
            AiAgentInfo host, List<AiAgentInfo> roster, List<int> recentGameIds, int maxTurns, CancellationToken ct)
        {
            var from = DateTime.UtcNow.AddDays(-10).ToString("yyyy-MM-dd");
            var to = DateTime.UtcNow.AddDays(10).ToString("yyyy-MM-dd");
            var pool = await _context.Games.AsNoTracking()
                .Where(g => g.Released != null &&
                            string.Compare(g.Released, from) >= 0 && string.Compare(g.Released, to) <= 0 &&
                            !recentGameIds.Contains(g.Id))
                .OrderByDescending(g => g.TrendScore)
                .Take(15)
                .ToListAsync(ct);
            if (pool.Count == 0) return null;

            var game = pool.FirstOrDefault(g => GenreMatches(g, host.Genres)) ?? pool[Random.Shared.Next(Math.Min(5, pool.Count))];
            var others = roster.Where(a => a.UserId != host.UserId)
                .OrderByDescending(a => GenreMatches(game, a.Genres))
                .ThenByDescending(a => AiAgentPersonas.Between(host.PersonaKey, a.PersonaKey) is not null)
                .ThenBy(_ => Random.Shared.Next())
                .Take(Random.Shared.Next(1, 3))
                .ToList();
            if (others.Count == 0) return null;

            var participants = new List<AiAgentInfo> { host };
            participants.AddRange(others);
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var upcoming = string.CompareOrdinal(game.Released, today) > 0;

            var stances = new Dictionary<string, string>();
            for (var i = 0; i < participants.Count; i++)
            {
                stances[participants[i].UserId.ToString()] = i % 2 == 0
                    ? (upcoming ? "Bu oyunun çıkışını heyecanla bekliyorsun." : "Bu oyunun yeni çıkmasına çok sevindin, heyecanlısın.")
                    : "Bu oyuna temkinli bakıyorsun, beklentinin biraz şişirildiğini düşünüyorsun ama önyargılı değilsin.";
            }
            return new ScenePlan(AiConversationKind.NewRelease, participants, game,
                upcoming ? "Yakında çıkacak bir oyun hakkında beklentiler konuşuluyor." : "Yeni çıkan bir oyun hakkında ilk izlenimler konuşuluyor (oynamadınız, bilinen özelliklerinden konuşuyorsunuz).",
                stances, Random.Shared.Next(3, Math.Max(4, Math.Min(maxTurns, 6)) + 1));
        }

        private async Task<List<Game>> TrendingReleasedAsync(List<int> exclude, int take, CancellationToken ct)
        {
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            return await _context.Games.AsNoTracking()
                .Where(g => g.Released != null && string.Compare(g.Released, today) <= 0 && !exclude.Contains(g.Id))
                .OrderByDescending(g => g.TrendScore)
                .Take(take)
                .ToListAsync(ct);
        }

        private static Game? PickMatching(List<Game> pool, params string[] genreSets)
        {
            if (pool.Count == 0) return null;
            var matching = pool.Where(g => genreSets.Any(s => GenreMatches(g, s))).ToList();
            var source = matching.Count > 0 ? matching : pool;
            return source[Random.Shared.Next(Math.Min(source.Count, 12))];
        }

        public static bool GenreMatches(Game game, string genres)
        {
            if (string.IsNullOrWhiteSpace(game.GenresJson) || string.IsNullOrWhiteSpace(genres)) return false;
            return genres.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Any(s => game.GenresJson.Contains($"\"{s}\"", StringComparison.OrdinalIgnoreCase));
        }

        private static IEnumerable<AiAgentInfo> Friends(AiAgentInfo self, List<AiAgentInfo> roster)
            => AiAgentPersonas.RelationsOf(self.PersonaKey)
                .Where(r => !r.Rival)
                .Select(r => roster.FirstOrDefault(a => a.PersonaKey == r.OtherKey))
                .OfType<AiAgentInfo>();

        private static AiAgentInfo? PickThird(AiAgentInfo host, List<AiAgentInfo> roster, List<AiAgentInfo> taken, AiAgentInfo preferFriendOf)
        {
            var free = roster.Where(a => taken.All(t => t.UserId != a.UserId)).ToList();
            if (free.Count == 0) return null;
            var friend = Friends(preferFriendOf, roster).FirstOrDefault(f => free.Any(x => x.UserId == f.UserId));
            return friend ?? free[Random.Shared.Next(free.Count)];
        }

        // ------------------------------------------------------------------ tur

        public async Task<Outcome> TurnAsync(AiAgentTask task, AiAgentIdentity identity, CancellationToken ct)
        {
            if (task.ConversationId is not int conversationId) return Outcome.Skip("Sahne yok.");
            var conversation = await _context.AiConversations.FirstOrDefaultAsync(c => c.Id == conversationId, ct);
            if (conversation is null || conversation.Status != AiConversationStatus.Active) return Outcome.Skip("Sahne kapanmis.");

            var roster = await LoadRosterAsync(identity.Language, ct);
            var me = roster.FirstOrDefault(a => a.UserId == task.AgentUserId);
            if (me is null) return Outcome.Skip("Bot kapali.");

            var root = await _context.Posts.AsNoTracking()
                .Where(p => p.Id == conversation.RootPostId)
                .Select(p => new { p.Id, p.UserId, p.Content, p.User.Username, p.User.IsAiAgent })
                .FirstOrDefaultAsync(ct);
            if (root is null)
            {
                conversation.Status = AiConversationStatus.Abandoned;
                conversation.FinishedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync(ct);
                return Outcome.Skip("Kok gonderi silinmis.");
            }

            var rawReplies = await _context.Posts.AsNoTracking()
                .Where(p => p.ParentPostId == root.Id && p.Content != null)
                .OrderBy(p => p.CreatedAt)
                .Take(40)
                .Select(p => new { p.UserId, p.Content, p.User.Username, p.User.IsAiAgent })
                .ToListAsync(ct);

            // Gizlilik: rizasiz insanlarin yanitlari sahne baglamina girmez.
            var eligibleHumans = new Dictionary<int, string>();
            foreach (var human in rawReplies.Where(r => !r.IsAiAgent).Select(r => new { r.UserId, r.Username }).Distinct())
            {
                if (await _policy.CanInteractAsync(human.UserId, ct)) eligibleHumans[human.UserId] = human.Username;
            }
            var replies = rawReplies.Where(r => r.IsAiAgent || eligibleHumans.ContainsKey(r.UserId)).TakeLast(14).ToList();

            if (replies.Count > 0 && replies[^1].UserId == me.UserId) return Outcome.Skip("Son soz zaten bu botun.");

            var lines = new List<AiThreadLine>();
            foreach (var r in replies)
            {
                lines.Add(new AiThreadLine(r.UserId == me.UserId, r.Username, r.IsAiAgent, await RenderForModelAsync(r.Content!, me.Language, ct)));
            }
            var rootLine = new AiThreadLine(root.UserId == me.UserId, root.Username, root.IsAiAgent, await RenderForModelAsync(root.Content ?? string.Empty, me.Language, ct));

            // Muhatap: bu bot disinda son konusan (bot ya da rizali insan); kimse yoksa ev sahibi.
            var lastOther = replies.LastOrDefault(r => r.UserId != me.UserId);
            int? addresseeId = lastOther?.UserId ?? (root.UserId != me.UserId ? root.UserId : null);
            var addresseeName = lastOther?.Username ?? (root.UserId != me.UserId ? root.Username : null);

            var turnNo = conversation.TurnsDone + 1;
            var isFinal = turnNo >= conversation.PlannedTurns;
            var stances = string.IsNullOrWhiteSpace(conversation.StancesJson)
                ? new Dictionary<string, string>()
                : JsonSerializer.Deserialize<Dictionary<string, string>>(conversation.StancesJson) ?? new();
            var stance = stances.GetValueOrDefault(me.UserId.ToString());

            if (conversation.Kind == AiConversationKind.Plan)
            {
                stance = await PlanStanceAsync(conversation, me, root.Id, isFinal, stances, ct) ?? stance;
            }

            var relationNote = string.Empty;
            var addresseeBot = addresseeId.HasValue ? roster.FirstOrDefault(a => a.UserId == addresseeId.Value) : null;
            if (addresseeBot is not null && addresseeBot.UserId != me.UserId)
            {
                relationNote = $"Cevap verdiğin: {PeerNote(me, addresseeBot)}";
            }

            // Muhatap araya giren rizali bir insansa ona onun yazdigi dilde cevap verilir.
            // (Insanin etiketiyle sahneye karismis baska dilden bir bot insan sayilmaz: bot-bota botun dili.)
            var addresseeIsHuman = lastOther is not null ? !lastOther.IsAiAgent : addresseeId.HasValue && !root.IsAiAgent;
            var lang = addresseeIsHuman ? AiLanguage.Detect(lastOther?.Content ?? root.Content) ?? me.Language : me.Language;

            var text = await _writer.WriteConversationTurnAsync(
                identity, conversation.Brief, stance, relationNote, rootLine, lines, addresseeName, isFinal, lang, ct);
            if (text is null) return Outcome.Skip("Metin uretilemedi.");

            var allowed = roster.ToDictionary(a => a.Username.ToLowerInvariant(), a => a.UserId);
            foreach (var (id, name) in eligibleHumans) allowed[name.ToLowerInvariant()] = id;
            if (!root.IsAiAgent && await _policy.CanInteractAsync(root.UserId, ct)) allowed[root.Username.ToLowerInvariant()] = root.UserId;

            var content = AiMentionLinker.Link(text.Text, allowed);
            if (addresseeId.HasValue && allowed.ContainsValue(addresseeId.Value) && !AiMentionLinker.Mentions(content, addresseeId.Value))
            {
                content = $"@[u:{addresseeId.Value}] {content}";
            }

            var created = await _posts.CreateAsync(me.UserId, new PostForCreationDto { Content = content, ParentPostId = root.Id });

            var now = DateTime.UtcNow;
            conversation.TurnsDone = turnNo;
            conversation.LastActivityAt = now;
            if (isFinal)
            {
                conversation.Status = AiConversationStatus.Finished;
                conversation.FinishedAt = now;
            }
            else
            {
                var participants = ParseIds(conversation.ParticipantIds).Where(id => roster.Any(a => a.UserId == id)).ToList();
                var spoken = replies.Select(r => r.UserId).Append(me.UserId).ToHashSet();
                var next = PickNextSpeaker(conversation, participants, me.UserId, addresseeBot?.UserId, spoken, turnNo + 1 >= conversation.PlannedTurns);
                if (next is int nextId)
                {
                    _context.AiAgentTasks.Add(new AiAgentTask
                    {
                        AgentUserId = nextId,
                        Type = AiAgentTaskType.ConversationTurn,
                        Status = AiAgentTaskStatus.Pending,
                        ConversationId = conversation.Id,
                        TargetPostId = root.Id,
                        ScheduledAt = now.AddSeconds(Random.Shared.Next(180, 1201)),
                        CreatedAt = now
                    });
                }
                else
                {
                    conversation.Status = AiConversationStatus.Finished;
                    conversation.FinishedAt = now;
                }
            }
            await _context.SaveChangesAsync(ct);

            task.TargetPostId = root.Id;
            task.TargetUserId = addresseeId;
            return new Outcome(AiAgentTaskStatus.Done, $"[{conversation.Kind} {turnNo}/{conversation.PlannedTurns}] {Summary(text.Text)}", created.Id, text);
        }

        private static int? PickNextSpeaker(
            AiConversation conversation, List<int> participants, int me, int? addresseeBot, HashSet<int> spoken, bool nextIsFinal)
        {
            var others = participants.Where(id => id != me).ToList();
            if (others.Count == 0) return null;

            if (conversation.Kind == AiConversationKind.Plan)
            {
                var waiting = others.FirstOrDefault(id => id != conversation.HostAgentId && !spoken.Contains(id));
                if (waiting != 0) return waiting;
                return conversation.HostAgentId != me ? conversation.HostAgentId : others[Random.Shared.Next(others.Count)];
            }

            if (nextIsFinal && conversation.HostAgentId != me) return conversation.HostAgentId;

            // Cogunlukla karsilikli atisma (muhataba sira), arada ucuncu kisi araya girer.
            if (addresseeBot is int a && others.Contains(a) && Random.Shared.NextDouble() < 0.7) return a;
            return others[Random.Shared.Next(others.Count)];
        }

        /// <summary>
        /// Anket sahnesinde botun rolu: oy vermediyse turune uygun secenegi secip oy verir ve bunu
        /// anlatir; ev sahibinin son turunda sonucu duyurur.
        /// </summary>
        private async Task<string?> PlanStanceAsync(
            AiConversation conversation, AiAgentInfo me, int rootId, bool isFinal, Dictionary<string, string> stances, CancellationToken ct)
        {
            var poll = await _context.PostPolls.AsNoTracking()
                .Include(p => p.Options)
                .FirstOrDefaultAsync(p => p.PostId == rootId, ct);
            if (poll is null) return null;

            var options = poll.Options.OrderBy(o => o.Position).ToList();
            if (options.Count == 0) return null;

            var voted = await _context.PostPollVotes.AsNoTracking()
                .Where(v => v.PollId == poll.Id && v.UserId == me.UserId)
                .Select(v => (int?)v.OptionId)
                .FirstOrDefaultAsync(ct);

            if (voted is null && poll.EndsAt > DateTime.UtcNow)
            {
                var gameIds = (stances.GetValueOrDefault("options") ?? string.Empty)
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(s => int.TryParse(s, out var id) ? id : 0)
                    .ToList();
                var games = await _context.Games.AsNoTracking().Where(g => gameIds.Contains(g.Id)).ToListAsync(ct);

                var matchingIndexes = gameIds
                    .Select((id, index) => (id, index))
                    .Where(x => games.FirstOrDefault(g => g.Id == x.id) is Game g && GenreMatches(g, me.Genres))
                    .Select(x => x.index)
                    .Where(i => i < options.Count)
                    .ToList();
                var chosenIndex = matchingIndexes.Count > 0
                    ? matchingIndexes[Random.Shared.Next(matchingIndexes.Count)]
                    : Random.Shared.Next(options.Count);
                var option = options[chosenIndex];
                try
                {
                    await _posts.VotePollAsync(rootId, me.UserId, option.Id);
                    voted = option.Id;
                }
                catch (Exception ex) when (ex is InvalidOperationException or KeyNotFoundException)
                {
                    _logger.LogInformation("[AiAgents] Anket oyu verilemedi: {Message}", ex.Message);
                }
            }

            if (isFinal && me.UserId == conversation.HostAgentId)
            {
                var tally = await _context.PostPollOptions.AsNoTracking()
                    .Where(o => o.PollId == poll.Id)
                    .OrderByDescending(o => o.VoteCount)
                    .ThenBy(o => o.Position)
                    .ToListAsync(ct);
                var top = tally.First();
                return $"Anketi sen açtın ve şimdi toparlıyorsun. Şu an önde olan: \"{top.Text}\" ({top.VoteCount} oy). Sonucu eğlenceli bir dille duyur, katılanlara teşekkür et.";
            }

            var mine = options.FirstOrDefault(o => o.Id == voted);
            return mine is null
                ? null
                : $"Ankette \"{mine.Text}\" seçtin. Neden onu seçtiğini karakterine uygun, kısa ve eğlenceli anlat; başka seçeneğe takılabilirsin.";
        }

        // ------------------------------------------------------------------ yardimcilar

        private static List<int> ParseIds(string csv)
            => csv.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(s => int.TryParse(s, out var id) ? id : 0)
                .Where(id => id > 0)
                .ToList();

        private static string ReplaceFirst(string text, string search, string replacement)
        {
            var i = text.IndexOf(search, StringComparison.Ordinal);
            return i < 0 ? text : text[..i] + replacement + text[(i + search.Length)..];
        }

        private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max].TrimEnd();

        private static string Summary(string text) => text.Length <= 280 ? text : text[..277] + "...";
    }
}
