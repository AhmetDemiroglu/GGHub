using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;
using GGHub.Application.Interfaces;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Globalization;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// DB-merkezli discover servisi. RAWG live API kullanmaz; tüm veri local Games tablosundan gelir.
    /// Default (filtresiz) modda kalite skoru + haftalık rotasyon uygular.
    /// Filtreli modda deterministik, sayfalanabilir sonuçlar döner.
    /// </summary>
    public class DiscoverService : IDiscoverService
    {
        private readonly GGHubDbContext _context;
        private readonly IMemoryCache _cache;

        // Default feed için minimum kalite eşikleri.
        // Bu değerlerden EN AZ BİRİ sağlanmalı.
        private const double DEFAULT_MIN_RATING = 3.0;
        private const int DEFAULT_MIN_METACRITIC = 60;
        private const int DEFAULT_MIN_ADDED = 500;

        // Haftalık rotasyon için asal sayı çarpanı.
        // Her hafta farklı bir offset üretir; aynı hafta içinde sonuçlar kararlı kalır.
        private const int ROTATION_MODULUS = 97;

        // Genre numeric RAWG ID → slug eşlemesi (web numeric ID gönderir, DB slug saklar)
        // internal: RawgGameService de bu tabloyu kullanır
        internal static readonly IReadOnlyDictionary<string, string> GenreIdToSlug =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["4"]  = "action",
                ["51"] = "indie",
                ["3"]  = "adventure",
                ["5"]  = "role-playing-games-rpg",
                ["10"] = "strategy",
                ["2"]  = "shooter",
                ["7"]  = "puzzle",
                ["11"] = "arcade",
                ["83"] = "platformer",
                ["1"]  = "racing",
                ["59"] = "massively-multiplayer",
                ["15"] = "sports",
                ["6"]  = "fighting",
                ["14"] = "simulation",
            };

        // Platform numeric RAWG ID → slug eşlemesi
        // internal: RawgGameService de bu tabloyu kullanır
        internal static readonly IReadOnlyDictionary<string, string> PlatformIdToSlug =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["4"]   = "pc",
                ["187"] = "playstation5",
                ["18"]  = "playstation4",
                ["186"] = "xbox-series-x",
                ["1"]   = "xbox-one",
                ["7"]   = "nintendo-switch",
                ["3"]   = "ios",
                ["21"]  = "android",
                ["5"]   = "macos",
                ["6"]   = "linux",
            };

        public DiscoverService(GGHubDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<PaginatedResult<GameDto>> DiscoverAsync(DiscoverQueryParams q, int? userId = null)
        {
            var query = BuildBaseQuery(q);

            int totalCount = await query.CountAsync();

            var ordered = ApplyOrdering(query, q);

            var games = await ordered
                .Skip((q.Page - 1) * q.PageSize)
                .Take(q.PageSize)
                .Select(g => new
                {
                    g.Id,
                    g.RawgId,
                    g.Slug,
                    g.Name,
                    g.Released,
                    g.BackgroundImage,
                    g.Rating,
                    g.Metacritic,
                    g.AverageRating,
                    g.RatingCount,
                    g.GenresJson,
                    g.PlatformsJson,
                })
                .ToListAsync();

            var wishlistSet = await GetWishlistSetAsync(userId);

            var items = games.Select(g => new GameDto
            {
                Id = g.Id,
                RawgId = g.RawgId,
                Slug = g.Slug,
                Name = g.Name,
                Released = g.Released,
                BackgroundImage = g.BackgroundImage,
                Rating = g.Rating,
                Metacritic = g.Metacritic,
                GghubRating = g.AverageRating,
                GghubRatingCount = g.RatingCount,
                IsInWishlist = wishlistSet.Contains(g.RawgId),
                Platforms = DeserializePlatforms(g.PlatformsJson),
                Genres = DeserializeGenres(g.GenresJson),
            }).ToList();

            return new PaginatedResult<GameDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = q.Page,
                PageSize = q.PageSize,
            };
        }

        // ------------------------------------------------------------------ //
        //  Query builder                                                       //
        // ------------------------------------------------------------------ //

        private IQueryable<GGHub.Core.Entities.Game> BuildBaseQuery(DiscoverQueryParams q)
        {
            var query = _context.Games.AsNoTracking();

            // Görüntü olmayan oyunları her zaman dışla (kart gösterimi için zorunlu)
            query = query.Where(g => g.BackgroundImage != null);

            bool hasActiveFilters =
                !string.IsNullOrWhiteSpace(q.Search)
                || !string.IsNullOrWhiteSpace(q.Genres)
                || !string.IsNullOrWhiteSpace(q.Platforms)
                || !string.IsNullOrWhiteSpace(q.Dates);

            if (!hasActiveFilters)
            {
                // Filtresiz default feed: minimum kalite eşiğini uygula.
                // Metacritic, RAWG rating veya popülerlik sinyallerinden biri yeterli.
                query = query.Where(g =>
                    (g.Metacritic != null && g.Metacritic >= DEFAULT_MIN_METACRITIC)
                    || (g.Rating != null && g.Rating >= DEFAULT_MIN_RATING)
                    || (g.RawgAdded != null && g.RawgAdded >= DEFAULT_MIN_ADDED));
            }

            if (!string.IsNullOrWhiteSpace(q.Search))
            {
                // Büyük/küçük harf duyarsız arama (PostgreSQL ILike)
                query = query.Where(g => EF.Functions.ILike(g.Name, $"%{q.Search}%"));
            }

            if (!string.IsNullOrWhiteSpace(q.Genres))
            {
                var slug = NormalizeToSlug(q.Genres.Trim(), GenreIdToSlug);
                if (!string.IsNullOrEmpty(slug))
                {
                    // GenresJson formatı: [{"Name":"Action","Slug":"action"},...]
                    query = query.Where(g =>
                        g.GenresJson != null
                        && EF.Functions.Like(g.GenresJson, $"%\"Slug\":\"{slug}\"%"));
                }
            }

            if (!string.IsNullOrWhiteSpace(q.Platforms))
            {
                var slug = NormalizeToSlug(q.Platforms.Trim(), PlatformIdToSlug);
                if (!string.IsNullOrEmpty(slug))
                {
                    // PlatformsJson formatı: [{"Name":"PC","Slug":"pc"},...]
                    query = query.Where(g =>
                        g.PlatformsJson != null
                        && EF.Functions.Like(g.PlatformsJson, $"%\"Slug\":\"{slug}\"%"));
                }
            }

            if (!string.IsNullOrWhiteSpace(q.Dates))
            {
                var parts = q.Dates.Split(',');
                if (parts.Length == 2)
                {
                    var start = parts[0].Trim();
                    var end = parts[1].Trim();
                    // Released "yyyy-MM-dd" formatındaki string; ISO formatı string karşılaştırması ile doğru çalışır
                    if (!string.IsNullOrEmpty(start))
                        query = query.Where(g => g.Released != null && string.Compare(g.Released, start) >= 0);
                    if (!string.IsNullOrEmpty(end))
                        query = query.Where(g => g.Released != null && string.Compare(g.Released, end) <= 0);
                }
            }

            return query;
        }

        // ------------------------------------------------------------------ //
        //  Ordering                                                            //
        // ------------------------------------------------------------------ //

        private IOrderedQueryable<GGHub.Core.Entities.Game> ApplyOrdering(
            IQueryable<GGHub.Core.Entities.Game> query,
            DiscoverQueryParams q)
        {
            return q.Ordering switch
            {
                "-metacritic" => query
                    .OrderByDescending(g => g.Metacritic ?? 0)
                    .ThenByDescending(g => g.Rating ?? 0),

                "-released" => query
                    .OrderByDescending(g => g.Released ?? "0000-00-00")
                    .ThenByDescending(g => g.Rating ?? 0),

                "-added" => query
                    .OrderByDescending(g => g.RawgAdded ?? 0)
                    .ThenByDescending(g => g.Rating ?? 0),

                "-rating" => query
                    .OrderByDescending(g => g.Rating ?? 0)
                    .ThenByDescending(g => g.RawgAdded ?? 0),

                "name" => query
                    .OrderBy(g => g.Name)
                    .ThenByDescending(g => g.Rating ?? 0),

                "-name" => query
                    .OrderByDescending(g => g.Name)
                    .ThenByDescending(g => g.Rating ?? 0),

                // "relevance", null, "" → default kalite + haftalık rotasyon
                _ => ApplyDefaultOrdering(query),
            };
        }

        private IOrderedQueryable<GGHub.Core.Entities.Game> ApplyDefaultOrdering(
            IQueryable<GGHub.Core.Entities.Game> query)
        {
            // Haftalık rotasyon seed'i: ISO hafta numarası.
            // Aynı hafta boyunca sayfalama kararlıdır; haftadan haftaya üst sıralama değişir.
            int weekSeed = ISOWeek.GetWeekOfYear(DateTime.UtcNow);

            // Önce Metacritic, sonra Rating, sonra haftalık rotasyon nudge'ı, son olarak popülerlik.
            // EF Core'un güvenle çevirebileceği basit ?? ve % operatörleri kullanılır.
            return query
                .OrderByDescending(g => g.Metacritic ?? 0)
                .ThenByDescending(g => g.Rating ?? 0)
                .ThenByDescending(g => (g.Id + weekSeed) % ROTATION_MODULUS)
                .ThenByDescending(g => g.RawgAdded ?? 0);
        }

        // ------------------------------------------------------------------ //
        //  Helpers                                                             //
        // ------------------------------------------------------------------ //

        /// <summary>
        /// Numeric RAWG ID ise slug eşlemesi yap; slug ise doğrudan kullan.
        /// Bilinmeyen numeric ID → boş string döner (filtre uygulanmaz).
        /// </summary>
        private static string NormalizeToSlug(
            string value,
            IReadOnlyDictionary<string, string> idToSlug)
        {
            if (int.TryParse(value, out _))
                return idToSlug.TryGetValue(value, out var mapped) ? mapped : string.Empty;
            return value;
        }

        private async Task<HashSet<int>> GetWishlistSetAsync(int? userId)
        {
            if (!userId.HasValue) return new HashSet<int>();

            var rawgIds = await _context.UserLists
                .Where(l => l.UserId == userId && l.Type == UserListType.Wishlist)
                .SelectMany(l => l.UserListGames)
                .Select(ulg => ulg.Game.RawgId)
                .ToListAsync();

            return new HashSet<int>(rawgIds);
        }

        private static List<PlatformDto> DeserializePlatforms(string? json)
        {
            if (string.IsNullOrEmpty(json)) return new List<PlatformDto>();
            try
            {
                return System.Text.Json.JsonSerializer.Deserialize<List<PlatformDto>>(json)
                    ?? new List<PlatformDto>();
            }
            catch
            {
                return new List<PlatformDto>();
            }
        }

        private static List<GenreDto> DeserializeGenres(string? json)
        {
            if (string.IsNullOrEmpty(json)) return new List<GenreDto>();
            try
            {
                return System.Text.Json.JsonSerializer.Deserialize<List<GenreDto>>(json)
                    ?? new List<GenreDto>();
            }
            catch
            {
                return new List<GenreDto>();
            }
        }
    }
}
