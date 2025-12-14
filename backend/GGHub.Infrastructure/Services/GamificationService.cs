using GGHub.Application.Dtos;
using GGHub.Application.Dtos.Stats;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Services
{
    public class GamificationService : IGamificationService
    {
        private readonly GGHubDbContext _context;

        public GamificationService(GGHubDbContext context)
        {
            _context = context;
        }

        public async Task AddXpAsync(int userId, int xpAmount, string sourceActivity)
        {
            // 1. İstatistik kaydını bul veya oluştur
            var stats = await _context.UserStats
                .FirstOrDefaultAsync(x => x.UserId == userId);

            if (stats == null)
            {
                stats = new UserStats { UserId = userId, CurrentLevel = 1, CurrentXp = 0 };
                _context.UserStats.Add(stats);          
                await CheckAchievementsAsync(userId, "Welcome");
            }

            // 2. XP Ekle
            stats.CurrentXp += xpAmount;
            if (stats.CurrentXp < 0) stats.CurrentXp = 0;

            stats.UpdatedAt = DateTime.UtcNow;

            // 3. Seviye Kontrolü
            var nextLevel = await _context.Levels
                .Where(l => l.LevelNumber > stats.CurrentLevel)
                .OrderBy(l => l.LevelNumber)
                .FirstOrDefaultAsync();

            if (nextLevel != null && stats.CurrentXp >= nextLevel.RequiredXp)
            {
                stats.CurrentLevel = nextLevel.LevelNumber;
            }

            await _context.SaveChangesAsync();
        }

        public async Task CheckAchievementsAsync(int userId, string activityType)
        {
            string? targetBadgeTitle = null;
            bool conditionMet = false;

            switch (activityType)
            {
                case "Welcome":
                    targetBadgeTitle = "Novice";
                    conditionMet = true;
                    break;

                case "ReviewCreated":
                    // "Critic" Rozeti: İlk incelemesini yaptıysa
                    int reviewCount = await _context.Reviews.CountAsync(r => r.UserId == userId);
                    if (reviewCount >= 1)
                    {
                        targetBadgeTitle = "Critic";
                        conditionMet = true;
                    }
                    break;

                case "ListCreated":
                    // "Curator" Rozeti: İlk listesini oluşturduysa
                    int listCount = await _context.UserLists.CountAsync(l => l.UserId == userId);
                    if (listCount >= 1)
                    {
                        targetBadgeTitle = "Curator";
                        conditionMet = true;
                    }
                    break;

                case "FollowerGained":
                    // "Popular" Rozeti: 10 takipçiye ulaştıysa
                    int followerCount = await _context.Follows.CountAsync(f => f.FolloweeId == userId);
                    if (followerCount >= 10)
                    {
                        targetBadgeTitle = "Popular";
                        conditionMet = true;
                    }
                    break;
            }

            if (conditionMet && !string.IsNullOrEmpty(targetBadgeTitle))
            {
                await GrantBadgeAsync(userId, targetBadgeTitle);
            }
        }

        private async Task GrantBadgeAsync(int userId, string badgeTitle)
        {
            var badge = await _context.Achievements.FirstOrDefaultAsync(a => a.Title == badgeTitle);
            if (badge == null) return; 

            bool hasBadge = await _context.UserAchievements
                .AnyAsync(ua => ua.UserId == userId && ua.AchievementId == badge.Id);

            if (!hasBadge)
            {
                try
                {
                    var userAchievement = new UserAchievement
                    {
                        UserId = userId,
                        AchievementId = badge.Id,
                        EarnedAt = DateTime.UtcNow
                    };
                    _context.UserAchievements.Add(userAchievement);
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException { SqlState: "23505" })
                {
                    return;
                }

                if (badge.XpReward > 0)
                {
                    await AddXpAsync(userId, badge.XpReward, "BadgeEarned");
                }
            }
        }

        public async Task<UserStatsDto> GetUserStatsAsync(int userId)
        {
            var stats = await _context.UserStats
                .Include(us => us.User)
                .FirstOrDefaultAsync(x => x.UserId == userId);

            if (stats != null)
            {
                var hasNoviceBadge = await _context.UserAchievements
                    .AnyAsync(ua => ua.UserId == userId && ua.Achievement.Title == "Novice");

                if (!hasNoviceBadge)
                {
                    await CheckAchievementsAsync(userId, "Welcome");
                }
            }

            if (stats == null)
            {
                return new UserStatsDto
                {
                    CurrentLevel = 1,
                    LevelName = "Başlangıç",
                    CurrentXp = 0,
                    NextLevelXp = 100,
                    ProgressPercentage = 0
                };
            }

            var currentLevelInfo = await _context.Levels.FirstOrDefaultAsync(l => l.LevelNumber == stats.CurrentLevel);
            var nextLevelInfo = await _context.Levels.FirstOrDefaultAsync(l => l.LevelNumber == stats.CurrentLevel + 1);

            int nextXpTarget = nextLevelInfo?.RequiredXp ?? stats.CurrentXp; 

            int progress = 0;
            if (nextLevelInfo != null)
            {
                int previousLevelXp = currentLevelInfo?.RequiredXp ?? 0;
                int xpRange = nextLevelInfo.RequiredXp - previousLevelXp;
                int xpGainedInLevel = stats.CurrentXp - previousLevelXp;

                if (xpRange > 0)
                    progress = (int)((double)xpGainedInLevel / xpRange * 100);
            }
            else
            {
                progress = 100; 
            }

            return new UserStatsDto
            {
                CurrentLevel = stats.CurrentLevel,
                LevelName = currentLevelInfo?.Name ?? "Bilinmiyor",
                CurrentXp = stats.CurrentXp,
                NextLevelXp = nextXpTarget,
                ProgressPercentage = Math.Clamp(progress, 0, 100),
                TotalReviews = stats.TotalReviews,
                TotalLists = stats.TotalLists,
                RecentAchievements = await _context.UserAchievements
                    .Where(ua => ua.UserId == userId)
                    .OrderByDescending(ua => ua.EarnedAt)
                    .Select(ua => new AchievementDto  
                    {
                        Title = ua.Achievement.Title,
                        Description = ua.Achievement.Description,
                        IconUrl = ua.Achievement.IconUrl,
                        EarnedAt = ua.EarnedAt
                    })
                    .Take(5)
                    .ToListAsync()
            };
        }
    }
}