using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Localization;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore; 

namespace GGHub.Infrastructure.Services
{
    public class UserListCommentService : IUserListCommentService
    {
        private readonly GGHubDbContext _context;
        private readonly IGamificationService _gamificationService;
        private readonly INotificationService _notificationService;
        private readonly IUserDtoEnricher _userDtoEnricher;
        private readonly IMentionService _mentionService;
        public UserListCommentService(GGHubDbContext context, IGamificationService gamificationService, INotificationService notificationService, IUserDtoEnricher userDtoEnricher, IMentionService mentionService)
        {
            _context = context;
            _gamificationService = gamificationService;
            _notificationService = notificationService;
            _userDtoEnricher = userDtoEnricher;
            _mentionService = mentionService;
        }
        private async Task CheckListVisibility(int listId, int? userId)
        {
            var list = await _context.UserLists.AsNoTracking().FirstOrDefaultAsync(l => l.Id == listId);
            if (list == null) throw new KeyNotFoundException(AppText.Get("lists.notFound"));

            if (!userId.HasValue)
            {
                if (list.Visibility != ListVisibilitySetting.Public)
                    throw new UnauthorizedAccessException(AppText.Get("lists.loginRequiredToView"));
                return;
            }

            if (list.UserId == userId.Value) return;

            if (list.Visibility == ListVisibilitySetting.Private)
                throw new UnauthorizedAccessException(AppText.Get("comments.viewPermissionDenied"));

            if (list.Visibility == ListVisibilitySetting.Followers)
            {
                var isFollowingOwner = await _context.Follows
                    .AnyAsync(f => f.FollowerId == userId.Value && f.FolloweeId == list.UserId);
                if (!isFollowingOwner)
                    throw new UnauthorizedAccessException(AppText.Get("lists.followersOnlyView"));
            }
        }

        public async Task<UserListCommentDto> CreateCommentAsync(int listId, int userId, UserListCommentForCreationDto dto)
        {
            await CheckListVisibility(listId, userId);
            if (dto.ParentCommentId.HasValue)
            {
                var parentCommentExists = await _context.UserListComments
                    .AnyAsync(c => c.Id == dto.ParentCommentId.Value && c.UserListId == listId);
                if (!parentCommentExists)
                    throw new InvalidOperationException(AppText.Get("comments.parentNotFound"));
            }

            var user = await _context.Users.FindAsync(userId);

            var comment = new UserListComment
            {
                Content = dto.Content,
                UserId = userId,
                UserListId = listId,
                ParentCommentId = dto.ParentCommentId
            };

            await _context.UserListComments.AddAsync(comment);
            await _context.SaveChangesAsync();

            await _gamificationService.AddXpAsync(userId, 5, "CommentCreated");

            // Bildirim (self haric): yanit -> ust yorum sahibine; ust yorum -> liste sahibine.
            // notifiedUserId: bu olay icin ZATEN bildirim alan kisi. Asagida bahis yayilimindan
            // elenir ki ust yorum sahibini etiketleyen bir yanit iki degil TEK bildirim uretsin.
            int? notifiedUserId = null;
            if (user != null)
            {
                if (dto.ParentCommentId.HasValue)
                {
                    var parentAuthorId = await _context.UserListComments
                        .Where(c => c.Id == dto.ParentCommentId.Value)
                        .Select(c => c.UserId)
                        .FirstOrDefaultAsync();
                    if (parentAuthorId != 0 && parentAuthorId != userId)
                    {
                        await _notificationService.CreateNotificationAsync(
                            parentAuthorId,
                            NotificationType.CommentReply,
                            "social.commentReplyNotification",
                            link: $"/lists/{listId}",
                            actorUserId: userId);
                        notifiedUserId = parentAuthorId;
                    }
                }
                else
                {
                    var owner = await _context.UserLists.AsNoTracking()
                        .Where(l => l.Id == listId)
                        .Select(l => new { l.UserId, l.Name })
                        .FirstOrDefaultAsync();
                    if (owner != null && owner.UserId != userId)
                    {
                        await _notificationService.CreateNotificationAsync(
                            owner.UserId,
                            NotificationType.ListComment,
                            "social.listCommentNotification",
                            new Dictionary<string, string> { ["listName"] = owner.Name },
                            $"/lists/{listId}",
                            userId);
                        notifiedUserId = owner.UserId;
                    }
                }

                await _mentionService.NotifyMentionsAsync(
                    userId,
                    dto.Content,
                    "social.mentionInCommentNotification",
                    $"/lists/{listId}",
                    excludeUserIds: notifiedUserId.HasValue ? new[] { notifiedUserId.Value } : null);
            }

            var created = MapToCommentDto(comment, user, 0, 0, 0, userId);
            await _userDtoEnricher.EnrichAsync(created.Owner, userId);
            return created;
        }

