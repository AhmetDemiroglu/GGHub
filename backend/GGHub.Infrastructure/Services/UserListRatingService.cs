using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
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

        public UserListRatingService(GGHubDbContext context)
        {
            _context = context;
        }

        public async Task SubmitRatingAsync(int listId, int userId, UserListRatingForUpsertDto dto)
        {
            var list = await _context.UserLists.FindAsync(listId);

            if (list == null)
            {
                throw new KeyNotFoundException("Liste bulunamadı.");
            }

            if (list.UserId == userId)
            {
                throw new InvalidOperationException("Kendi listenizi puanlayamazsınız.");
            }

            if (list.Visibility == ListVisibilitySetting.Private)
            {
                throw new UnauthorizedAccessException("Bu listeyi görme (ve puanlama) yetkiniz yok.");
            }

            if (list.Visibility == ListVisibilitySetting.Followers)
            {
                var isFollowingOwner = await _context.Follows
                    .AnyAsync(f => f.FollowerId == userId && f.FolloweeId == list.UserId);

                if (!isFollowingOwner)
                {
                    throw new UnauthorizedAccessException("Bu listeyi sadece sahibinin takipçileri puanlayabilir.");
                }
            }

            var existingRating = await _context.UserListRatings
                .FirstOrDefaultAsync(r => r.UserListId == listId && r.UserId == userId);

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