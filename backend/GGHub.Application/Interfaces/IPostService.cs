using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;

namespace GGHub.Application.Interfaces
{
    public interface IPostService
    {
        Task<PostDto> CreateAsync(int userId, PostForCreationDto dto);

        /// <summary>Sahibi ya da Admin siler. Yanitlar ve repost'lar cascade ile gider.</summary>
        Task DeleteAsync(int postId, int userId, bool isAdmin);

        /// <summary>Erisim yoksa KeyNotFoundException (varligi da sizdirmamak icin).</summary>
        Task<PostDto> GetByIdAsync(int postId, int? currentUserId);

        Task<PaginatedResult<PostDto>> GetRepliesAsync(int postId, int? currentUserId, ListQueryParams queryParams);

        /// <summary>Profil "Gonderiler" sekmesi. Cursor tabanli (akisla ayni model).</summary>
        Task<IEnumerable<PostDto>> GetUserPostsAsync(string username, int? currentUserId, int limit, DateTime? cursor);

        Task<PostInteractionResultDto> SetLikeAsync(int postId, int userId, bool liked);

        Task<PostInteractionResultDto> SetRepostAsync(int postId, int userId, bool reposted);

        Task<PostPollDto> VotePollAsync(int postId, int userId, int optionId);
    }
}
