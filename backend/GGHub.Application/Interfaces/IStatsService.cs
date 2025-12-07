using GGHub.Application.Dtos.Stats;

namespace GGHub.Application.Interfaces
{
    public interface IStatsService
    {
        Task<UserStatsDto> GetUserStatsAsync(string username);
    }
}