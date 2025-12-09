using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Services
{
    public class SocialService : ISocialService
    {
        private readonly GGHubDbContext _context;
        private readonly INotificationService _notificationService;
        public SocialService(GGHubDbContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }
        public async Task<bool> FollowUserAsync(int followerId, string followeeUsername)
        {
            var followee = await _context.Users.FirstOrDefaultAsync(u => u.Username == followeeUsername && !u.IsDeleted);
            if (followee == null || followee.Id == followerId) return false;

            var isBlocked = await _context.UserBlocks
                .AnyAsync(b => (b.BlockerId == followee.Id && b.BlockedId == followerId) ||
                               (b.BlockerId == followerId && b.BlockedId == followee.Id));

            if (isBlocked) return false;

            var alreadyFollowing = await _context.Follows.AnyAsync(f => f.FollowerId == followerId && f.FolloweeId == followee.Id);
            if (alreadyFollowing) return true;

            var follow = new Follow
            {
                FollowerId = followerId,
                FolloweeId = followee.Id,
                CreatedAt = DateTime.UtcNow
            };
            await _context.Follows.AddAsync(follow);
            var success = await _context.SaveChangesAsync() > 0;

            if (success)
            {
                var follower = await _context.Users.FindAsync(followerId);
                if (follower != null)
                {
                    var message = $"{follower.Username} seni takip etmeye başladı.";
                    await _notificationService.CreateNotificationAsync(followee.Id, message, NotificationType.Follow, $"/profiles/{follower.Username}");
                }
            }
            return success;
        }
        public async Task<bool> UnfollowUserAsync(int followerId, string followeeUsername)
        {
            var followee = await _context.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Username == followeeUsername);
            if (followee == null) return false;

            var follow = await _context.Follows.FirstOrDefaultAsync(f => f.FollowerId == followerId && f.FolloweeId == followee.Id);
            if (follow == null) return false; 

            _context.Follows.Remove(follow);
            return await _context.SaveChangesAsync() > 0;
        }
        public async Task<bool> FollowListAsync(int userId, int listId)
        {
            var listToFollow = await _context.UserLists.FirstOrDefaultAsync(l => l.Id == listId);
            if (listToFollow == null || listToFollow.UserId == userId) return false;

            if (listToFollow.Visibility == ListVisibilitySetting.Private) return false;

            if (listToFollow.Visibility == ListVisibilitySetting.Followers)
            {
                var isFollowingOwner = await _context.Follows
                    .AnyAsync(f => f.FollowerId == userId && f.FolloweeId == listToFollow.UserId);

                if (!isFollowingOwner) return false;
            }
            var alreadyFollowing = await _context.UserListFollows.AnyAsync(f => f.FollowerUserId == userId && f.FollowedListId == listId);
            if (alreadyFollowing) return true;

            var follow = new UserListFollow { FollowerUserId = userId, FollowedListId = listId };
            await _context.UserListFollows.AddAsync(follow);
            var success = await _context.SaveChangesAsync() > 0;

            if (success)
            {
                var follower = await _context.Users.FindAsync(userId);
                if (follower != null)
                {
                    var message = $"{follower.Username}, '{listToFollow.Name}' adlı listen takip etmeye başladı.";
                    await _notificationService.CreateNotificationAsync(listToFollow.UserId, message, NotificationType.ListFollow, $"/lists/{listToFollow.Id}");
                }
            }
            return success;
        }

        public async Task<bool> UnfollowListAsync(int userId, int listId)
        {
            var follow = await _context.UserListFollows.FirstOrDefaultAsync(f => f.FollowerUserId == userId && f.FollowedListId == listId);
            if (follow == null) return false;

            _context.UserListFollows.Remove(follow);
            return await _context.SaveChangesAsync() > 0;
        }
        public async Task<IEnumerable<UserDto>> GetFollowersAsync(string username, int? currentUserId = null)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return Enumerable.Empty<UserDto>();

            var followers = await _context.Follows
                .Where(f => f.FolloweeId == user.Id)
                .Include(f => f.Follower)
                .Where(f => !f.Follower.IsDeleted)
                .ToListAsync();

            var result = new List<UserDto>();
            foreach (var follow in followers)
            {
                var isFollowing = currentUserId.HasValue &&
                                 await _context.Follows.AnyAsync(f =>
                                     f.FollowerId == currentUserId.Value &&
                                     f.FolloweeId == follow.Follower.Id);

                var canAccessProfile = follow.Follower.ProfileVisibility == ProfileVisibilitySetting.Public ||
                      follow.Follower.Id == currentUserId ||
                      (follow.Follower.ProfileVisibility == ProfileVisibilitySetting.Followers &&
                       currentUserId.HasValue &&
                       await _context.Follows.AnyAsync(f =>
                           f.FollowerId == currentUserId.Value &&
                           f.FolloweeId == follow.Follower.Id));

                result.Add(new UserDto
                {
                    Id = follow.Follower.Id,
                    Username = follow.Follower.Username,
                    ProfileImageUrl = follow.Follower.ProfileImageUrl,
                    FirstName = follow.Follower.FirstName,
                    LastName = follow.Follower.LastName,
                    IsFollowing = isFollowing,
                    IsProfileAccessible = canAccessProfile
                });
            }

            return result;
        }

        public async Task<IEnumerable<UserDto>> GetFollowingAsync(string username, int? currentUserId = null)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null) return Enumerable.Empty<UserDto>();

            var following = await _context.Follows
                .Where(f => f.FollowerId == user.Id)
                .Include(f => f.Followee)
                .Where(f => !f.Followee.IsDeleted)
                .ToListAsync();

            var result = new List<UserDto>();
            foreach (var follow in following)
            {
                var isFollowing = currentUserId.HasValue &&
                                 await _context.Follows.AnyAsync(f =>
                                     f.FollowerId == currentUserId.Value &&
                                     f.FolloweeId == follow.Followee.Id);

                var canAccessProfile = follow.Followee.ProfileVisibility == ProfileVisibilitySetting.Public ||
                      follow.Followee.Id == currentUserId ||
                      (follow.Followee.ProfileVisibility == ProfileVisibilitySetting.Followers &&
                       currentUserId.HasValue &&
                       await _context.Follows.AnyAsync(f =>
                           f.FollowerId == currentUserId.Value &&
                           f.FolloweeId == follow.Followee.Id));

                result.Add(new UserDto
                {
                    Id = follow.Followee.Id,
                    Username = follow.Followee.Username,
                    ProfileImageUrl = follow.Followee.ProfileImageUrl,
                    FirstName = follow.Followee.FirstName,
                    LastName = follow.Followee.LastName,
                    IsFollowing = isFollowing,
                    IsProfileAccessible = canAccessProfile
                });
            }

            return result;
        }
        public async Task<MessageDto?> SendMessageAsync(int senderId, MessageForCreationDto messageDto)
        {
            var recipient = await _context.Users.FirstOrDefaultAsync(u => u.Username == messageDto.RecipientUsername);
            if (recipient == null) return null;

            var isBlocked = await _context.UserBlocks.AnyAsync(b => (b.BlockerId == recipient.Id && b.BlockedId == senderId) ||
                           (b.BlockerId == senderId && b.BlockedId == recipient.Id));

            if (isBlocked)
            {
                throw new InvalidOperationException("Bu kullanıcıya mesaj gönderemezsiniz veya bu kullanıcıyı engellediğiniz için mesaj gönderemezsiniz.");
            }

            if (senderId == recipient.Id)
            {
                throw new InvalidOperationException("Kendinize mesaj gönderemezsiniz.");
            }

            if (recipient.MessageSetting == Core.Enums.MessagePrivacySetting.None)
                throw new InvalidOperationException("Bu kullanıcı mesaj kabul etmiyor.");

            if (recipient.MessageSetting == Core.Enums.MessagePrivacySetting.Following)
            {
                var isSenderFollowedByRecipient = await _context.Follows
                    .AnyAsync(f => f.FollowerId == recipient.Id && f.FolloweeId == senderId);

                if (!isSenderFollowedByRecipient)
                    throw new InvalidOperationException("Bu kullanıcı sadece takip ettiği kişilerden mesaj kabul ediyor.");
            }

            var message = new Message
            {
                SenderId = senderId,
                RecipientId = recipient.Id,
                Content = messageDto.Content
            };

            await _context.Messages.AddAsync(message);
            await _context.SaveChangesAsync();

            var sender = await _context.Users.FindAsync(senderId);

            return new MessageDto
            {
                Id = message.Id,
                SenderId = senderId,
                SenderUsername = sender!.Username,
                RecipientId = recipient.Id,
                RecipientUsername = recipient.Username,
                Content = message.Content,
                SentAt = message.SentAt,
                ReadAt = message.ReadAt
            };
        }
        public async Task<IEnumerable<ConversationDto>> GetConversationsAsync(int userId)
        {
            var messages = await _context.Messages
                .Include(m => m.Sender)
                .Include(m => m.Recipient)
                .Where(m => m.SenderId == userId || m.RecipientId == userId)
                .OrderByDescending(m => m.SentAt)
                .ToListAsync();

            var conversations = messages
                .GroupBy(m => m.SenderId == userId ? m.RecipientId : m.SenderId)
                .Select(g =>
                {
                    var lastMessage = g.First();
                    var partner = lastMessage.SenderId == userId ? lastMessage.Recipient : lastMessage.Sender;

                    return new ConversationDto
                    {
                        PartnerId = partner.Id,
                        PartnerUsername = partner.Username,
                        PartnerProfileImageUrl = partner.ProfileImageUrl,
                        LastMessage = lastMessage.Content,
                        LastMessageSentAt = lastMessage.SentAt,
                        UnreadCount = g.Count(m => m.RecipientId == userId && m.ReadAt == null)
                    };
                })
                .OrderByDescending(c => c.LastMessageSentAt);

            return conversations;
        }
        public async Task<IEnumerable<MessageDto>> GetMessageThreadAsync(int userId, string partnerUsername)
        {
            var partner = await _context.Users.FirstOrDefaultAsync(u => u.Username == partnerUsername);
            if (partner == null)
            {
                throw new KeyNotFoundException("Konuşulacak kullanıcı bulunamadı.");
            }

            var messages = await _context.Messages
                .Where(m => (m.RecipientId == userId && m.SenderId == partner.Id) ||
                            (m.RecipientId == partner.Id && m.SenderId == userId))
                .OrderByDescending(m => m.SentAt)
                .Select(m => new MessageDto 
                {
                    Id = m.Id,
                    SenderId = m.SenderId,
                    SenderUsername = m.Sender.Username,
                    SenderProfileImageUrl = m.Sender.ProfileImageUrl,
                    RecipientId = m.RecipientId,
                    RecipientUsername = m.Recipient.Username,
                    RecipientProfileImageUrl = m.Recipient.ProfileImageUrl,
                    Content = m.Content,
                    ReadAt = m.ReadAt,
                    SentAt = m.SentAt
                })
                .ToListAsync();

            var unreadMessages = await _context.Messages
                .Where(m => m.RecipientId == userId && m.SenderId == partner.Id && m.ReadAt == null)
                .ToListAsync();

            if (unreadMessages.Any())
            {
                foreach (var message in unreadMessages)
                {
                    message.ReadAt = DateTime.UtcNow;
                }
                await _context.SaveChangesAsync();
            }

            return messages;
        }
        public async Task<bool> BlockUserAsync(int blockerId, string blockedUsername)
        {
            var blockedUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == blockedUsername);
            if (blockedUser == null || blockedUser.Id == blockerId) return false;

            var alreadyBlocked = await _context.UserBlocks.AnyAsync(b => b.BlockerId == blockerId && b.BlockedId == blockedUser.Id);
            if (alreadyBlocked) return true;

            var followingLink = await _context.Follows
                .FirstOrDefaultAsync(f => f.FollowerId == blockerId && f.FolloweeId == blockedUser.Id);
            if (followingLink != null) _context.Follows.Remove(followingLink);

            var followerLink = await _context.Follows
                .FirstOrDefaultAsync(f => f.FollowerId == blockedUser.Id && f.FolloweeId == blockerId);
            if (followerLink != null) _context.Follows.Remove(followerLink);

            var block = new UserBlock { BlockerId = blockerId, BlockedId = blockedUser.Id };
            await _context.UserBlocks.AddAsync(block);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> UnblockUserAsync(int blockerId, string blockedUsername)
        {
            var blockedUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == blockedUsername);
            if (blockedUser == null) return false;

            var block = await _context.UserBlocks.FirstOrDefaultAsync(b => b.BlockerId == blockerId && b.BlockedId == blockedUser.Id);
            if (block == null) return false;

            _context.UserBlocks.Remove(block);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<IEnumerable<BlockedUserDto>> GetBlockedUsersAsync(int userId)
        {
            var blockedUsers = await _context.UserBlocks
                .Where(b => b.BlockerId == userId)
                .Include(b => b.Blocked)
                .OrderByDescending(b => b.BlockedAt)
                .Select(b => new BlockedUserDto
                {
                    Id = b.Blocked.Id,
                    Username = b.Blocked.Username,
                    ProfileImageUrl = b.Blocked.ProfileImageUrl,
                    FirstName = b.Blocked.FirstName,
                    LastName = b.Blocked.LastName,
                    BlockedAt = b.BlockedAt
                })
                .ToListAsync();

            return blockedUsers;
        }

        public async Task<bool> IsBlockedByMeAsync(int userId, int targetUserId)
        {
            return await _context.UserBlocks
                .AnyAsync(b => b.BlockerId == userId && b.BlockedId == targetUserId);
        }

        public async Task<bool> IsBlockingMeAsync(int userId, int targetUserId)
        {
            return await _context.UserBlocks
                .AnyAsync(b => b.BlockerId == targetUserId && b.BlockedId == userId);
        }
        public async Task<int> GetUnreadMessageCountAsync(int userId)
        {
            return await _context.Messages
                .Where(m => m.RecipientId == userId && m.ReadAt == null && !m.RecipientDeleted)
                .CountAsync();
        }
    }
}
