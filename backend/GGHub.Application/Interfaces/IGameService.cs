using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;
using GGHub.Core.Entities;

namespace GGHub.Application.Interfaces
{
    public interface IGameService
    {
        Task<PaginatedResult<GameDto>> GetGamesAsync(GameQueryParams queryParams, int? userId = null);
        Task<Game?> GetGameBySlugOrIdAsync(string idOrSlug);
        Task<Game> GetOrCreateGameByRawgIdAsync(int rawgId);
    }
}
