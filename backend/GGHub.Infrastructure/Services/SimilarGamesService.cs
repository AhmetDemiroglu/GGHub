using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Benzer oyunlar: aday toplama (SQL) + skorlama (SimilarGameScorer, bellek).
    ///
    /// Eski surum yalnizca "ilk tur ortak + en yuksek puan" idi ve elde tur/platformdan baska
    /// veri yoktu. Simdi katalogda etiketler (GameTags), IGDB'nin kendi benzer listesi,
    /// gelistirici ve kullanici hareketi var; her biri ayri bir aday havuzu acar, hepsi tek
    /// skorlayicidan gecer. Dis servise gidilmez; RAWG dusse de bu uc ayakta kalir.
    /// </summary>
    public class SimilarGamesService : ISimilarGamesService
    {
        private const int ResultCount = 12;
        private static readonly TimeSpan ResultTtl = TimeSpan.FromHours(6);
        private static readonly TimeSpan WeightsTtl = TimeSpan.FromHours(12);

        private readonly GGHubDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly ILogger<SimilarGamesService> _logger;

        public SimilarGamesService(GGHubDbContext context, IMemoryCache cache, ILogger<SimilarGamesService> logger)
        {
            _context = context;
            _cache = cache;
            _logger = logger;
        }

        public async Task<List<GameDto>> GetSimilarGamesAsync(int rawgGameId)
        {
            var cacheKey = $"similar-games:v2:{rawgGameId}";
            if (_cache.TryGetValue(cacheKey, out List<GameDto>? cached) && cached != null)
                return cached;

            var source = (await LoadProfilesAsync(_context.Games.AsNoTracking().Where(g => g.RawgId == rawgGameId))).FirstOrDefault();
            if (source == null) return new List<GameDto>();

            var weights = await GetTagWeightsAsync();
            var coEngaged = await LoadCoEngagementAsync(source.Id);
            var candidateIds = (await CollectCandidateIdsAsync(source, weights, coEngaged)).ToList();
            var candidates = await LoadProfilesAsync(_context.Games.AsNoTracking().Where(g => candidateIds.Contains(g.Id)));

            var ranked = SimilarGameScorer.Rank(source, candidates, weights, coEngaged, ResultCount);
            var result = ranked.Select(ToDto).ToList();

            _logger.LogDebug("[Similar] {Name}: {Candidates} aday, {Result} sonuc.", source.Name, candidates.Count, result.Count);
            _cache.Set(cacheKey, result, ResultTtl);
            return result;
        }

        // ------------------------------------------------------------------ aday havuzlari

        private IQueryable<Game> Eligible(int sourceId) =>
            _context.Games.AsNoTracking().Where(g => g.Id != sourceId && g.BackgroundImage != null);

        /// <summary>Genis havuzlar (tur, studyo, seri) icin kalite kapisi. Kanitli havuzlarda (IGDB, kullanici) uygulanmaz.</summary>
        private static IQueryable<Game> Quality(IQueryable<Game> q) =>
            q.Where(g => g.Metacritic >= 60 || g.Rating >= 3.5 || g.IgdbRating >= 70 || g.RawgAdded >= 500);

        private async Task<HashSet<int>> CollectCandidateIdsAsync(SimilarGameProfile source, TagWeights weights, Dictionary<int, int> coEngaged)
        {
            var ids = new HashSet<int>(coEngaged.Keys);

            if (source.IgdbSimilar.Count > 0)
            {
                var igdbIds = source.IgdbSimilar.ToList();
                ids.UnionWith(await Eligible(source.Id)
                    .Where(g => g.IgdbId != null && igdbIds.Contains(g.IgdbId.Value))
                    .Select(g => g.Id).ToListAsync());
            }

            // Kaynak oyunun en AYIRT EDICI 10 etiketi; bunlari tasiyan oyunlar, ortak etiket sayisina gore.
            var topTags = source.Tags
                .Where(t => weights.DocumentFrequency.GetValueOrDefault(t) >= 2)
                .OrderByDescending(weights.Of)
                .Take(10)
                .ToList();
            if (topTags.Count > 0)
            {
                ids.UnionWith(await _context.GameTags.AsNoTracking()
                    .Where(t => topTags.Contains(t.Slug) && t.GameId != source.Id && t.Game.BackgroundImage != null
                        && (t.Game.Metacritic >= 60 || t.Game.Rating >= 3.5 || t.Game.IgdbRating >= 70 || t.Game.RawgAdded >= 500))
                    .GroupBy(t => t.GameId)
                    .Select(g => new { GameId = g.Key, Hits = g.Count() })
                    .OrderByDescending(x => x.Hits)
                    .Take(400)
                    .Select(x => x.GameId).ToListAsync());
            }

            foreach (var (genre, take) in source.Genres.Take(2).Select((g, i) => (g, i == 0 ? 150 : 100)))
            {
                ids.UnionWith(await Quality(Eligible(source.Id))
                    .Where(g => g.GenresJson != null && EF.Functions.Like(g.GenresJson, $"%\"Slug\":\"{genre}\"%"))
                    .OrderByDescending(g => g.RawgAdded ?? 0)
                    .Take(take).Select(g => g.Id).ToListAsync());
            }

            foreach (var developer in source.Developers.Take(2))
            {
                ids.UnionWith(await Quality(Eligible(source.Id))
                    .Where(g => g.DevelopersJson != null && EF.Functions.Like(g.DevelopersJson, $"%\"Slug\":\"{developer}\"%"))
                    .OrderByDescending(g => g.RawgAdded ?? 0)
                    .Take(30).Select(g => g.Id).ToListAsync());
            }

            // Seri adaylari: basligin en uzun iki kelimesi (rakam ve gecis kelimeleri zaten atilmis).
            foreach (var token in source.TitleTokens.OrderByDescending(t => t.Length).Take(2))
            {
                ids.UnionWith(await Quality(Eligible(source.Id))
                    .Where(g => EF.Functions.ILike(g.Name, $"%{token}%"))
                    .OrderByDescending(g => g.RawgAdded ?? 0)
                    .Take(20).Select(g => g.Id).ToListAsync());
            }

            if (source.Genres.Count == 0 && source.Tags.Count == 0)
            {
                // Hicbir siniflandirma yok (cok yeni/eksik satir): son iki yilin populerleri.
                var startDate = DateTime.UtcNow.AddYears(-2).ToString("yyyy-MM-dd");
                ids.UnionWith(await Quality(Eligible(source.Id))
                    .Where(g => g.Released != null && string.Compare(g.Released, startDate) >= 0)
                    .OrderByDescending(g => g.RawgAdded ?? 0)
                    .Take(100).Select(g => g.Id).ToListAsync());
            }

            ids.Remove(source.Id);
            return ids;
        }

        /// <summary>
        /// Kaynak oyunla ilgilenen kullanicilar (listesine koyan veya inceleyen, bot degil) baska
        /// hangi oyunlarla ilgilendi: oyun -> ortak kullanici sayisi. Kucuk kitlede bile en
        /// dogru sinyal; buyudukce agirligi kendiliginden artar (log olcek, tavan 20).
        /// </summary>
        private async Task<Dictionary<int, int>> LoadCoEngagementAsync(int sourceId)
        {
            var listUsers = await _context.UserListGames.AsNoTracking()
                .Where(x => x.GameId == sourceId && !x.UserList.User.IsAiAgent)
                .Select(x => x.UserList.UserId).ToListAsync();
            var reviewUsers = await _context.Reviews.AsNoTracking()
                .Where(r => r.GameId == sourceId && !r.User.IsAiAgent)
                .Select(r => r.UserId).ToListAsync();

            var users = listUsers.Concat(reviewUsers).Distinct().Take(500).ToList();
            if (users.Count == 0) return new Dictionary<int, int>();

            var viaLists = await _context.UserListGames.AsNoTracking()
                .Where(x => x.GameId != sourceId && users.Contains(x.UserList.UserId))
                .Select(x => new { x.GameId, x.UserList.UserId }).Distinct().ToListAsync();
            var viaReviews = await _context.Reviews.AsNoTracking()
                .Where(r => r.GameId != sourceId && r.Rating >= 3 && users.Contains(r.UserId))
                .Select(r => new { r.GameId, r.UserId }).Distinct().ToListAsync();

            return viaLists.Concat(viaReviews)
                .GroupBy(x => x.GameId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.UserId).Distinct().Count());
        }

        // ------------------------------------------------------------------ agirliklar ve profiller

        private async Task<TagWeights> GetTagWeightsAsync()
        {
            const string key = "similar-games:tag-weights";
            if (_cache.TryGetValue(key, out TagWeights? cached) && cached != null) return cached;

            var taggedGames = await _context.Games.CountAsync(g => g.Tags.Any());
            var frequencies = await _context.GameTags.AsNoTracking()
                .GroupBy(t => t.Slug)
                .Select(g => new { Slug = g.Key, Count = g.Count() })
                .ToListAsync();

            // Klasik IDF: yaygin etiket ~1, yalnizca birkac oyunda gecen etiket ~8-10.
            var weights = new TagWeights
            {
                DocumentFrequency = frequencies.ToDictionary(f => f.Slug, f => f.Count, StringComparer.Ordinal),
                Weight = frequencies.ToDictionary(f => f.Slug, f => Math.Log((taggedGames + 1.0) / (f.Count + 1.0)) + 1.0, StringComparer.Ordinal),
            };

            _cache.Set(key, weights, WeightsTtl);
            return weights;
        }

        private async Task<List<SimilarGameProfile>> LoadProfilesAsync(IQueryable<Game> query)
        {
            var rows = await query.Select(g => new
            {
                g.Id, g.RawgId, g.Name, g.Slug, g.Released, g.BackgroundImage, g.Rating, g.Metacritic,
                g.AverageRating, g.RatingCount, g.IgdbRating, g.IgdbRatingCount, g.IgdbId, g.RawgAdded, g.EsrbRating,
                g.GenresJson, g.PlatformsJson, g.DevelopersJson, g.IgdbSimilarJson,
                Tags = g.Tags.Select(t => t.Slug).ToList(),
            }).ToListAsync();

            return rows.Select(r => new SimilarGameProfile
            {
                Id = r.Id, RawgId = r.RawgId, Name = r.Name, Slug = r.Slug, Released = r.Released,
                BackgroundImage = r.BackgroundImage, Rating = r.Rating, Metacritic = r.Metacritic,
                AverageRating = r.AverageRating, RatingCount = r.RatingCount,
                IgdbRating = r.IgdbRating, IgdbRatingCount = r.IgdbRatingCount, IgdbId = r.IgdbId,
                RawgAdded = r.RawgAdded, EsrbRating = r.EsrbRating,
                Genres = SimilarGameProfile.SlugsOf(r.GenresJson),
                Platforms = SimilarGameProfile.SlugsOf(r.PlatformsJson),
                Developers = SimilarGameProfile.SlugsOf(r.DevelopersJson),
                IgdbSimilar = SimilarGameProfile.IntsOf(r.IgdbSimilarJson),
                Tags = new HashSet<string>(r.Tags, StringComparer.Ordinal),
                TitleTokens = SimilarGameProfile.TokensOf(r.Name),
                TitleKey = GameTitleMatcher.Normalize(r.Name),
                Year = SimilarGameProfile.YearOf(r.Released),
            }).ToList();
        }

        private static GameDto ToDto(SimilarGameProfile g) => new()
        {
            Id = g.Id,
            RawgId = g.RawgId,
            Name = g.Name,
            Slug = g.Slug,
            Released = g.Released,
            BackgroundImage = g.BackgroundImage,
            Rating = g.Rating,
            Metacritic = g.Metacritic,
            GghubRating = g.AverageRating,
            GghubRatingCount = g.RatingCount,
            IgdbRating = g.IgdbRating,
            IgdbRatingCount = g.IgdbRatingCount,
        };
    }
}
