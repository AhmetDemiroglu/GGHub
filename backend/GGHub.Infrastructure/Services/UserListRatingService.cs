using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Localization;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace GGHub.Infrastructure.Services
{
    public class UserListRatingService : IUserListRatingService
    {
        private readonly GGHubDbContext _context;
        private readonly INotificationService _notificationService;

        public UserListRatingService(GGHubDbContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task SubmitRatingAsync(int listId, int userId, UserListRatingForUpsertDto dto)
        {
            var list = await _context.UserLists.FindAsync(listId);

            if (list == null)
            {
                throw new KeyNotFoundException(AppText.Get("lists.notFound"));
            }

            if (list.UserId == userId)
            {
                throw new InvalidOperationException(AppText.Get("ratings.cannotRateOwnList"));
            }

            if (list.Visibility == ListVisibilitySetting.Private)
            {
                throw new UnauthorizedAccessException(AppText.Get("ratings.viewPermissionDenied"));
            }

            if (list.Visibility == ListVisibilitySetting.Followers)
            {
                var isFollowingOwner = await _context.Follows
                    .AnyAsync(f => f.FollowerId == userId && f.FolloweeId == list.UserId);

                if (!isFollowingOwner)
                {
                    throw new UnauthorizedAccessException(AppText.Get("ratings.followersOnly"));
                }
            }

            var existingRating = await _context.UserListRatings
                .FirstOrDefaultAsync(r => r.UserListId == listId && r.UserId == userId);

            bool isNewRating = existingRating == null;

            if (existingRating == null)
            {
                var newRating = new UserListRating
                {
                    UserId = userId,
                    UserListId = listId,
                    Value = dto.Value,
                    SubmittedAt = DateTime.UtcNow
                };
                await _context.UserListRatings.AddAsync(newRating);
            }
            else
            {
                existingRating.Value = dto.Value;
                existingRating.SubmittedAt = DateTime.UtcNow;
            }

            var success = await _context.SaveChangesAsync() > 0;

            if (success)
            {
                await UpdateListDenormalizedRatings(listId);

                // Yalnizca YENI puanda liste sahibine bildir (self zaten yukarida engelli).
                if (isNewRating)
                {
                    var rater = await _context.Users.FindAsync(userId);
                    if (rater != null)
                    {
                        var msg = AppText.Get("social.listRatingNotification",
                            new Dictionary<string, object?> { ["username"] = rater.Username, ["listName"] = list.Name });
                        await _notificationService.CreateNotificationAsync(list.UserId, msg, NotificationType.ListRating, $"/lists/{listId}");
                    }
                }
            }
        }

        public async Task<int?> GetMyRatingForListAsync(int listId, int userId)
        {
            var rating = await _context.UserListRatings
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.UserListId == listId && r.UserId == userId);

            return rating?.Value;
        }
        private async Task UpdateListDenormalizedRatings(int listId)
        {
            var list = await _context.UserLists.FindAsync(listId);
            if (list == null) return;

            var ratings = _context.UserListRatings.Where(r => r.UserListId == listId);

            list.RatingCount = await ratings.CountAsync();

            if (list.RatingCount > 0)
            {
                list.AverageRating = await ratings.AverageAsync(r => r.Value);
            }
            else
            {
                list.AverageRating = 0;
            }

            await _context.SaveChangesAsync();
        }
    }
}
