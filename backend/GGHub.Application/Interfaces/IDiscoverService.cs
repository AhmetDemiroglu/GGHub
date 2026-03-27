using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;

namespace GGHub.Application.Interfaces
{
    public interface IDiscoverService
    {
        Task<PaginatedResult<GameDto>> DiscoverAsync(DiscoverQueryParams queryParams, int? userId = null);
    }
}
