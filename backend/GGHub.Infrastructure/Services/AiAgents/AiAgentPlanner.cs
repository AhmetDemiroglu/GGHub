using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Core.Utilities;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Botlarin KENDILIGINDEN yaptigi islerin plani. Her calismada (15 dk) her acik bot icin,
    /// bugunku kotanin kalanini aktif saatlerin kalanina yayacak olasilikla bir gorev acar.
    /// Hedef (hangi oyun, hangi gonderi) burada SECILMEZ: islenirken en guncel veriyle secilir.
    ///
    /// Gun sinirlari Istanbul saatine gore; kota AiAgentProfile.DailyActionQuota ya da
    /// AiSettings.DailyActionsPerAgent.
    /// </summary>
    public class AiAgentPlanner
    {
        private static readonly AiAgentTaskType[] Autonomous =
        {
            AiAgentTaskType.ReviewGame, AiAgentTaskType.CreatePost, AiAgentTaskType.ReplyToPost,
            AiAgentTaskType.LikePost, AiAgentTaskType.FollowUser, AiAgentTaskType.WelcomeDirectMessage,
            AiAgentTaskType.CommentOnReview
        };

        /// <summary>
        /// Tip agirliklari (toplam 100). Inceleme yorumu planli yolda BOT incelemelerini hedefler
        /// (botlar birbirinin incelemesine yorum yazar, inceleme sahibi cevaplar).
        /// </summary>
        private static readonly (AiAgentTaskType Type, int Weight)[] Weights =
        {
            (AiAgentTaskType.ReviewGame, 20),
            (AiAgentTaskType.CreatePost, 22),
            (AiAgentTaskType.ReplyToPost, 15),
            (AiAgentTaskType.LikePost, 17),
            (AiAgentTaskType.FollowUser, 8),
            (AiAgentTaskType.WelcomeDirectMessage, 5),
            (AiAgentTaskType.CommentOnReview, 13),
        };

        private readonly GGHubDbContext _context;
        private readonly IAiSettingsProvider _settings;
        private readonly AiConversationService _conversations;
        private readonly ILogger<AiAgentPlanner> _logger;

        public AiAgentPlanner(
            GGHubDbContext context, IAiSettingsProvider settings, AiConversationService conversations, ILogger<AiAgentPlanner> logger)
        {
            _context = context;
            _settings = settings;
            _conversations = conversations;
            _logger = logger;
        }

        public async Task<int> PlanAsync(int intervalMinutes, CancellationToken ct)
        {
            var settings = await _settings.GetAsync(ct);
            var nowLocal = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, BirthdayCalendar.Istanbul);

            var remainingActiveMinutes = RemainingActiveMinutes(nowLocal, settings.ActiveFromHour, settings.ActiveToHour);
            if (remainingActiveMinutes <= 0) return 0;

            // Istanbul gununun basi (UTC). Gece yarisini asan aktif pencerede (09-01) 00-01 arasi
            // bir ONCEKI gunun kotasina sayilir.
            var dayStartLocal = nowLocal.Hour < settings.ActiveFromHour && settings.ActiveToHour < settings.ActiveFromHour
                ? nowLocal.Date.AddDays(-1)
                : nowLocal.Date;
            var dayStartUtc = new DateTimeOffset(dayStartLocal, nowLocal.Offset).UtcDateTime;

            var agents = await _context.AiAgentProfiles.AsNoTracking()
                .Where(p => p.IsEnabled && !p.User.IsDeleted && !p.User.IsBanned)
                .Select(p => new { p.UserId, p.DailyActionQuota, p.Language })
                .ToListAsync(ct);

            var planned = 0;
            foreach (var agent in agents)
            {
                var quota = agent.DailyActionQuota > 0 ? agent.DailyActionQuota : settings.DailyActionsPerAgent;
                // Bugun acilan kendiliginden-tip gorevler. Tepki olarak acilan gonderi yanitlari da
                // (ReplyToPost) bu sayima girer: insanlarla konusan bot o gun kendiliginden daha az
                // paylasir, toplam bot hacmi kotada kalir. DM yaniti ve inceleme yorumu sayilmaz.
                var done = await _context.AiAgentTasks.CountAsync(t =>
                    t.AgentUserId == agent.UserId && t.CreatedAt >= dayStartUtc && Autonomous.Contains(t.Type), ct);

                var remaining = quota - done;
                if (remaining <= 0) continue;

                // Kalan isi kalan pencereye esit yay: bu calismada is acma olasiligi.
                var slotsLeft = Math.Max(1.0, remainingActiveMinutes / (double)intervalMinutes);
                var expected = remaining / slotsLeft;
                var count = (int)Math.Floor(expected);
                if (Random.Shared.NextDouble() < expected - count) count++;

                for (var i = 0; i < count; i++)
                {
                    _context.AiAgentTasks.Add(new AiAgentTask
                    {
                        AgentUserId = agent.UserId,
                        Type = PickType(),
                        Status = AiAgentTaskStatus.Pending,
                        ScheduledAt = DateTime.UtcNow.AddSeconds(Random.Shared.Next(0, intervalMinutes * 60)),
                        CreatedAt = DateTime.UtcNow
                    });
                    planned++;
                }
            }

            // Sahne dil grubunda kurulur, gunluk sahne butcesi de gruplara bot sayisiyla orantili
            // bolunur (10 TR + 4 EN, 8 sahne: 6 + 2). Ortak butce olsaydi gun icinde erken uyanan grup
            // hepsini harcar, oteki grubun izleyicisi bos "canli" listesi gorurdu. Tek botu kalan grup
            // sahne kuramaz (sahne en az 2 bot ister).
            await _conversations.AbandonStaleAsync(ct);
            var groups = agents.GroupBy(a => a.Language).Where(g => g.Count() >= 2).ToList();
            var groupBots = groups.Sum(g => g.Count());
            foreach (var group in groups)
            {
                var perDay = Math.Max(1, (int)Math.Round(settings.ConversationsPerDay * group.Count() / (double)groupBots));
                planned += await PlanConversationsAsync(group.Select(a => a.UserId).ToList(),
                    settings.ConversationsPerDay > 0 ? perDay : 0, dayStartUtc, remainingActiveMinutes, intervalMinutes, ct);
            }

            if (planned > 0)
            {
                await _context.SaveChangesAsync(ct);
                _logger.LogInformation("[AiAgents] Planlayici {Count} gorev acti.", planned);
            }
            return planned;
        }

        /// <summary>
        /// Bir dil grubunun sahneleri: grubun gunluk payini (perDay) aktif pencereye yayar. Ev sahibi
        /// gruptan rastgele bir bot; sahnenin kendisi (konu, katilimcilar) gorev islenirken ev
        /// sahibinin dil grubundan secilir.
        /// </summary>
        private async Task<int> PlanConversationsAsync(
            List<int> agentIds, int perDay, DateTime dayStartUtc, int remainingActiveMinutes, int intervalMinutes, CancellationToken ct)
        {
            if (perDay <= 0 || agentIds.Count < 2) return 0;

            var startedToday = await _context.AiAgentTasks.CountAsync(t =>
                t.Type == AiAgentTaskType.StartConversation && t.CreatedAt >= dayStartUtc && agentIds.Contains(t.AgentUserId), ct);
            var remaining = perDay - startedToday;
            if (remaining <= 0) return 0;

            var slotsLeft = Math.Max(1.0, remainingActiveMinutes / (double)intervalMinutes);
            var expected = remaining / slotsLeft;
            var count = (int)Math.Floor(expected);
            if (Random.Shared.NextDouble() < expected - count) count++;

            for (var i = 0; i < count; i++)
            {
                _context.AiAgentTasks.Add(new AiAgentTask
                {
                    AgentUserId = agentIds[Random.Shared.Next(agentIds.Count)],
                    Type = AiAgentTaskType.StartConversation,
                    Status = AiAgentTaskStatus.Pending,
                    ScheduledAt = DateTime.UtcNow.AddSeconds(Random.Shared.Next(0, intervalMinutes * 60)),
                    CreatedAt = DateTime.UtcNow
                });
            }
            return count;
        }

        private static AiAgentTaskType PickType()
        {
            var roll = Random.Shared.Next(100);
            foreach (var (type, weight) in Weights)
            {
                if (roll < weight) return type;
                roll -= weight;
            }
            return AiAgentTaskType.LikePost;
        }

        /// <summary>Aktif pencerenin kalan dakikasi; pencere disindaysa 0.</summary>
        public static int RemainingActiveMinutes(DateTimeOffset nowLocal, int fromHour, int toHour)
        {
            var minuteOfDay = nowLocal.Hour * 60 + nowLocal.Minute;
            var from = fromHour * 60;
            var to = toHour * 60;

            if (from == to) return 24 * 60 - minuteOfDay; // tum gun

            if (from < to)
            {
                return minuteOfDay >= from && minuteOfDay < to ? to - minuteOfDay : 0;
            }

            // Gece yarisini asan pencere (09 -> 01).
            if (minuteOfDay >= from) return (24 * 60 - minuteOfDay) + to;
            if (minuteOfDay < to) return to - minuteOfDay;
            return 0;
        }
    }
}
