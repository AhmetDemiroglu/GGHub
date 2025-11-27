using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GGHub.Infrastructure.Services
{
    public class AnalyticsService : IAnalyticsService
    {
        private readonly GGHubDbContext _context;

        public AnalyticsService(GGHubDbContext context)
        {
            _context = context;
        }
        public async Task<IEnumerable<TopUserDto>> GetMostFollowedUsersAsync(int count = 5)
        {
            var users = await _context.Users
                .AsNoTracking()
                .Where(u => !u.IsDeleted)
                .OrderByDescending(u => u.Followers.Count())
                .Take(count)
                .Select(u => new TopUserDto
                {
                    UserId = u.Id,
                    Username = u.Username,
                    ProfileImageUrl = u.ProfileImageUrl,
                    FollowerCount = u.Followers.Count()
                })
                .ToListAsync();

            return users;
        }
        public async Task<IEnumerable<TopListDto>> GetMostPopularListsAsync(int count = 5)
        {
            var lists = await _context.UserLists
                .AsNoTracking()
                .Include(l => l.User)
                .Where(l => !l.User.IsDeleted)
                .OrderByDescending(l => l.AverageRating)
                .ThenByDescending(l => l.Followers.Count())
                .Take(count)
                .Select(l => new TopListDto
                {
                    ListId = l.Id,
                    ListName = l.Name,
                    OwnerUsername = l.User.Username,
                    FollowerCount = l.Followers.Count(),
                    AverageRating = l.AverageRating, 
                    RatingCount = l.RatingCount      
                })
                .AsSplitQuery()
                .ToListAsync();

            return lists;
        }
        public async Task<IEnumerable<TopGameDto>> GetHighestRatedGamesAsync(int count = 5)
        {
            var gameRatings = _context.Reviews
                .AsNoTracking()
                .Include(r => r.User)
                .Where(r => !r.User.IsDeleted)
                .GroupBy(r => r.GameId)
                .Select(g => new
                {
                    GameId = g.Key,
                    AverageRating = g.Average(r => r.Rating),
                    ReviewCount = g.Count()
                })
                .OrderByDescending(g => g.AverageRating)
                .ThenByDescending(g => g.ReviewCount)
                .Take(count);

            var topGames = await gameRatings
                .Join(
                    _context.Games.AsNoTracking(),
                    agg => agg.GameId, 
                    game => game.Id,  
                    (agg, game) => new TopGameDto 
                    {
                        GameId = game.Id,
                        GameName = game.Name,
                        GameImageUrl = game.BackgroundImage, 
                        AverageRating = agg.AverageRating,
                        ReviewCount = agg.ReviewCount,
                        RawgId = game.RawgId,
                        Slug = game.Slug
                    }
                )
                .ToListAsync();

            return topGames;
        }
    }
}