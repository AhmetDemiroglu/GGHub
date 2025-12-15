using GGHub.Application.Dtos;
using GGHub.Application.Dtos.Home;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GGHub.Infrastructure.Services
{
    public class HomeService : IHomeService
    {
        private readonly GGHubDbContext _context;
        private readonly IGameService _gameService;

        public HomeService(GGHubDbContext context, IGameService gameService)
        {
            _context = context;
            _gameService = gameService;
        }

        public async Task<HomeViewModel> GetHomeContentAsync(int? currentUserId)
        {
            var viewModel = new HomeViewModel();
            var oneYearAgo = DateTime.UtcNow.AddYears(-2).ToString("yyyy-MM-dd");

            // 1. HERO GAMES
            var heroCandidates = await _context.Games
                .AsNoTracking()
                .Where(g => g.Released != null
                            && g.BackgroundImage != null
                            && string.Compare(g.Released, oneYearAgo) >= 0
                            && (
                                (g.Metacritic != null && g.Metacritic >= 75) ||
                                (g.Rating != null && g.Rating >= 4.0)
                            )
                            && (g.AverageRating == 0 || g.AverageRating >= 7.0))
                .ToListAsync();

            viewModel.HeroGames = heroCandidates
                .OrderBy(x => Guid.NewGuid())
                .Take(5)
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
                        Description = !string.IsNullOrEmpty(g.DescriptionTr) ? g.DescriptionTr : null,
                        Platforms = platforms ?? new List<PlatformDto>()
                    };
                })
                .ToList();

            // 2. TRENDING LOCAL (Yükselenler)
            var sevenDaysAgo = DateTime.UtcNow.AddDays(-7);

            var trendingGameIds = await _context.Reviews
                .AsNoTracking()
                .Where(r => r.CreatedAt >= sevenDaysAgo)
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
                    GghubRatingCount = g.RatingCount
                })
                .ToListAsync();

            trending = trendingGameIds
                .Select(id => trending.FirstOrDefault(g => g.Id == id))
                .Where(g => g != null)
                .ToList()!;

            viewModel.TrendingLocal = trending;

            // 3. LEADERBOARD
            var topGamers = await _context.UserStats
                .AsNoTracking()
                .Include(s => s.User)
                .OrderByDescending(s => s.CurrentXp)
                .Take(5)
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

            viewModel.TopGamers = topGamers;

            return viewModel;
        }
    }
}