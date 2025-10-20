using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
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

        public async Task<IEnumerable<SearchResultDto>> SearchAsync(string query)
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

            if (localGames.Count < 5)  // 5'ten 3'e düşürdük
            {
                var rawgResults = await _gameService.GetGamesAsync(new GameQueryParams
                {
                    Search = query,
                    Page = 1,
                    PageSize = 5,
                });

                var rawgGames = rawgResults.Items
                    .Where(g => !localGames.Any(lg => lg.Id == g.Slug))
                    .Take(5 - localGames.Count)  // 5'ten 3'e düşürdük
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

            var users = await _context.Users
                .Where(u => u.Username.ToLower().Contains(query.ToLower()))
                .Take(5)
                .Select(u => new SearchResultDto
                {
                    Type = "Kullanıcı",
                    Id = u.Username,
                    Title = u.Username,
                    ImageUrl = u.ProfileImageUrl,
                    Link = $"/profiles/{u.Username}"
                }).ToListAsync();

            return localGames.Concat(users);
        }
    }
}