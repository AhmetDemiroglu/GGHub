using GGHub.Application.Dtos;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GGHub.Application.Interfaces
{
    public interface ISearchService
    {
        Task<IEnumerable<SearchResultDto>> SearchAsync(string query, int? currentUserId = null);
        Task<IEnumerable<SearchResultDto>> SearchMessageableUsersAsync(string query, int currentUserId);

        /// <summary>
        /// @bahis otomatik tamamlama adaylari. Diger aramalardan farkli olarak min sorgu
        /// uzunlugu 1'dir: kullanici "@a" yazar yazmaz oneri gormeli.
        /// </summary>
        Task<IEnumerable<UserDto>> SearchMentionableUsersAsync(string query, int currentUserId, int limit = 8);
    }
}