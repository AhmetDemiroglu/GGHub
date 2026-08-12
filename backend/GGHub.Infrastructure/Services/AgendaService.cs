using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Oyun Gundemi servisi. Tamamen yerel DB'den okur: RAWG/Steam erisilemez olsa da calisir.
    /// Discover'in kalite kapilari (metacritic/rating/added esikleri) BILEREK kullanilmiyor:
    /// cikmamis oyunlarin henuz puani olmaz, o kapilar gelecek aylari bosaltirdi. Bunun yerine
    /// daha gevsek bir "cop filtresi" var: gorseli ve turu olan, en az bir ilgi sinyali tasiyan oyunlar.
    /// </summary>
    public class AgendaService : IAgendaService
    {
        private const int SectionCap = 100;

        private readonly GGHubDbContext _context;
        private readonly IMemoryCache _cache;

        public AgendaService(GGHubDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<AgendaViewModel> GetAgendaAsync(int year, int month)
        {
            var cacheKey = $"agenda:{year}:{month:D2}";
            if (_cache.TryGetValue(cacheKey, out AgendaViewModel? cached) && cached != null)
            {
                return cached;
            }

            var daysInMonth = DateTime.DaysInMonth(year, month);
            var start = $"{year:D4}-{month:D2}-01";
            var end = $"{year:D4}-{month:D2}-{daysInMonth:D2}";
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");

            // Released string kolonu "yyyy-MM-dd" formatinda; aralik filtresi lexicographic
            // karsilastirmayla dogru calisir (DiscoverService ile ayni teknik).
            var monthGames = await _context.Games
                .AsNoTracking()
                .Where(g => g.Released != null
                    && string.Compare(g.Released, start) >= 0
                    && string.Compare(g.Released, end) <= 0
                    && g.BackgroundImage != null
                    && g.GenresJson != null
                    && (g.RawgAdded >= 50
                        || g.ImportSource == "steam"
                        || g.Metacritic != null
                        || (g.Rating ?? 0) > 0))
                .Select(g => new
                {
                    g.Id, g.RawgId, g.Slug, g.Name, g.Released,
                    g.BackgroundImage, g.CoverImage, g.Rating, g.Metacritic,
                    g.AverageRating, g.RatingCount, g.RawgAdded,
                    g.PlatformsJson, g.GenresJson,
                })
                .ToListAsync();

            var mapped = monthGames
                .Select(g => new
                {
                    g.Released,
                    g.RawgAdded,
                    Dto = new GameDto
                    {
                        Id = g.Id,
                        RawgId = g.RawgId,
                        Slug = g.Slug,
                        Name = g.Name,
                        Released = g.Released,
                        BackgroundImage = g.BackgroundImage,
                        CoverImage = g.CoverImage,
                        Rating = g.Rating,
                        Metacritic = g.Metacritic,
                        GghubRating = g.AverageRating,
                        GghubRatingCount = g.RatingCount,
                        Platforms = DeserializeList<PlatformDto>(g.PlatformsJson),
                        Genres = DeserializeList<GenreDto>(g.GenresJson),
                    },
                })
                .ToList();

            var releasedGames = mapped
                .Where(g => string.CompareOrdinal(g.Released, today) <= 0)
                .OrderByDescending(g => g.Released)
                .ThenByDescending(g => g.RawgAdded ?? 0)
                .ToList();

            var upcomingGames = mapped
                .Where(g => string.CompareOrdinal(g.Released, today) > 0)
                .OrderBy(g => g.Released)
                .ThenByDescending(g => g.RawgAdded ?? 0)
                .ToList();

            var result = new AgendaViewModel
            {
                Year = year,
                Month = month,
                Released = releasedGames.Take(SectionCap).Select(g => g.Dto).ToList(),
                Upcoming = upcomingGames.Take(SectionCap).Select(g => g.Dto).ToList(),
                Counts = new AgendaCountsDto
                {
                    Released = releasedGames.Count,
                    Upcoming = upcomingGames.Count,
                },
            };

            _cache.Set(cacheKey, result, TimeSpan.FromMinutes(30));
            return result;
        }

        private static List<T> DeserializeList<T>(string? json)
        {
            if (string.IsNullOrEmpty(json)) return new List<T>();
            try { return System.Text.Json.JsonSerializer.Deserialize<List<T>>(json) ?? new(); }
            catch { return new(); }
        }
    }
}
