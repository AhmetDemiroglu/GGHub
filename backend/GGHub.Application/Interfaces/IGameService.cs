using GGHub.Application.Dtos;
using GGHub.Core.Entities;

namespace GGHub.Application.Interfaces
{
    public interface IGameService
    {
        Task<IEnumerable<Game>> GetGamesAsync(GameQueryParams queryParams);
        Task<Game?> GetGameBySlugOrIdAsync(string idOrSlug);
        Task<Game> GetOrCreateGameByRawgIdAsync(int rawgId);
    }
}
