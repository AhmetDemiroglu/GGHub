using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace GGHub.Infrastructure.Services
{
    /// <inheritdoc />
    public class AiSettingsProvider : IAiSettingsProvider
    {
        private const string CacheKey = "ai-settings";
        private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

        private readonly GGHubDbContext _context;
        private readonly IMemoryCache _cache;

        public AiSettingsProvider(GGHubDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<AiSettings> GetAsync(CancellationToken cancellationToken = default)
        {
            if (_cache.TryGetValue(CacheKey, out AiSettings? cached) && cached is not null)
            {
                return cached;
            }

            var row = await _context.AiSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1, cancellationToken)
                      ?? await CreateDefaultAsync(cancellationToken);

            _cache.Set(CacheKey, row, CacheTtl);
            return row;
        }

        public async Task<AiSettings> UpdateAsync(Action<AiSettings> mutate, CancellationToken cancellationToken = default)
        {
            var row = await _context.AiSettings.FirstOrDefaultAsync(s => s.Id == 1, cancellationToken);
            if (row is null)
            {
                await CreateDefaultAsync(cancellationToken);
                row = await _context.AiSettings.FirstAsync(s => s.Id == 1, cancellationToken);
            }

            mutate(row);
            row.Id = 1;
            row.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            _cache.Remove(CacheKey);
            _context.Entry(row).State = EntityState.Detached;
            return row;
        }

        /// <summary>
        /// Varsayilan satiri yazar. ON CONFLICT: WebAPI ve Worker ayni anda ilk kez okursa ikisi de
        /// eklemeye calisir; ikinci ekleme sessizce dusmeli, istisna firlatmamali.
        /// </summary>
        private async Task<AiSettings> CreateDefaultAsync(CancellationToken cancellationToken)
        {
            var d = new AiSettings();
            await _context.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "AiSettings" ("Id", "AgentsEnabled", "TranslationMonthlyBudgetTry", "AgentMonthlyBudgetTry",
                    "UsdToTryRate", "PrimaryModel", "FallbackModel", "PrimaryModelRpm", "DailyActionsPerAgent",
                    "MaxAgentMessagesPerUserPerDay", "MaxUnsolicitedDmPerUserPerWeek", "MaxAgentRepliesPerPost",
                    "FeedMaxAiSharePercent", "ActiveFromHour", "ActiveToHour", "UpdatedAt")
                VALUES (1, {d.AgentsEnabled}, {d.TranslationMonthlyBudgetTry}, {d.AgentMonthlyBudgetTry},
                    {d.UsdToTryRate}, {d.PrimaryModel}, {d.FallbackModel}, {d.PrimaryModelRpm}, {d.DailyActionsPerAgent},
                    {d.MaxAgentMessagesPerUserPerDay}, {d.MaxUnsolicitedDmPerUserPerWeek}, {d.MaxAgentRepliesPerPost},
                    {d.FeedMaxAiSharePercent}, {d.ActiveFromHour}, {d.ActiveToHour}, {DateTime.UtcNow})
                ON CONFLICT ("Id") DO NOTHING
                """, cancellationToken);

            return await _context.AiSettings.AsNoTracking().FirstAsync(s => s.Id == 1, cancellationToken);
        }
    }
}
