using GGHub.Application.Dtos;

namespace GGHub.Application.Interfaces
{
    public interface IActivityService
    {
        Task<IEnumerable<ActivityDto>> GetUserActivityFeedAsync(string username, int limit = 20);
    }
}