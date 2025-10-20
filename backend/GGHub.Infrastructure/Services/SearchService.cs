using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GGHub.Infrastructure.Services
{
    public class SearchService : ISearchService
    {
        private readonly GGHubDbContext _context;
        private readonly IGameService _gameService;

        public SearchService(GGHubDbContext context, IGameService gameService)
        {
            _context = context;
            _gameService = gameService;
        }

        public async Task<IEnumerable<SearchResultDto>> SearchAsync(string query, int? currentUserId = null)
        {
            var localGames = await _context.Games
                .Where(g => g.Name.ToLower().Contains(query.ToLower()))
                .Take(5)
                .Select(g => new SearchResultDto
                {
                    Type = "Oyun",
                    Id = g.Slug,
                    Title = g.Name,
                    ImageUrl = g.CoverImage ?? g.BackgroundImage,
                    Link = $"/games/{g.Slug}"
                }).ToListAsync();

            if (localGames.Count < 5) 
            {
                var rawgResults = await _gameService.GetGamesAsync(new GameQueryParams
                {
                    Search = query,
                    Page = 1,
                    PageSize = 5,
                });

                var rawgGames = rawgResults.Items
                    .Where(g => !localGames.Any(lg => lg.Id == g.Slug))
                    .Take(5 - localGames.Count)  
                    .Select(g => new SearchResultDto
                    {
                        Type = "Oyun",
                        Id = g.Slug,
                        Title = g.Name,
                        ImageUrl = g.BackgroundImage,
                        Link = $"/games/{g.Slug}"
                    });

                localGames = localGames.Concat(rawgGames).ToList();
            }

            var allMatchingUsers = await _context.Users
                .Where(u => u.Username.ToLower().Contains(query.ToLower()) && !u.IsDeleted)
                .Include(u => u.Followers)  
                .ToListAsync();

                    var accessibleUsers = allMatchingUsers
                        .Where(u =>
                            u.ProfileVisibility == ProfileVisibilitySetting.Public ||
                            u.Id == currentUserId ||
                            (u.ProfileVisibility == ProfileVisibilitySetting.Followers &&
                             currentUserId != null &&
                             u.Followers.Any(f => f.FollowerId == currentUserId))
                        )
                        .Take(5)
                        .Select(u => new SearchResultDto
                        {
                            Type = "Kullanıcı",
                            Id = u.Username,
                            Title = u.Username,
                            ImageUrl = u.ProfileImageUrl,
                            Link = $"/profiles/{u.Username}"
                        })
                        .ToList();

                    return localGames.Concat(accessibleUsers);
        }
    }
}