        public async Task<bool> UpdateCommentAsync(int commentId, int userId, UserListCommentForUpdateDto dto)
        {
            var comment = await _context.UserListComments.FindAsync(commentId);
            if (comment == null) throw new KeyNotFoundException(AppText.Get("comments.notFound"));
            if (comment.UserId != userId) throw new UnauthorizedAccessException(AppText.Get("comments.editPermissionDenied"));

            comment.Content = dto.Content;
            comment.UpdatedAt = DateTime.UtcNow;
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> DeleteCommentAsync(int commentId, int userId)
        {
            var comment = await _context.UserListComments.FindAsync(commentId);
            if (comment == null) throw new KeyNotFoundException(AppText.Get("comments.notFound"));
            if (comment.UserId != userId) throw new UnauthorizedAccessException(AppText.Get("comments.deletePermissionDenied"));

            _context.UserListComments.Remove(comment);
            var success = await _context.SaveChangesAsync() > 0;

            if (success)
            {
                await _gamificationService.AddXpAsync(userId, -5, "CommentDeleted");
            }

            return success;
        }

        public async Task<PaginatedResult<UserListCommentDto>> GetCommentsForListAsync(int listId, int? currentUserId,ListQueryParams query)
        {
            await CheckListVisibility(listId, currentUserId);

            var queryable = _context.UserListComments
                .Where(c => c.UserListId == listId && c.ParentCommentId == null)
                .Include(c => c.User)
                .Include(c => c.Votes)
                .Include(c => c.Replies)
                    .ThenInclude(r => r.User)
                .Include(c => c.Replies)
                    .ThenInclude(r => r.Votes)
                .Include(c => c.Replies)
                    .ThenInclude(r => r.Replies)
                        .ThenInclude(r2 => r2.User)
                .Include(c => c.Replies)
                    .ThenInclude(r => r.Replies)
                        .ThenInclude(r2 => r2.Votes)
                .Include(c => c.Replies)
                    .ThenInclude(r => r.Replies)
                        .ThenInclude(r2 => r2.Replies)
                            .ThenInclude(r3 => r3.User)
                .Include(c => c.Replies)
                    .ThenInclude(r => r.Replies)
                        .ThenInclude(r2 => r2.Replies)
                            .ThenInclude(r3 => r3.Votes)
                .AsSplitQuery()
                .AsNoTracking();

            var totalCount = await queryable.CountAsync();

            var items = await queryable
                .OrderByDescending(c => c.CreatedAt)
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            var dtos = items.Select(comment =>
            {
                var upvotes = comment.Votes.Count(v => v.Value == 1);
                var downvotes = comment.Votes.Count(v => v.Value == -1);

                var currentUserVote = currentUserId.HasValue
                    ? comment.Votes.FirstOrDefault(v => v.UserId == currentUserId.Value)?.Value ?? 0
                    : 0;

                return MapToCommentDto(comment, comment.User, upvotes, downvotes, currentUserVote, currentUserId);
            }).ToList();

            // Ic ice yanitlarin sahipleri dahil, tum agac icin tek batch.
            await _userDtoEnricher.EnrichAsync(CollectOwners(dtos), currentUserId);

            return new PaginatedResult<UserListCommentDto>
            {
                Items = dtos,
                TotalCount = totalCount,
                Page = query.Page,
                PageSize = query.PageSize
            };
        }
        public async Task<bool> VoteOnCommentAsync(int commentId, int userId, UserListCommentVoteDto dto)
        {
            var comment = await _context.UserListComments.FindAsync(commentId);
            if (comment == null) throw new KeyNotFoundException(AppText.Get("comments.notFound"));

            await CheckListVisibility(comment.UserListId, userId);

            if (comment.UserId == userId)
                throw new InvalidOperationException(AppText.Get("comments.cannotVoteOwnComment"));

            if (dto.Value == 0) 
                throw new InvalidOperationException(AppText.Get("comments.invalidVoteValue"));

            var existingVote = await _context.UserListCommentVotes
                .FirstOrDefaultAsync(v => v.UserListCommentId == commentId && v.UserId == userId);

            // Yalnizca upvote'a GECISTE bildir (yeni upvote ya da down->up). Unvote/downvote'ta bildirme.
            bool willUpvote = dto.Value == 1 && (existingVote == null || existingVote.Value != dto.Value);

            if (existingVote == null)
            {
                await _context.UserListCommentVotes.AddAsync(new UserListCommentVote
                {
                    UserId = userId,
                    UserListCommentId = commentId,
                    Value = dto.Value
                });
            }
            else
            {
                if (existingVote.Value == dto.Value)
                {
                    _context.UserListCommentVotes.Remove(existingVote);
                }
                else
                {
                    existingVote.Value = dto.Value;
                }
            }

            var success = await _context.SaveChangesAsync() > 0;

            // Self zaten yukarida engelli (comment.UserId == userId -> throw).
            if (success && willUpvote)
            {
                await _notificationService.CreateNotificationAsync(
                    comment.UserId,
                    NotificationType.CommentLike,
                    "social.commentLikeNotification",
                    link: $"/lists/{comment.UserListId}",
                    actorUserId: userId);
            }

            return success;
        }

        public async Task<UserListCommentDto> GetCommentByIdAsync(int commentId, int currentUserId)
        {
            var comment = await _context.UserListComments
                .Include(c => c.User) 
                .Include(c => c.Votes) 
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == commentId);

            if (comment == null)
            {
                throw new KeyNotFoundException(AppText.Get("comments.notFound"));
            }

            await CheckListVisibility(comment.UserListId, currentUserId);

            var upvotes = comment.Votes.Count(v => v.Value == 1);
            var downvotes = comment.Votes.Count(v => v.Value == -1);
            var currentUserVote = comment.Votes.FirstOrDefault(v => v.UserId == currentUserId)?.Value ?? 0;

            var dto = MapToCommentDto(comment, comment.User, upvotes, downvotes, currentUserVote, currentUserId);
            await _userDtoEnricher.EnrichAsync(CollectOwners(new[] { dto }), currentUserId);
            return dto;
        }

