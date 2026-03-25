using GGHub.Application.Dtos;
using GGHub.Application.Dtos.Home;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;

namespace GGHub.Infrastructure.Services
{
    public class HomeService : IHomeService
    {
        private readonly GGHubDbContext _context;
        private readonly IGameService _gameService;
        private readonly IMemoryCache _cache;
        private static readonly Random _random = new();

        public HomeService(GGHubDbContext context, IGameService gameService, IMemoryCache cache)
        {
            _context = context;
            _gameService = gameService;
            _cache = cache;
        }

        public async Task<HomeViewModel> GetHomeContentAsync(int? currentUserId, bool preferTurkish)
        {
            var viewModel = new HomeViewModel();
            var twoYearsAgo = DateTime.UtcNow.AddYears(-2).ToString("yyyy-MM-dd");

            // Hero adaylarını cache'den al (tüm listeyi her istekte DB'den çekmeyi önler)
            var heroCandidateIds = await _cache.GetOrCreateAsync("hero-candidate-ids", async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30);
                return await _context.Games
                    .AsNoTracking()
                    .Where(g => g.Released != null
                                && g.BackgroundImage != null
                                && string.Compare(g.Released, twoYearsAgo) >= 0
                                && g.Metacritic != null && g.Metacritic >= 75
                                && g.Rating != null && g.Rating >= 3.80
                                && (g.AverageRating == 0 || g.AverageRating >= 7.0))
                    .Select(g => g.Id)
                    .ToListAsync();
            });

            // Rastgele 5 ID seç (bellekte shuffle, DB'de değil)
            var selectedIds = heroCandidateIds!
                .OrderBy(_ => _random.Next())
                .Take(5)
                .ToList();

            var heroGames = await _context.Games
                .AsNoTracking()
                .Where(g => selectedIds.Contains(g.Id))
                .ToListAsync();

            viewModel.HeroGames = heroGames
                .Select(g =>
                {
                    var platforms = !string.IsNullOrEmpty(g.PlatformsJson)
                        ? JsonSerializer.Deserialize<List<PlatformDto>>(g.PlatformsJson)
                        : new List<PlatformDto>();

                    return new HomeGameDto
                    {
                        Id = g.Id,
                        RawgId = g.RawgId,
                        Name = g.Name,
                        Slug = g.Slug,
                        BackgroundImage = g.BackgroundImage,
                        ReleaseDate = g.Released,
                        MetacriticScore = g.Metacritic,
                        RawgRating = g.Rating,
                        GghubRating = g.AverageRating,
                        GghubRatingCount = g.RatingCount,
                        Description = ResolveDescription(g.Description, g.DescriptionTr, preferTurkish),
                        Platforms = platforms ?? new List<PlatformDto>()
                    };
                })
                .ToList();

            // Trending oyunları da cache'le (5 dk) — sık değişmez
            var trendingGameIds = await _cache.GetOrCreateAsync("trending-game-ids", async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
                return await _context.Reviews
                    .AsNoTracking()
                    .GroupBy(r => r.GameId)
                    .Select(g => new
                    {
                        GameId = g.Key,
                        RecentReviewCount = g.Count(),
                        RecentAvgRating = g.Average(r => r.Rating)
                    })
                    .Where(x => x.RecentReviewCount >= 1 && x.RecentAvgRating >= 7.0)
                    .OrderByDescending(x => x.RecentReviewCount)
                    .ThenByDescending(x => x.RecentAvgRating)
                    .Take(10)
                    .Select(x => x.GameId)
                    .ToListAsync();
            }) ?? new List<int>();

            var trending = await _context.Games
                .AsNoTracking()
                .Where(g => trendingGameIds.Contains(g.Id))
                .Select(g => new HomeGameDto
                {
                    Id = g.Id,
                    RawgId = g.RawgId,
                    Name = g.Name,
                    Slug = g.Slug,
                    BackgroundImage = g.CoverImage ?? g.BackgroundImage,
                    MetacriticScore = g.Metacritic,
                    RawgRating = g.Rating,
                    GghubRating = g.AverageRating,
                    GghubRatingCount = g.RatingCount,
                    Description = ResolveDescription(g.Description, g.DescriptionTr, preferTurkish)
                })
                .ToListAsync();

            viewModel.TrendingLocal = trendingGameIds
                .Select(id => trending.FirstOrDefault(g => g.Id == id))
                .Where(g => g != null)
                .ToList()!;

            viewModel.TopGamers = await _cache.GetOrCreateAsync("top-gamers", async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15);
                return await _context.UserStats
                    .AsNoTracking()
                    .Include(s => s.User)
                    .OrderByDescending(s => s.CurrentXp)
                    .Take(10)
                    .Select(s => new LeaderboardDto
                    {
                        UserId = s.UserId,
                        Username = s.User.Username,
                        ProfileImageUrl = s.User.ProfileImageUrl,
                        Level = s.CurrentLevel,
                        Xp = s.CurrentXp,
                        LevelName = _context.Levels
                            .Where(l => l.LevelNumber == s.CurrentLevel)
                            .Select(l => l.Name)
                            .FirstOrDefault() ?? "Gamer"
                    })
                    .ToListAsync();
            }) ?? new List<LeaderboardDto>();

            viewModel.SiteStats = await _cache.GetOrCreateAsync("site-stats", async entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);
                return new SiteStatsDto
                {
                    TotalGames = await _context.Games.CountAsync(),
                    TotalUsers = await _context.Users.CountAsync(),
                    TotalReviews = await _context.Reviews.CountAsync(),
                    TotalLists = await _context.UserLists.CountAsync()
                };
            });

            return viewModel;
        }

        private static string? ResolveDescription(string? descriptionEn, string? descriptionTr, bool preferTurkish)
        {
            if (preferTurkish)
            {
                return !string.IsNullOrWhiteSpace(descriptionTr) ? descriptionTr : descriptionEn;
            }

            return !string.IsNullOrWhiteSpace(descriptionEn) ? descriptionEn : descriptionTr;
        }
    }
}
