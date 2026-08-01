using GGHub.Application.Dtos;
using GGHub.Core.Enums;
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

        /// <summary>
        /// Gonderi composer'i icin TIPLI etiket onerileri (kisi + oyun + liste).
        /// Mevcut SearchMentionableUsersAsync BILEREK duruyor: incelemeler ve
        /// yorumlar hala yalnizca kisi etiketliyor ve mağazadaki eski mobil
        /// surumler o ucu cagiriyor.
        /// </summary>
        Task<IEnumerable<MentionSuggestionDto>> SearchMentionTargetsAsync(
            string query, int currentUserId, IReadOnlyCollection<MentionTargetType> types, int limit = 8);
    }
}