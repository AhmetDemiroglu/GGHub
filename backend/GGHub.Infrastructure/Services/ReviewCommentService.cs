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
    public class ReviewCommentService : IReviewCommentService
    {
        private readonly GGHubDbContext _context;
        private readonly IGamificationService _gamificationService;
        private readonly INotificationService _notificationService;
        private readonly IUserDtoEnricher _userDtoEnricher;
        private readonly IMentionService _mentionService;

        public ReviewCommentService(GGHubDbContext context, IGamificationService gamificationService, INotificationService notificationService, IUserDtoEnricher userDtoEnricher, IMentionService mentionService)
        {
            _context = context;
            _gamificationService = gamificationService;
            _notificationService = notificationService;
            _userDtoEnricher = userDtoEnricher;
            _mentionService = mentionService;
        }

        /// <summary>
        /// Incelemeye erisim kontrolu. Liste yorumlarindaki CheckListVisibility'nin
        /// profil/liste gorunurluk kapisi BILEREK tasinmadi: ReviewService.GetReviewsForGameAsync
        /// bugun incelemeleri yazarin ProfileVisibility'sinden bagimsiz donduruyor. Buraya
        /// gorunurluk kapisi koymak halihazirda gorunen incelemelerin yorumlarini yok ederdi;
        /// bu ayna degil, regresyon olurdu. Yalnizca varlik + cift yonlu engel kontrol edilir.
        /// </summary>
        private async Task CheckReviewAccess(int reviewId, int? userId)
        {
            var review = await _context.Reviews.AsNoTracking()
                .Where(r => r.Id == reviewId)
                .Select(r => new { r.Id, r.UserId })
                .FirstOrDefaultAsync();

            if (review == null) throw new KeyNotFoundException(AppText.Get("reviewComments.reviewNotFound"));

            if (!userId.HasValue) return;
            if (review.UserId == userId.Value) return;

            // Cift yonlu engel: taraflardan biri digerini engellediyse erisim yok.
            var isBlocked = await _context.UserBlocks.AnyAsync(b =>
                (b.BlockerId == userId.Value && b.BlockedId == review.UserId) ||
                (b.BlockerId == review.UserId && b.BlockedId == userId.Value));

            if (isBlocked)
                throw new UnauthorizedAccessException(AppText.Get("reviewComments.blocked"));
        }

        public async Task<ReviewCommentDto> CreateCommentAsync(int reviewId, int userId, ReviewCommentForCreationDto dto)
        {
            await CheckReviewAccess(reviewId, userId);

            if (dto.ParentCommentId.HasValue)
            {
                var parentCommentExists = await _context.ReviewComments
                    .AnyAsync(c => c.Id == dto.ParentCommentId.Value && c.ReviewId == reviewId);
                if (!parentCommentExists)
                    throw new InvalidOperationException(AppText.Get("reviewComments.parentNotFound"));
            }

            var user = await _context.Users.FindAsync(userId);

            var comment = new ReviewComment
            {
                Content = dto.Content,
                UserId = userId,
                ReviewId = reviewId,
                ParentCommentId = dto.ParentCommentId
            };

            await _context.ReviewComments.AddAsync(comment);
            await _context.SaveChangesAsync();

            await _gamificationService.AddXpAsync(userId, 5, "ReviewCommentCreated");

            // Bildirim (self haric): yanit -> ust yorum sahibine; kok yorum -> inceleme sahibine.
            // notifiedUserId: bu olay icin ZATEN bildirim alan kisi. Asagida bahis yayilimindan
            // elenir ki ust yorum sahibini etiketleyen bir yanit iki degil TEK bildirim uretsin.
            int? notifiedUserId = null;
            if (user != null)
            {
                if (dto.ParentCommentId.HasValue)
                {
                    var parentAuthorId = await _context.ReviewComments
                        .Where(c => c.Id == dto.ParentCommentId.Value)
                        .Select(c => c.UserId)
                        .FirstOrDefaultAsync();
                    if (parentAuthorId != 0 && parentAuthorId != userId)
                    {
                        await _notificationService.CreateNotificationAsync(
                            parentAuthorId,
                            NotificationType.ReviewCommentReply,
                            "social.commentReplyNotification",
                            link: $"/reviews/{reviewId}",
                            actorUserId: userId);
                        notifiedUserId = parentAuthorId;
                    }
                }
                else
                {
                    var reviewAuthorId = await _context.Reviews.AsNoTracking()
                        .Where(r => r.Id == reviewId)
                        .Select(r => r.UserId)
                        .FirstOrDefaultAsync();
                    if (reviewAuthorId != 0 && reviewAuthorId != userId)
                    {
                        await _notificationService.CreateNotificationAsync(
                            reviewAuthorId,
                            NotificationType.ReviewComment,
                            "social.reviewCommentNotification",
                            link: $"/reviews/{reviewId}",
                            actorUserId: userId);
                        notifiedUserId = reviewAuthorId;
                    }
                }

                await _mentionService.NotifyMentionsAsync(
                    userId,
                    dto.Content,
                    "social.mentionInCommentNotification",
                    $"/reviews/{reviewId}",
                    excludeUserIds: notifiedUserId.HasValue ? new[] { notifiedUserId.Value } : null);
            }

            var created = MapToCommentDto(comment, user, 0, 0, 0, userId);
            await _userDtoEnricher.EnrichAsync(created.Owner, userId);
            return created;
        }

        public async Task<bool> UpdateCommentAsync(int commentId, int userId, ReviewCommentForUpdateDto dto)
        {
            var comment = await _context.ReviewComments.FindAsync(commentId);
            if (comment == null) throw new KeyNotFoundException(AppText.Get("reviewComments.notFound"));
            if (comment.UserId != userId) throw new UnauthorizedAccessException(AppText.Get("reviewComments.editPermissionDenied"));

            comment.Content = dto.Content;
            comment.UpdatedAt = DateTime.UtcNow;
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> DeleteCommentAsync(int commentId, int userId)
        {
            var comment = await _context.ReviewComments.FindAsync(commentId);
            if (comment == null) throw new KeyNotFoundException(AppText.Get("reviewComments.notFound"));
            if (comment.UserId != userId) throw new UnauthorizedAccessException(AppText.Get("reviewComments.deletePermissionDenied"));

            // Replies Include edilmiyor; self-referencing FK Cascade oldugu icin yanitlari
            // Postgres siliyor (bkz. GGHubDbContext'teki ayrilma notu).
            _context.ReviewComments.Remove(comment);
            var success = await _context.SaveChangesAsync() > 0;

            if (success)
            {
                await _gamificationService.AddXpAsync(userId, -5, "ReviewCommentDeleted");
            }

            return success;
        }

        public async Task<PaginatedResult<ReviewCommentDto>> GetCommentsForReviewAsync(int reviewId, int? currentUserId, ListQueryParams query)
        {
            await CheckReviewAccess(reviewId, currentUserId);

            var queryable = _context.ReviewComments
                .Where(c => c.ReviewId == reviewId && c.ParentCommentId == null)
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

            return new PaginatedResult<ReviewCommentDto>
            {
                Items = dtos,
                TotalCount = totalCount,
                Page = query.Page,
                PageSize = query.PageSize
            };
        }

        public async Task<bool> VoteOnCommentAsync(int commentId, int userId, ReviewCommentVoteDto dto)
        {
            var comment = await _context.ReviewComments.FindAsync(commentId);
            if (comment == null) throw new KeyNotFoundException(AppText.Get("reviewComments.notFound"));

            await CheckReviewAccess(comment.ReviewId, userId);

            if (comment.UserId == userId)
                throw new InvalidOperationException(AppText.Get("reviewComments.cannotVoteOwnComment"));

            if (dto.Value == 0)
                throw new InvalidOperationException(AppText.Get("reviewComments.invalidVoteValue"));

            var existingVote = await _context.ReviewCommentVotes
                .FirstOrDefaultAsync(v => v.ReviewCommentId == commentId && v.UserId == userId);

            // Yalnizca upvote'a GECISTE bildir (yeni upvote ya da down->up). Unvote/downvote'ta bildirme.
            bool willUpvote = dto.Value == 1 && (existingVote == null || existingVote.Value != dto.Value);

            if (existingVote == null)
            {
                await _context.ReviewCommentVotes.AddAsync(new ReviewCommentVote
                {
                    UserId = userId,
                    ReviewCommentId = commentId,
                    Value = dto.Value
                });
            }
            else
            {
                if (existingVote.Value == dto.Value)
                {
                    _context.ReviewCommentVotes.Remove(existingVote);
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
                    NotificationType.ReviewCommentLike,
                    "social.commentLikeNotification",
                    link: $"/reviews/{comment.ReviewId}",
                    actorUserId: userId);
            }

            return success;
        }

        public async Task<ReviewCommentDto> GetCommentByIdAsync(int commentId, int currentUserId)
        {
            var comment = await _context.ReviewComments
                .Include(c => c.User)
                .Include(c => c.Votes)
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == commentId);

            if (comment == null)
            {
                throw new KeyNotFoundException(AppText.Get("reviewComments.notFound"));
            }

            await CheckReviewAccess(comment.ReviewId, currentUserId);

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
        private static IEnumerable<UserDto?> CollectOwners(IEnumerable<ReviewCommentDto> dtos)
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

        private ReviewCommentDto MapToCommentDto(ReviewComment comment, User user, int up, int down, int vote, int? currentUserId)
        {
            var dto = new ReviewCommentDto
            {
                Id = comment.Id,
                Content = comment.Content,
                CreatedAt = comment.CreatedAt,
                UpdatedAt = comment.UpdatedAt,
                ReviewId = comment.ReviewId,
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
                Replies = new List<ReviewCommentDto>()
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
