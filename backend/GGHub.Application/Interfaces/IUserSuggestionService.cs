using GGHub.Application.Dtos;

namespace GGHub.Application.Interfaces
{
    public interface IUserSuggestionService
    {
        Task<IEnumerable<SuggestedUserDto>> GetSuggestedUsersAsync(int currentUserId, int limit = 10);

        /// <summary>Takip/aboneliği değişen kullanıcının öneri cache'ini düşürür.</summary>
        void InvalidateSuggestions(int userId);
    }
}
