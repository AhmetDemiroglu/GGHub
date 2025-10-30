using GGHub.Application.Dtos;

namespace GGHub.Application.Interfaces
{
    public interface ISocialService
    {
        Task<bool> FollowUserAsync(int followerId, string followeeUsername);
        Task<bool> UnfollowUserAsync(int followerId, string followeeUsername);
        Task<IEnumerable<UserDto>> GetFollowersAsync(string username, int? currentUserId = null);
        Task<IEnumerable<UserDto>> GetFollowingAsync(string username, int? currentUserId = null);
        Task<bool> FollowListAsync(int userId, int listId);
        Task<bool> UnfollowListAsync(int userId, int listId);
        Task<MessageDto?> SendMessageAsync(int senderId, MessageForCreationDto messageDto);
        Task<IEnumerable<ConversationDto>> GetConversationsAsync(int userId);
        Task<IEnumerable<MessageDto>> GetMessageThreadAsync(int userId, string partnerUsername);
        Task<bool> BlockUserAsync(int blockerId, string blockedUsername);
        Task<bool> UnblockUserAsync(int blockerId, string blockedUsername);
        Task<int> GetUnreadMessageCountAsync(int userId);
        Task<IEnumerable<BlockedUserDto>> GetBlockedUsersAsync(int userId);
        Task<bool> IsBlockedByMeAsync(int userId, int targetUserId);
        Task<bool> IsBlockingMeAsync(int userId, int targetUserId);
    }
}
