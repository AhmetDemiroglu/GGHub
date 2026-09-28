using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace GGHub.Infrastructure.Services
{
    /// <inheritdoc />
    public class AiAgentDirectory : IAiAgentDirectory
    {
        private const string CacheKey = "ai-agent-ids";
        private const string LanguageCacheKey = "ai-agent-ids-by-language";
        private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

        private readonly GGHubDbContext _context;
        private readonly IMemoryCache _cache;

        public AiAgentDirectory(GGHubDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<IReadOnlySet<int>> GetAgentIdsAsync(CancellationToken cancellationToken = default)
        {
            if (_cache.TryGetValue(CacheKey, out IReadOnlySet<int>? cached) && cached is not null)
            {
                return cached;
            }

            var ids = (await _context.Users
                .AsNoTracking()
                .Where(u => u.IsAiAgent)
                .Select(u => u.Id)
                .ToListAsync(cancellationToken)).ToHashSet();

            _cache.Set(CacheKey, (IReadOnlySet<int>)ids, CacheTtl);
            return ids;
        }

        public async Task<bool> IsAgentAsync(int userId, CancellationToken cancellationToken = default)
            => (await GetAgentIdsAsync(cancellationToken)).Contains(userId);

        public async Task<IReadOnlySet<int>> GetAgentIdsAsync(string language, CancellationToken cancellationToken = default)
        {
            if (!_cache.TryGetValue(LanguageCacheKey, out Dictionary<string, IReadOnlySet<int>>? byLanguage) || byLanguage is null)
            {
                // Yalniz ACIK botlar: kapatilan (orn. oran dengelemesiyle) botun eski gonderileri akisi doldurmaz.
                var rows = await _context.AiAgentProfiles
                    .AsNoTracking()
                    .Where(p => p.IsEnabled)
                    .Select(p => new { p.UserId, p.Language })
                    .ToListAsync(cancellationToken);
                byLanguage = rows
                    .GroupBy(r => r.Language)
                    .ToDictionary(g => g.Key, g => (IReadOnlySet<int>)g.Select(r => r.UserId).ToHashSet());
                _cache.Set(LanguageCacheKey, byLanguage, CacheTtl);
            }
            return byLanguage.GetValueOrDefault(language) ?? new HashSet<int>();
        }

        public void Invalidate()
        {
            _cache.Remove(CacheKey);
            _cache.Remove(LanguageCacheKey);
        }
    }
}
