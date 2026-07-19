using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Gemini harcama defteri. Iki ayri fren var ve karistirilmamali:
    ///   1) MonthlyBudgetUsd:   BIZIM koydugumuz para tavani (hedef: aylik 500 TL).
    ///   2) DailyCallCap:       Google'in UCRETSIZ katman gunluk 500 istek limitine karsi koruma.
    ///      Bot bu limiti tek basina yerse canli sitedeki "Turkceye cevir" butonu da olur.
    ///
    /// Defter GUNLUK satir tutuyor (PeriodKey = "yyyy-MM-dd"); aylik harcama o ayin gunlerinin
    /// toplami. Anahtari satir kimliginin parcasi yapmak "sifirla" mantigini tamamen kaldiriyor:
    /// yeni gun = yeni satir, reset job'i ve yaris kosulu yok, gecmis gunler audit olarak kaliyor.
    /// </summary>
    public class GeminiBudgetService : IGeminiBudgetService
    {
        private readonly GGHubDbContext _context;
        private readonly GeminiSettings _settings;

        public GeminiBudgetService(GGHubDbContext context, IOptions<GeminiSettings> settings)
        {
            _context = context;
            _settings = settings.Value;
        }

        /// <summary>Bugunun anahtari, UTC. Google'in kotasi da UTC gunune gore sifirlanir.</summary>
        public static string TodayKey() => DateTime.UtcNow.ToString("yyyy-MM-dd");

        private static string CurrentMonthPrefix() => DateTime.UtcNow.ToString("yyyy-MM");

        public async Task EnsureBudgetAvailableAsync(CancellationToken cancellationToken = default)
        {
            var status = await GetStatusAsync(cancellationToken);

            if (status.IsExhausted)
            {
                throw new GeminiBudgetExceededException(
                    CurrentMonthPrefix(), status.SpentUsd, status.LimitUsd);
            }

            if (status.IsDailyCapReached)
            {
                throw new GeminiQuotaExceededException(
                    $"Gunluk cagri tavanina ulasildi ({status.CallsToday}/{status.DailyCap}). " +
                    "Canli sitedeki ceviri butonuna pay birakmak icin bot burada duruyor.");
            }
        }

        public async Task RecordUsageAsync(int inputTokens, int outputTokens, CancellationToken cancellationToken = default)
        {
            if (inputTokens <= 0 && outputTokens <= 0)
            {
                return;
            }

            var cost = (inputTokens / 1_000_000m) * _settings.InputUsdPerMillion
                     + (outputTokens / 1_000_000m) * _settings.OutputUsdPerMillion;

            var dayKey = TodayKey();
            var now = DateTime.UtcNow;

            // Tek ifadede atomik upsert. EF ile oku-degistir-yaz yapsaydik bot ile /translate ucu
            // ayni anda calisirken harcamalar birbirinin uzerine yazilir ve tavan sizardi.
            await _context.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "GeminiUsages" ("PeriodKey", "SpentUsd", "InputTokens", "OutputTokens", "CallCount", "LastUpdatedAt")
                VALUES ({dayKey}, {cost}, {(long)inputTokens}, {(long)outputTokens}, 1, {now})
                ON CONFLICT ("PeriodKey") DO UPDATE SET
                    "SpentUsd"     = "GeminiUsages"."SpentUsd"     + {cost},
                    "InputTokens"  = "GeminiUsages"."InputTokens"  + {(long)inputTokens},
                    "OutputTokens" = "GeminiUsages"."OutputTokens" + {(long)outputTokens},
                    "CallCount"    = "GeminiUsages"."CallCount"    + 1,
                    "LastUpdatedAt" = {now}
                """, cancellationToken);
        }

        /// <summary>
        /// 429 gibi, token yakmayan ama kotadan DUSEN cagrilari sayar. Google reddedilen istegi de
        /// gunluk kotaya yaziyor; saymazsak bot "daha cok hakkim var" sanip 429 uretmeye devam eder.
        /// </summary>
        public async Task RecordRejectedCallAsync(CancellationToken cancellationToken = default)
        {
            var dayKey = TodayKey();
            var now = DateTime.UtcNow;

            await _context.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "GeminiUsages" ("PeriodKey", "SpentUsd", "InputTokens", "OutputTokens", "CallCount", "LastUpdatedAt")
                VALUES ({dayKey}, 0, 0, 0, 1, {now})
                ON CONFLICT ("PeriodKey") DO UPDATE SET
                    "CallCount"     = "GeminiUsages"."CallCount" + 1,
                    "LastUpdatedAt" = {now}
                """, cancellationToken);
        }

        public async Task<GeminiBudgetStatus> GetStatusAsync(CancellationToken cancellationToken = default)
        {
            var monthPrefix = CurrentMonthPrefix();
            var dayKey = TodayKey();

            // Bu ayin butun gunleri. "2026-07" (eski aylik satir) da bu kalibi gectigi icin
            // semantik degisiminden onceki harcama kaybolmuyor.
            var monthRows = await _context.GeminiUsages
                .AsNoTracking()
                .Where(u => u.PeriodKey.StartsWith(monthPrefix))
                .ToListAsync(cancellationToken);

            var today = monthRows.FirstOrDefault(u => u.PeriodKey == dayKey);

            return new GeminiBudgetStatus
            {
                PeriodKey = monthPrefix,
                LimitUsd = _settings.MonthlyBudgetUsd,
                SpentUsd = monthRows.Sum(u => u.SpentUsd),
                InputTokens = monthRows.Sum(u => u.InputTokens),
                OutputTokens = monthRows.Sum(u => u.OutputTokens),
                CallCount = monthRows.Sum(u => u.CallCount),
                CallsToday = today?.CallCount ?? 0,
                DailyCap = _settings.DailyCallCap
            };
        }
    }
}
