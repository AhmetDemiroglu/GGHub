using GGHub.Application.Dtos.Home;

namespace GGHub.Application.Interfaces
{
    public interface IHomeService
    {
        Task<HomeViewModel> GetHomeContentAsync(int? currentUserId);
    }
}