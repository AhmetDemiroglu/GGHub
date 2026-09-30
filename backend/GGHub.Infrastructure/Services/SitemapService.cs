using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Sitemap listeleri. Her sayfa bir saat memory-cache'te kalir: Google/Bing sitemap'i
    /// gunde birkac kez ceker, Next tarafi da bir saat onbellekler; DB'ye pratikte saatte
    /// bir sorgu duser. Siralama Id'ye gore sabittir ki sayfalar arasinda kayma olmasin.
    /// </summary>
    public class SitemapService : ISitemapService
    {
        private const int MaxPageSize = 5000;
        private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(1);

        // Oyun kalite esigi DiscoverService'in varsayilan akisiyla AYNI: kesfette gosterdigimiz
        // oyunlari dizine sokariz, gostermedigimiz ince RAWG kayitlarini degil (tarama butcesi).
        private const double MinRating = 3.0;
        private const int MinMetacritic = 60;
        private const int MinAdded = 500;

        // Esigi gecen ~46 bin oyun x 2 dil = ~92 bin URL, her biri sunucuda cizilen sayfa. Botlarin tek
        // tam turu Vercel Hobby'nin aylik 4 CPU saatini tek basina bitiriyordu (30 Eyl 2026). Sitemap'e
        // yalniz en degerli 10 bin oyun girer; geri kalanlar sayfa ici linklerle yine bulunabilir.
        private const int MaxGames = 10000;

        private readonly GGHubDbContext _context;
        private readonly IMemoryCache _cache;

        public SitemapService(GGHubDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        public Task<PaginatedResult<SitemapEntryDto>> GetGamesAsync(int page, int pageSize)
        {
            var query = _context.Games.AsNoTracking()
                .Where(g => g.BackgroundImage != null && g.Slug != "")
                .Where(g =>
                    (g.Metacritic != null && g.Metacritic >= MinMetacritic)
                    || (g.Rating != null && g.Rating >= MinRating)
                    || (g.RawgAdded != null && g.RawgAdded >= MinAdded)
                    || g.ImportSource == "steam"
                    || g.TrendScore > 0)
                // Deger sirasi: gundemdeki oyunlar (HypeScore), Metacritic'li oyunlar, sonra RAWG'da en cok
                // eklenenler. Secilen dilim sayfalama icin Id'ye gore siralanir (sayfalar arasi kayma olmasin).
                .OrderByDescending(g => g.HypeScore > 0)
                .ThenByDescending(g => g.Metacritic != null)
                .ThenByDescending(g => g.RawgAdded ?? 0)
                .ThenBy(g => g.Id)
                .Take(MaxGames)
                .OrderBy(g => g.Id)
                .Select(g => new SitemapEntryDto { Key = g.Slug, LastModified = g.LastSyncedAt });

            return GetPageAsync("games", query, page, pageSize);
        }

        public Task<PaginatedResult<SitemapEntryDto>> GetListsAsync(int page, int pageSize)
        {
            var query = _context.UserLists.AsNoTracking()
                .Where(l => l.Visibility == ListVisibilitySetting.Public
                    && l.Type == UserListType.Custom
                    && l.UserListGames.Any()
                    && !l.User.IsDeleted
                    && !l.User.IsBanned)
                .OrderBy(l => l.Id)
                .Select(l => new SitemapEntryDto { Key = l.Id.ToString(), LastModified = l.UpdatedAt > l.CreatedAt ? l.UpdatedAt : l.CreatedAt });

            return GetPageAsync("lists", query, page, pageSize);
        }

        public Task<PaginatedResult<SitemapEntryDto>> GetProfilesAsync(int page, int pageSize)
        {
            // Icerigi olmayan profil ince sayfadir; en az bir inceleme ya da herkese acik liste
            // sahibi olan (ya da AI bot) kullanicilar dizine onerilir.
            var query = _context.Users.AsNoTracking()
                .Where(u => !u.IsDeleted
                    && !u.IsBanned
                    && u.ProfileVisibility == ProfileVisibilitySetting.Public
                    && (u.IsAiAgent
                        || _context.Reviews.Any(r => r.UserId == u.Id)
                        || _context.UserLists.Any(l => l.UserId == u.Id && l.Visibility == ListVisibilitySetting.Public && l.Type == UserListType.Custom)))
                .OrderBy(u => u.Id)
                .Select(u => new SitemapEntryDto { Key = u.Username, LastModified = u.UpdatedAt > u.CreatedAt ? u.UpdatedAt : u.CreatedAt });

            return GetPageAsync("profiles", query, page, pageSize);
        }

        private async Task<PaginatedResult<SitemapEntryDto>> GetPageAsync(string kind, IQueryable<SitemapEntryDto> query, int page, int pageSize)
        {
            var safePage = Math.Max(1, page);
            var safePageSize = Math.Clamp(pageSize, 1, MaxPageSize);
            var cacheKey = $"sitemap:{kind}:{safePage}:{safePageSize}";

            if (_cache.TryGetValue(cacheKey, out PaginatedResult<SitemapEntryDto>? cached) && cached != null)
            {
                return cached;
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((safePage - 1) * safePageSize)
                .Take(safePageSize)
                .ToListAsync();

            var result = new PaginatedResult<SitemapEntryDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = safePage,
                PageSize = safePageSize,
            };

            _cache.Set(cacheKey, result, CacheDuration);
            return result;
        }
    }
}
