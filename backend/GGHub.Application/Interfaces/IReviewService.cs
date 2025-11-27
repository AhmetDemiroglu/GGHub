using GGHub.Application.Dtos;
using GGHub.Core.Entities;

namespace GGHub.Application.Interfaces
{
    public interface IReviewService
    {
        Task<Review> CreateReviewAsync(ReviewForCreationDto reviewDto, int userId);
        Task<IEnumerable<ReviewDto>> GetReviewsForGameAsync(int rawgGameId);
        Task<bool> DeleteReviewAsync(int reviewId, int userId);
        Task<ReviewDto?> UpdateReviewAsync(int reviewId, int userId, ReviewForUpdateDto reviewDto);
        Task VoteOnReviewAsync(int reviewId, int userId, int value);
        Task<(double Average, int Count)> GetGameRatingSummaryAsync(int gameId);
        Task<ReviewDto?> GetUserReviewForGameAsync(int userId, int rawgGameId);
        Task<IEnumerable<ReviewDto>> GetReviewsForGameAsync(int rawgGameId, int? userId = null);
    }
}