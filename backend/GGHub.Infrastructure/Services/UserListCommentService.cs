using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore; 

namespace GGHub.Infrastructure.Services
{
    public class UserListCommentService : IUserListCommentService
    {
        private readonly GGHubDbContext _context;

        public UserListCommentService(GGHubDbContext context)
        {
            _context = context;
        }
        private async Task CheckListVisibility(int listId, int? userId)
        {
            var list = await _context.UserLists.AsNoTracking().FirstOrDefaultAsync(l => l.Id == listId);
            if (list == null) throw new KeyNotFoundException("Liste bulunamadı.");

            if (!userId.HasValue)
            {
                if (list.Visibility != ListVisibilitySetting.Public)
                    throw new UnauthorizedAccessException("Bu listeyi görüntülemek için giriş yapmalısınız.");
                return;
            }

            if (list.UserId == userId.Value) return;

            if (list.Visibility == ListVisibilitySetting.Private)
                throw new UnauthorizedAccessException("Bu listeyi görme (ve yorum yapma) yetkiniz yok.");

            if (list.Visibility == ListVisibilitySetting.Followers)
            {
                var isFollowingOwner = await _context.Follows
                    .AnyAsync(f => f.FollowerId == userId.Value && f.FolloweeId == list.UserId);
                if (!isFollowingOwner)
                    throw new UnauthorizedAccessException("Bu listeyi sadece sahibinin takipçileri görebilir.");
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
                    throw new InvalidOperationException("Cevap yazılmak istenen ana yorum bulunamadı.");
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

            return MapToCommentDto(comment, user, 0, 0, 0, userId);
        }

        public async Task<bool> UpdateCommentAsync(int commentId, int userId, UserListCommentForUpdateDto dto)
        {
            var comment = await _context.UserListComments.FindAsync(commentId);
            if (comment == null) throw new KeyNotFoundException("Yorum bulunamadı.");
            if (comment.UserId != userId) throw new UnauthorizedAccessException("Bu yorumu düzenleme yetkiniz yok.");

            comment.Content = dto.Content;
            comment.UpdatedAt = DateTime.UtcNow;
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> DeleteCommentAsync(int commentId, int userId)
        {
            var comment = await _context.UserListComments.FindAsync(commentId);
            if (comment == null) throw new KeyNotFoundException("Yorum bulunamadı.");
            if (comment.UserId != userId) throw new UnauthorizedAccessException("Bu yorumu silme yetkiniz yok.");

            _context.UserListComments.Remove(comment);
            return await _context.SaveChangesAsync() > 0;
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
            if (comment == null) throw new KeyNotFoundException("Yorum bulunamadı.");

            await CheckListVisibility(comment.UserListId, userId);

            if (comment.UserId == userId)
                throw new InvalidOperationException("Kendi yorumunuzu oylayamazsınız.");

            if (dto.Value == 0) 
                throw new InvalidOperationException("Oy değeri 1 veya -1 olmalıdır.");

            var existingVote = await _context.UserListCommentVotes
                .FirstOrDefaultAsync(v => v.UserListCommentId == commentId && v.UserId == userId);

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

            return await _context.SaveChangesAsync() > 0;
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
                throw new KeyNotFoundException("Yorum bulunamadı.");
            }

            await CheckListVisibility(comment.UserListId, currentUserId);

            var upvotes = comment.Votes.Count(v => v.Value == 1);
            var downvotes = comment.Votes.Count(v => v.Value == -1);
            var currentUserVote = comment.Votes.FirstOrDefault(v => v.UserId == currentUserId)?.Value ?? 0;

            return MapToCommentDto(comment, comment.User, upvotes, downvotes, currentUserVote, currentUserId);
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