using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace GGHub.Infrastructure.Services
{
    public class GeminiBudgetService : IGeminiBudgetService
    {
        private readonly GGHubDbContext _context;
        private readonly GeminiSettings _settings;

        public GeminiBudgetService(GGHubDbContext context, IOptions<GeminiSettings> settings)
        {
            _context = context;
            _settings = settings.Value;
        }

        public static string CurrentPeriodKey() => DateTime.UtcNow.ToString("yyyy-MM");

        public async Task EnsureBudgetAvailableAsync(CancellationToken cancellationToken = default)
        {
            var status = await GetStatusAsync(cancellationToken);
            if (status.IsExhausted)
            {
                throw new GeminiBudgetExceededException(status.PeriodKey, status.SpentUsd, status.LimitUsd);
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

            var periodKey = CurrentPeriodKey();
            var now = DateTime.UtcNow;

            // Tek ifadede atomik upsert. EF ile oku-degistir-yaz yapsaydik iki job (veya /translate
            // ucu) ayni anda calisirken harcamalar birbirinin uzerine yazilir ve tavan sizardi.
            await _context.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "GeminiUsages" ("PeriodKey", "SpentUsd", "InputTokens", "OutputTokens", "CallCount", "LastUpdatedAt")
                VALUES ({periodKey}, {cost}, {(long)inputTokens}, {(long)outputTokens}, 1, {now})
                ON CONFLICT ("PeriodKey") DO UPDATE SET
                    "SpentUsd"     = "GeminiUsages"."SpentUsd"     + {cost},
                    "InputTokens"  = "GeminiUsages"."InputTokens"  + {(long)inputTokens},
                    "OutputTokens" = "GeminiUsages"."OutputTokens" + {(long)outputTokens},
                    "CallCount"    = "GeminiUsages"."CallCount"    + 1,
                    "LastUpdatedAt" = {now}
                """, cancellationToken);
        }

        public async Task<GeminiBudgetStatus> GetStatusAsync(CancellationToken cancellationToken = default)
        {
            var periodKey = CurrentPeriodKey();

            var row = await _context.GeminiUsages
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.PeriodKey == periodKey, cancellationToken);

            return new GeminiBudgetStatus
            {
                PeriodKey = periodKey,
                LimitUsd = _settings.MonthlyBudgetUsd,
                SpentUsd = row?.SpentUsd ?? 0m,
                InputTokens = row?.InputTokens ?? 0,
                OutputTokens = row?.OutputTokens ?? 0,
                CallCount = row?.CallCount ?? 0
            };
        }
    }
}
