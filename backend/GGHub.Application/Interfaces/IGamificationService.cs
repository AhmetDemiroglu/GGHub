using GGHub.Application.Dtos.Stats;

namespace GGHub.Application.Interfaces
{
    public interface IGamificationService
    {
        Task AddXpAsync(int userId, int xpAmount, string sourceActivity);
        Task<UserStatsDto> GetUserStatsAsync(int userId);
        Task CheckAchievementsAsync(int userId, string activityType);
    }
}