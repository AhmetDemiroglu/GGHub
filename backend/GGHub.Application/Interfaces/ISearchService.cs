using GGHub.Application.Dtos;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GGHub.Application.Interfaces
{
    public interface ISearchService
    {
        Task<IEnumerable<SearchResultDto>> SearchAsync(string query, int? currentUserId = null);
        Task<IEnumerable<SearchResultDto>> SearchMessageableUsersAsync(string query, int currentUserId);

    }
}