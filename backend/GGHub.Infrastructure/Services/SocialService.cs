using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Localization;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Services
{
    public class SocialService : ISocialService
    {
        private readonly GGHubDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly IGamificationService _gamificationService;
        private readonly IHubNotificationService _hubNotificationService;
        public SocialService(GGHubDbContext context, INotificationService notificationService, IGamificationService gamificationService, IHubNotificationService hubNotificationService)
        {
            _context = context;
            _notificationService = notificationService;
            _gamificationService = gamificationService;
            _hubNotificationService = hubNotificationService;
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
                    var message = AppText.Get("social.followNotification", new Dictionary<string, object?> { ["username"] = follower.Username });
                    await _notificationService.CreateNotificationAsync(followee.Id, message, NotificationType.Follow, $"/profiles/{follower.Username}");
                    
                    await _gamificationService.AddXpAsync(followerId, 20, "UserFollowed");
                    await _gamificationService.CheckAchievementsAsync(followee.Id, "FollowerGained");
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

            var success = await _context.SaveChangesAsync() > 0;

            if (success)
            {
                await _gamificationService.AddXpAsync(followerId, -20, "UserUnfollowed");
            }

            return success;
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
                    var message = AppText.Get("social.listFollowNotification", new Dictionary<string, object?> { ["username"] = follower.Username, ["listName"] = listToFollow.Name });
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

            var followerIds = followers.Select(f => f.Follower.Id).ToList();

            // Batch: current user'ın takip ettiği kişileri tek sorguda al
            var followingSet = currentUserId.HasValue
                ? (await _context.Follows
                    .Where(f => f.FollowerId == currentUserId.Value && followerIds.Contains(f.FolloweeId))
                    .Select(f => f.FolloweeId)
                    .ToListAsync()).ToHashSet()
                : new HashSet<int>();

            var result = followers.Select(follow => new UserDto
            {
                Id = follow.Follower.Id,
                Username = follow.Follower.Username,
                ProfileImageUrl = follow.Follower.ProfileImageUrl,
                FirstName = follow.Follower.FirstName,
                LastName = follow.Follower.LastName,
                IsFollowing = followingSet.Contains(follow.Follower.Id),
                IsProfileAccessible = follow.Follower.ProfileVisibility == ProfileVisibilitySetting.Public ||
                    follow.Follower.Id == currentUserId ||
                    (follow.Follower.ProfileVisibility == ProfileVisibilitySetting.Followers &&
                     followingSet.Contains(follow.Follower.Id))
            }).ToList();

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

            var followeeIds = following.Select(f => f.Followee.Id).ToList();

            // Batch: current user'ın takip ettiği kişileri tek sorguda al
            var followingSet = currentUserId.HasValue
                ? (await _context.Follows
                    .Where(f => f.FollowerId == currentUserId.Value && followeeIds.Contains(f.FolloweeId))
                    .Select(f => f.FolloweeId)
                    .ToListAsync()).ToHashSet()
                : new HashSet<int>();

            var result = following.Select(follow => new UserDto
            {
                Id = follow.Followee.Id,
                Username = follow.Followee.Username,
                ProfileImageUrl = follow.Followee.ProfileImageUrl,
                FirstName = follow.Followee.FirstName,
                LastName = follow.Followee.LastName,
                IsFollowing = followingSet.Contains(follow.Followee.Id),
                IsProfileAccessible = follow.Followee.ProfileVisibility == ProfileVisibilitySetting.Public ||
                    follow.Followee.Id == currentUserId ||
                    (follow.Followee.ProfileVisibility == ProfileVisibilitySetting.Followers &&
                     followingSet.Contains(follow.Followee.Id))
            }).ToList();

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
                throw new InvalidOperationException(AppText.Get("messages.cannotMessageBlockedUser"));
            }

            if (senderId == recipient.Id)
            {
                throw new InvalidOperationException(AppText.Get("messages.cannotMessageSelf"));
            }

            if (recipient.MessageSetting == Core.Enums.MessagePrivacySetting.None)
                throw new InvalidOperationException(AppText.Get("messages.userNotAcceptingMessages"));

            if (recipient.MessageSetting == Core.Enums.MessagePrivacySetting.Following)
            {
                var isSenderFollowedByRecipient = await _context.Follows
                    .AnyAsync(f => f.FollowerId == recipient.Id && f.FolloweeId == senderId);

                if (!isSenderFollowedByRecipient)
                    throw new InvalidOperationException(AppText.Get("messages.followingOnly"));
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

            var result = new MessageDto
            {
                Id = message.Id,
                SenderId = senderId,
                SenderUsername = sender!.Username,
                SenderProfileImageUrl = sender.ProfileImageUrl,
                RecipientId = recipient.Id,
                RecipientUsername = recipient.Username,
                RecipientProfileImageUrl = recipient.ProfileImageUrl,
                Content = message.Content,
                SentAt = message.SentAt,
                ReadAt = message.ReadAt
            };

            // Push real-time events to recipient
            await _hubNotificationService.SendMessageAsync(recipient.Id, result);

            // Update unread message count for recipient
            var recipientUnreadCount = await GetUnreadMessageCountAsync(recipient.Id);
            await _hubNotificationService.UpdateUnreadMessageCountAsync(recipient.Id, recipientUnreadCount);

            // Update conversation list for both sender and recipient
            var senderConversation = new ConversationDto
            {
                PartnerId = recipient.Id,
                PartnerUsername = recipient.Username,
                PartnerProfileImageUrl = recipient.ProfileImageUrl,
                LastMessage = message.Content,
                LastMessageSentAt = message.SentAt,
                UnreadCount = 0
            };
            await _hubNotificationService.UpdateConversationAsync(senderId, senderConversation);

            var recipientConversation = new ConversationDto
            {
                PartnerId = senderId,
                PartnerUsername = sender.Username,
                PartnerProfileImageUrl = sender.ProfileImageUrl,
                LastMessage = message.Content,
                LastMessageSentAt = message.SentAt,
                UnreadCount = recipientUnreadCount
            };
            await _hubNotificationService.UpdateConversationAsync(recipient.Id, recipientConversation);

            return result;
        }
        public async Task<IEnumerable<ConversationDto>> GetConversationsAsync(int userId)
        {
            // DB tarafında gruplama — tüm mesajları belleğe çekmek yerine
            var conversations = await _context.Messages
                .Where(m => (m.SenderId == userId && !m.SenderDeleted) ||
                            (m.RecipientId == userId && !m.RecipientDeleted))
                .GroupBy(m => m.SenderId == userId ? m.RecipientId : m.SenderId)
                .Select(g => new ConversationDto
                {
                    PartnerId = g.Key,
                    PartnerUsername = _context.Users.Where(u => u.Id == g.Key).Select(u => u.Username).FirstOrDefault() ?? "",
                    PartnerProfileImageUrl = _context.Users.Where(u => u.Id == g.Key).Select(u => u.ProfileImageUrl).FirstOrDefault(),
                    LastMessage = g.OrderByDescending(m => m.SentAt).Select(m => m.Content).FirstOrDefault() ?? "",
                    LastMessageSentAt = g.Max(m => m.SentAt),
                    UnreadCount = g.Count(m => m.RecipientId == userId && m.ReadAt == null)
                })
                .OrderByDescending(c => c.LastMessageSentAt)
                .ToListAsync();

            return conversations;
        }
        public async Task<IEnumerable<MessageDto>> GetMessageThreadAsync(int userId, string partnerUsername)
        {
            var partner = await _context.Users.FirstOrDefaultAsync(u => u.Username == partnerUsername);
            if (partner == null)
            {
                throw new KeyNotFoundException(AppText.Get("messages.threadUserNotFound"));
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

                // Notify the sender that their messages have been read
                var reader = await _context.Users.FindAsync(userId);
                if (reader != null)
                {
                    await _hubNotificationService.MessageReadAsync(partner.Id, reader.Username);
                }

                // Update unread message count for the reader
                var readerUnreadCount = await GetUnreadMessageCountAsync(userId);
                await _hubNotificationService.UpdateUnreadMessageCountAsync(userId, readerUnreadCount);
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