        /// <summary>
        /// Yorum agacindaki tum sahipleri (yanitlarin yanitlari dahil) duzlestirir.
        /// Enricher tek batch calissin diye; agac basina iki sorgu yeter.
        /// </summary>
        private static IEnumerable<UserDto?> CollectOwners(IEnumerable<UserListCommentDto> dtos)
        {
            foreach (var dto in dtos)
            {
                yield return dto.Owner;
                foreach (var nested in CollectOwners(dto.Replies))
                {
                    yield return nested;
                }
            }
        }

        private UserListCommentDto MapToCommentDto(UserListComment comment, User user, int up, int down, int vote, int? currentUserId)
        {
            var dto = new UserListCommentDto
            {
                Id = comment.Id,
                Content = comment.Content,
                CreatedAt = comment.CreatedAt,
                UpdatedAt = comment.UpdatedAt,
                ListId = comment.UserListId,
                ParentCommentId = comment.ParentCommentId,
                Owner = new UserDto
                {
                    Id = user.Id,
                    Username = user.Username,
                    ProfileImageUrl = user.ProfileImageUrl,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                },
                Upvotes = up,
                Downvotes = down,
                CurrentUserVote = vote,
                Replies = new List<UserListCommentDto>()
            };
            if (comment.Replies != null && comment.Replies.Any())
            {
                dto.Replies = comment.Replies
                    .OrderByDescending(r => r.CreatedAt)
                    .Select(reply =>
                    {
                        var replyUpvotes = reply.Votes?.Count(v => v.Value == 1) ?? 0;
                        var replyDownvotes = reply.Votes?.Count(v => v.Value == -1) ?? 0;
                        var replyUserVote = currentUserId.HasValue
                            ? reply.Votes?.FirstOrDefault(v => v.UserId == currentUserId.Value)?.Value ?? 0
                            : 0;
                        return MapToCommentDto(reply, reply.User, replyUpvotes, replyDownvotes, replyUserVote, currentUserId);
                    })
                    .ToList();
            }
            return dto;
        }
    }
}
