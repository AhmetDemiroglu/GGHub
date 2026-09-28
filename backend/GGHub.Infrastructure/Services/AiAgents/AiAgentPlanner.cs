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
            AiAgentTaskType.LikePost, AiAgentTaskType.FollowUser, AiAgentTaskType.WelcomeDirectMessage
        };

        /// <summary>Tip agirliklari (toplam 100).</summary>
        private static readonly (AiAgentTaskType Type, int Weight)[] Weights =
        {
            (AiAgentTaskType.ReviewGame, 22),
            (AiAgentTaskType.CreatePost, 25),
            (AiAgentTaskType.ReplyToPost, 18),
            (AiAgentTaskType.LikePost, 20),
            (AiAgentTaskType.FollowUser, 9),
            (AiAgentTaskType.WelcomeDirectMessage, 6),
        };

        private readonly GGHubDbContext _context;
        private readonly IAiSettingsProvider _settings;
        private readonly ILogger<AiAgentPlanner> _logger;

        public AiAgentPlanner(GGHubDbContext context, IAiSettingsProvider settings, ILogger<AiAgentPlanner> logger)
        {
            _context = context;
            _settings = settings;
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
                .Select(p => new { p.UserId, p.DailyActionQuota })
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

            if (planned > 0)
            {
                await _context.SaveChangesAsync(ct);
                _logger.LogInformation("[AiAgents] Planlayici {Count} gorev acti.", planned);
            }
            return planned;
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
