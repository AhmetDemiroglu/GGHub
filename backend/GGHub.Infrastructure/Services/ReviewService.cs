using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Services
{
    public class ReviewService : IReviewService
    {
        private readonly GGHubDbContext _context;
        private readonly IGameService _gameService;
        private readonly INotificationService _notificationService;
        public ReviewService(GGHubDbContext context, IGameService gameService, INotificationService notificationService)
        {
            _context = context;
            _gameService = gameService;
            _notificationService = notificationService;
        }

        public async Task<Review> CreateReviewAsync(ReviewForCreationDto reviewDto, int userId)
        {
            var game = await _gameService.GetOrCreateGameByRawgIdAsync(reviewDto.GameId);

            var existingReview = await _context.Reviews
                .FirstOrDefaultAsync(r => r.UserId == userId && r.GameId == game.Id);

            if (existingReview != null)
            {
                throw new InvalidOperationException("Bu oyuna zaten bir yorum yapmışsınız.");
            }

            var review = new Review
            {
                GameId = game.Id,
                UserId = userId,
                Rating = reviewDto.Rating,
                Content = reviewDto.Content,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _context.Reviews.AddAsync(review);
            await _context.SaveChangesAsync();

            return review;
        }
        public async Task<IEnumerable<ReviewDto>> GetReviewsForGameAsync(int rawgGameId)
        {
            var gameInDb = await _context.Games.FirstOrDefaultAsync(g => g.RawgId == rawgGameId);

            if (gameInDb == null)
            {
                return Enumerable.Empty<ReviewDto>();
            }

            var reviews = await _context.Reviews
                .Where(r => r.GameId == gameInDb.Id)
                .Include(r => r.User)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new ReviewDto
                {
                    Id = r.Id,
                    Content = r.Content,
                    Rating = r.Rating,
                    CreatedAt = r.CreatedAt,
                    User = new UserDto
                    {
                        Id = r.User.Id,
                        Username = r.User.Username
                    }
                })
                .ToListAsync();

            return reviews;
        }
        public async Task<bool> DeleteReviewAsync(int reviewId, int userId)
        {
            var review = await _context.Reviews.FirstOrDefaultAsync(r => r.Id == reviewId);

            if (review == null)
            {
                return false;
            }

            if (review.UserId != userId)
            {
                return false;
            }

            _context.Reviews.Remove(review);
            await _context.SaveChangesAsync();

            return true;
        }
        public async Task<ReviewDto?> UpdateReviewAsync(int reviewId, int userId, ReviewForUpdateDto reviewDto)
        {
            var review = await _context.Reviews
                .Include(r => r.User) 
                .FirstOrDefaultAsync(r => r.Id == reviewId);

            if (review == null)
            {
                return null; 
            }

            if (review.UserId != userId)
            {
                return null; 
            }

            review.Rating = reviewDto.Rating;
            review.Content = reviewDto.Content;
            review.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new ReviewDto
            {
                Id = review.Id,
                Content = review.Content,
                Rating = review.Rating,
                CreatedAt = review.CreatedAt,
                User = new UserDto
                {
                    Id = review.User.Id,
                    Username = review.User.Username
                }
            };
        }
        public async Task VoteOnReviewAsync(int reviewId, int userId, int value)
        {
            var review = await _context.Reviews.FindAsync(reviewId);
            if (review == null)
            {
                throw new KeyNotFoundException("Oylanacak yorum bulunamadı.");
            }

            if (review.UserId == userId)
            {
                throw new InvalidOperationException("Kendi yorumunuzu oylayamazsınız.");
            }

            var existingVote = await _context.ReviewVotes
                .FirstOrDefaultAsync(v => v.ReviewId == reviewId && v.UserId == userId);

            if (existingVote == null)
            {
                var newVote = new ReviewVote
                {
                    ReviewId = reviewId,
                    UserId = userId,
                    Value = value
                };
                await _context.ReviewVotes.AddAsync(newVote);
            }
            else
            {
                if (existingVote.Value == value)
                {
                    _context.ReviewVotes.Remove(existingVote);
                }
                else
                {
                    existingVote.Value = value;
                }
            }

            await _context.SaveChangesAsync();
            var voter = await _context.Users.FindAsync(userId);
            if (voter != null && review.UserId != userId) 
            {
                var message = $"{voter.Username}, yorumuna {(value == 1 ? "olumlu" : "olumsuz")} oy verdi.";
                await _notificationService.CreateNotificationAsync(review.UserId, message, NotificationType.Review, $"/reviews/{review.Id}");
            }
        }

    }
}