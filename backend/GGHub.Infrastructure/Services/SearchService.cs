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
        public SearchService(GGHubDbContext context) { _context = context; }

        public async Task<IEnumerable<SearchResultDto>> SearchAsync(string query)
        {
            var games = await _context.Games
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

            return games.Concat(users);
        }
    }
}