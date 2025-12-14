using GGHub.Application.Dtos.Stats;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GGHub.Infrastructure.Services
{
    public class StatsService : IStatsService
    {
        private readonly GGHubDbContext _context;
        private readonly IGamificationService _gamificationService; 
        public StatsService(GGHubDbContext context , IGamificationService gamificationService)
        {
            _context = context;
            _gamificationService = gamificationService;
        }

        public async Task<UserStatsDto> GetUserStatsAsync(string username)
        {
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Username == username);

            if (user == null) return new UserStatsDto();

            // 1. Temel Sayaçlar
            var gamificationStats = await _gamificationService.GetUserStatsAsync(user.Id);
            var totalReviews = await _context.Reviews.CountAsync(r => r.UserId == user.Id);
            var totalLists = await _context.UserListGames.CountAsync(ulg => ulg.UserList.UserId == user.Id);
            var totalFollowers = await _context.Follows.CountAsync(f => f.FolloweeId == user.Id);

            // 2. DNA Hesaplama
            var reviewedGamesGenres = await _context.Reviews
                .Where(r => r.UserId == user.Id)
                .Select(r => r.Game.GenresJson)
                .ToListAsync();

            var listedGamesGenres = await _context.UserListGames
                .Where(ulg => ulg.UserList.UserId == user.Id)
                .Select(ulg => ulg.Game.GenresJson)
                .ToListAsync();

            // 3. ALGORİTMA ve PUANLAMA
            var genreScores = new Dictionary<string, int>();
            int totalScore = 0;

            void ProcessGenres(List<string?> jsonList, int weight)
            {
                foreach (var json in jsonList)
                {
                    if (string.IsNullOrEmpty(json)) continue;

                    try
                    {
                        var genres = JsonSerializer.Deserialize<List<RawgGenre>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                        if (genres != null)
                        {
                            foreach (var genre in genres)
                            {
                                if (!genreScores.ContainsKey(genre.Name))
                                    genreScores[genre.Name] = 0;

                                genreScores[genre.Name] += weight;
                                totalScore += weight;
                            }
                        }
                    }
                    catch { }
                }
            }

            ProcessGenres(reviewedGamesGenres, 3);
            ProcessGenres(listedGamesGenres, 1);

            var dna = genreScores
                .OrderByDescending(x => x.Value)
                .Take(6) 
                .Select(x => new GenreStatDto
                {
                    Name = x.Key,
                    Percentage = totalScore > 0 ? (int)Math.Round((double)x.Value / totalScore * 100) : 0,
                    Color = GetColorForGenre(x.Key)
                })
                .ToList();


            return new UserStatsDto
            {
                TotalReviews = totalReviews,
                TotalGamesListed = totalLists,
                TotalFollowers = totalFollowers,
                GamerDna = dna,

                CurrentLevel = gamificationStats.CurrentLevel,
                LevelName = gamificationStats.LevelName,
                CurrentXp = gamificationStats.CurrentXp,
                NextLevelXp = gamificationStats.NextLevelXp,
                ProgressPercentage = gamificationStats.ProgressPercentage,
                RecentAchievements = gamificationStats.RecentAchievements,
                TotalLists = totalLists
            };
        }
        private class RawgGenre
        {
            public int Id { get; set; }
            public string Name { get; set; } = string.Empty;
            public string Slug { get; set; } = string.Empty;
        }

        private string GetColorForGenre(string genre)
        {
            return genre.ToLower() switch
            {
                "action" => "#ef4444", // Red
                "adventure" => "#f59e0b", // Amber
                "rpg" => "#8b5cf6", // Violet
                "role-playing-games-rpg" => "#8b5cf6",
                "strategy" => "#3b82f6", // Blue
                "shooter" => "#10b981", // Emerald
                "indie" => "#ec4899", // Pink
                "puzzle" => "#6366f1", // Indigo
                "sports" => "#14b8a6", // Teal
                _ => "#64748b" // Slate (Default)
            };
        }
    }
}