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
        private readonly IGamificationService _gamificationService;
        public ReviewService(GGHubDbContext context, IGameService gameService, INotificationService notificationService, IGamificationService gamificationService)
        {
            _context = context;
            _gameService = gameService;
            _notificationService = notificationService;
            _gamificationService = gamificationService;
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
            await UpdateGameRatingStatisticsAsync(game.Id);

            await _gamificationService.AddXpAsync(userId, 25, "ReviewCreated");
            await _gamificationService.CheckAchievementsAsync(userId, "ReviewCreated");

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
                        Username = r.User.Username,
                        ProfileImageUrl = r.User.ProfileImageUrl
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

            var gameId = review.GameId;

            _context.Reviews.Remove(review);
            await _context.SaveChangesAsync();
            await UpdateGameRatingStatisticsAsync(gameId);

            await _gamificationService.AddXpAsync(userId, -25, "ReviewDeleted");

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
            await UpdateGameRatingStatisticsAsync(review.GameId);

            return new ReviewDto
            {
                Id = review.Id,
                Content = review.Content,
                Rating = review.Rating,
                CreatedAt = review.CreatedAt,
                User = new UserDto
                {
                    Id = review.User.Id,
                    Username = review.User.Username,
                    ProfileImageUrl = review.User.ProfileImageUrl
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
                var game = await _context.Games.AsNoTracking().FirstOrDefaultAsync(g => g.Id == review.GameId);

                if (game != null)
                {
                    var message = $"{voter.Username}, incelemene {(value == 1 ? "olumlu" : "olumsuz")} oy verdi.";
                    var gameIdentifier = !string.IsNullOrEmpty(game.Slug) ? game.Slug : game.RawgId.ToString();
                    var link = $"/games/{gameIdentifier}#review-{review.Id}";

                    await _notificationService.CreateNotificationAsync(review.UserId, message, NotificationType.Review, link);
                }
            }
        }
        public async Task<(double Average, int Count)> GetGameRatingSummaryAsync(int gameId)
        {
            var ratings = await _context.Reviews
                .Where(r => r.GameId == gameId)
                .Select(r => r.Rating)
                .ToListAsync();

            if (!ratings.Any()) return (0, 0);

            return (ratings.Average(), ratings.Count);
        }

        public async Task<ReviewDto?> GetUserReviewForGameAsync(int userId, int rawgGameId)
        {
            var game = await _context.Games.FirstOrDefaultAsync(g => g.RawgId == rawgGameId);
            if (game == null) return null;

            var review = await _context.Reviews
                .Include(r => r.User)
                .FirstOrDefaultAsync(r => r.UserId == userId && r.GameId == game.Id);

            if (review == null) return null;

            return new ReviewDto
            {
                Id = review.Id,
                Content = review.Content,
                Rating = review.Rating,
                CreatedAt = review.CreatedAt,
                User = new UserDto
                {
                    Id = review.User.Id,
                    Username = review.User.Username,
                    ProfileImageUrl = review.User.ProfileImageUrl
                }
            };
        }

        public async Task<IEnumerable<ReviewDto>> GetReviewsForGameAsync(int rawgGameId, int? userId = null)
        {
            var gameInDb = await _context.Games.FirstOrDefaultAsync(g => g.RawgId == rawgGameId);

            if (gameInDb == null)
            {
                return Enumerable.Empty<ReviewDto>();
            }

            var reviews = await _context.Reviews
                .Where(r => r.GameId == gameInDb.Id)
                .Include(r => r.User)
                .Include(r => r.ReviewVotes)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new ReviewDto
                {
                    Id = r.Id,
                    Content = r.Content,
                    Rating = r.Rating,
                    CreatedAt = r.CreatedAt,
                    VoteScore = r.ReviewVotes.Sum(v => v.Value),
                    CurrentUserVote = userId.HasValue
                        ? r.ReviewVotes.Where(v => v.UserId == userId).Select(v => (int?)v.Value).FirstOrDefault()
                        : null,
                    User = new UserDto
                    {
                        Id = r.User.Id,
                        Username = r.User.Username,
                        ProfileImageUrl = r.User.ProfileImageUrl
                    }
                })
                .ToListAsync();

            return reviews;
        }

        public async Task<IEnumerable<ReviewDto>> GetReviewsByUserAsync(string username, int? currentUserId = null)
        {
            var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (targetUser == null) return Enumerable.Empty<ReviewDto>();

            var reviews = await _context.Reviews
                .AsNoTracking()
                .Where(r => r.UserId == targetUser.Id)
                .Include(r => r.Game) 
                .Include(r => r.User) 
                .Include(r => r.ReviewVotes)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new ReviewDto
                {
                    Id = r.Id,
                    Content = r.Content,
                    Rating = r.Rating,
                    CreatedAt = r.CreatedAt,
                    VoteScore = r.ReviewVotes.Sum(v => v.Value),
                    CurrentUserVote = currentUserId.HasValue
                        ? r.ReviewVotes.Where(v => v.UserId == currentUserId).Select(v => (int?)v.Value).FirstOrDefault()
                        : null,
                    User = new UserDto
                    {
                        Id = r.User.Id,
                        Username = r.User.Username,
                        ProfileImageUrl = r.User.ProfileImageUrl
                    },
                    Game = new GameSummaryDto
                    {
                        Id = r.Game.Id,
                        RawgId = r.Game.RawgId,
                        Name = r.Game.Name,
                        Slug = r.Game.Slug,
                        CoverImage = r.Game.CoverImage,
                        BackgroundImage = r.Game.BackgroundImage,
                        Released = r.Game.Released
                    }
                })
                .ToListAsync();

            return reviews;
        }

        private async Task UpdateGameRatingStatisticsAsync(int gameId)
        {
            var stats = await _context.Reviews
                .Where(r => r.GameId == gameId)
                .GroupBy(r => r.GameId)
                .Select(g => new
                {
                    Average = g.Average(r => r.Rating),
                    Count = g.Count()
                })
                .FirstOrDefaultAsync();

            var game = await _context.Games.FindAsync(gameId);
            if (game != null)
            {
                game.AverageRating = stats?.Average ?? 0;
                game.RatingCount = stats?.Count ?? 0;

                _context.Entry(game).Property(x => x.AverageRating).IsModified = true;
                _context.Entry(game).Property(x => x.RatingCount).IsModified = true;

                await _context.SaveChangesAsync();
            }
        }
    }
}