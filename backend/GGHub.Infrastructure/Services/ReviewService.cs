using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Core.Specifications;
using GGHub.Infrastructure.Localization;
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
        private readonly IUserDtoEnricher _userDtoEnricher;
        private readonly IMentionService _mentionService;
        public ReviewService(GGHubDbContext context, IGameService gameService, INotificationService notificationService, IGamificationService gamificationService, IUserDtoEnricher userDtoEnricher, IMentionService mentionService)
        {
            _context = context;
            _gameService = gameService;
            _notificationService = notificationService;
            _gamificationService = gamificationService;
            _userDtoEnricher = userDtoEnricher;
            _mentionService = mentionService;
        }

        public async Task<Review> CreateReviewAsync(ReviewForCreationDto reviewDto, int userId)
        {
            var game = await _gameService.GetOrCreateGameByRawgIdAsync(reviewDto.GameId);

            var existingReview = await _context.Reviews
                .FirstOrDefaultAsync(r => r.UserId == userId && r.GameId == game.Id);

            if (existingReview != null)
            {
                throw new InvalidOperationException(AppText.Get("reviews.alreadyReviewed"));
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

            // Inceleme kaydedildikten SONRA bahis bildirimi; best-effort, hata olsa da inceleme durur.
            await _mentionService.NotifyMentionsAsync(
                userId,
                review.Content,
                "social.mentionInReviewNotification",
                $"/reviews/{review.Id}");

            return review;
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

            // Bahis farki icin ESKI metin, uzerine yazilmadan once yakalanir.
            var oldContent = review.Content;

            review.Rating = reviewDto.Rating;
            review.Content = reviewDto.Content;
            review.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await UpdateGameRatingStatisticsAsync(review.GameId);

            // Yalnizca YENI eklenen bahisler bildirilir; duzenleme eskileri tekrar bildirmez.
            await _mentionService.NotifyNewMentionsAsync(
                userId,
                oldContent,
                review.Content,
                "social.mentionInReviewNotification",
                $"/reviews/{review.Id}");

            var dto = new ReviewDto
            {
                Id = review.Id,
                Content = review.Content,
                Rating = review.Rating,
                CreatedAt = review.CreatedAt,
                User = new UserDto
                {
                    Id = review.User.Id,
                    Username = review.User.Username,
                    ProfileImageUrl = review.User.ProfileImageUrl,
                    FirstName = review.User.FirstName,
                    LastName = review.User.LastName
                }
            };

            await _userDtoEnricher.EnrichAsync(dto.User, userId);
            return dto;
        }
        public async Task VoteOnReviewAsync(int reviewId, int userId, int value)
        {
            var review = await _context.Reviews.FindAsync(reviewId);
            if (review == null)
            {
                throw new KeyNotFoundException(AppText.Get("reviews.reviewNotFoundForVote"));
            }

            if (review.UserId == userId)
            {
                throw new InvalidOperationException(AppText.Get("reviews.cannotVoteOwnReview"));
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
            // Oy veren kullanici artik yalnizca aktor ID'si olarak geciliyor; adini almak icin
            // ayrica cekmeye gerek yok (bildirim metni okuma aninda aktorden cozuluyor).
            if (review.UserId != userId)
            {
                // Kalici inceleme baglantisi. Onceki bicim ("/games/{slug}#review-{id}") mobilde
                // kaybediliyordu: derin baglanti eslemesi #fragment'i siliyor ve kullanici
                // incelemeye degil oyun sayfasinin basina dusuyordu. Oyun kaydini cekmeye de
                // gerek kalmadi.
                await _notificationService.CreateNotificationAsync(
                    review.UserId,
                    NotificationType.Review,
                    value == 1 ? "reviews.reviewVoteNotificationPositive" : "reviews.reviewVoteNotificationNegative",
                    link: $"/reviews/{review.Id}",
                    actorUserId: userId);
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

            var dto = new ReviewDto
            {
                Id = review.Id,
                Content = review.Content,
                Rating = review.Rating,
                CreatedAt = review.CreatedAt,
                User = new UserDto
                {
                    Id = review.User.Id,
                    Username = review.User.Username,
                    ProfileImageUrl = review.User.ProfileImageUrl,
                    FirstName = review.User.FirstName,
                    LastName = review.User.LastName
                }
            };

            await _userDtoEnricher.EnrichAsync(dto.User, userId);
            return dto;
        }

        public async Task<ReviewDto?> GetReviewByIdAsync(int reviewId, int? currentUserId)
        {
            var review = await _context.Reviews
                .AsNoTracking()
                .Where(r => r.Id == reviewId)
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
                        ProfileImageUrl = r.User.ProfileImageUrl,
                        FirstName = r.User.FirstName,
                        LastName = r.User.LastName
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
                .FirstOrDefaultAsync();

            if (review == null) return null;

            await _userDtoEnricher.EnrichAsync(review.User, currentUserId);
            return review;
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
                        ProfileImageUrl = r.User.ProfileImageUrl,
                        FirstName = r.User.FirstName,
                        LastName = r.User.LastName
                    }
                })
                .ToListAsync();

            await _userDtoEnricher.EnrichAsync(reviews.Select(r => r.User), userId);
            return reviews;
        }

        public async Task<IEnumerable<ReviewDto>> GetReviewsByUserAsync(string username, int? currentUserId = null)
        {
            var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.UsernameNormalized == UsernameNormalizer.Normalize(username));
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
                        ProfileImageUrl = r.User.ProfileImageUrl,
                        FirstName = r.User.FirstName,
                        LastName = r.User.LastName
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

            await _userDtoEnricher.EnrichAsync(reviews.Select(r => r.User), currentUserId);
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
