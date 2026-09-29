using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Oyun Gundemi servisi. Tamamen yerel DB'den okur: RAWG/Steam erisilemez olsa da calisir.
    /// Discover'in kalite kapilari (metacritic/rating/added esikleri) BILEREK kullanilmiyor:
    /// cikmamis oyunlarin henuz puani olmaz, o kapilar gelecek aylari bosaltirdi. Bunun yerine
    /// daha gevsek bir "cop filtresi" var: gorseli ve turu olan, en az bir ilgi sinyali tasiyan oyunlar.
    /// </summary>
    public class AgendaService : IAgendaService
    {
        // Cap gun basina dagitildigi icin (bkz. BalanceByDay) 100 sayisi 31 gunluk bir ayda
        // gunde yalnizca 3 oyun demekti; 180 ile gun basina 5-6 oyun dusuyor ve ayin tamami
        // makul yogunlukta temsil ediliyor.
        private const int MonthSectionCap = 180;
        private const int YearSectionCap = 300;

        private readonly GGHubDbContext _context;
        private readonly IMemoryCache _cache;

        public AgendaService(GGHubDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<AgendaViewModel> GetAgendaAsync(int year, int month)
        {
            var cacheKey = $"agenda:{year}:{month:D2}";
            if (_cache.TryGetValue(cacheKey, out AgendaViewModel? cached) && cached != null)
            {
                return cached;
            }

            // month=0 = "Tum Yil" gorunumu: pencere yilin tamamidir, bolum tavanlari genisler.
            var isYearView = month == 0;
            string start, end;
            if (isYearView)
            {
                start = $"{year:D4}-01-01";
                end = $"{year:D4}-12-31";
            }
            else
            {
                var daysInMonth = DateTime.DaysInMonth(year, month);
                start = $"{year:D4}-{month:D2}-01";
                end = $"{year:D4}-{month:D2}-{daysInMonth:D2}";
            }
            var sectionCap = isYearView ? YearSectionCap : MonthSectionCap;
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");

            // Released string kolonu "yyyy-MM-dd" formatinda; aralik filtresi lexicographic
            // karsilastirmayla dogru calisir (DiscoverService ile ayni teknik).
            var monthGames = await _context.Games
                .AsNoTracking()
                .Where(g => g.Released != null
                    && string.Compare(g.Released, start) >= 0
                    && string.Compare(g.Released, end) <= 0
                    && g.BackgroundImage != null
                    && g.GenresJson != null
                    && (g.RawgAdded >= 50
                        || g.ImportSource == "steam"
                        || g.Metacritic != null
                        || (g.Rating ?? 0) > 0
                        // IGDB kaynakli CIKMAMIS buyuk yapimlarda bu sinyallerin HICBIRI yok:
                        // RAWG onlari indekslememis, Steam'de yoklar (konsol ozel), puanlari
                        // dogal olarak bos. Filtre bu yuzden Marvel's Wolverine ve GTA VI'yi
                        // gundemden eliyordu. TrendScore populerlik kanitidir ve bosluğu kapatir.
                        || g.TrendScore > 0))
                .Select(g => new
                {
                    g.Id, g.RawgId, g.Slug, g.Name, g.Released,
                    g.BackgroundImage, g.CoverImage, g.Rating, g.Metacritic,
                    g.AverageRating, g.RatingCount, g.RawgAdded, g.IgdbRating, g.IgdbRatingCount, g.TrendScore,
                    g.HypeScore,
                    g.PlatformsJson, g.GenresJson,
                })
                .ToListAsync();

            var mapped = monthGames
                .Select(g => new AgendaRow
                {
                    Released = g.Released,
                    HypeScore = g.HypeScore,
                    // Hype skoru olmayan oyunlarin kendi aralarindaki sirasi (eski olcut).
                    LegacyRank = g.TrendScore > 0 ? g.TrendScore : PopularityScore(g.RawgAdded, g.IgdbRatingCount, g.Metacritic, g.IgdbRating, g.Rating, g.RatingCount),
                    Dto = new GameDto
                    {
                        Id = g.Id,
                        RawgId = g.RawgId,
                        Slug = g.Slug,
                        Name = g.Name,
                        Released = g.Released,
                        BackgroundImage = g.BackgroundImage,
                        CoverImage = g.CoverImage,
                        Rating = g.Rating,
                        Metacritic = g.Metacritic,
                        GghubRating = g.AverageRating,
                        GghubRatingCount = g.RatingCount,
                        IgdbRating = g.IgdbRating,
                        IgdbRatingCount = g.IgdbRatingCount,
                        Platforms = DeserializeList<PlatformDto>(g.PlatformsJson),
                        Genres = DeserializeList<GenreDto>(g.GenresJson),
                    },
                })
                .ToList();

            // Gun ICINDEKI sira hype'a gore. Onceki olcut RawgAdded'di ve Steam satirlarina
            // yazilan yapay 60 degeri yuzunden ayni gun cikan buyuk yapimlar listenin SONUNA
            // dusuyordu (olculdu: 24 Eylul'de Control Resonant dort indie oyunun arkasindaydi).
            var releasedGames = mapped
                .Where(g => string.CompareOrdinal(g.Released, today) <= 0)
                .OrderByDescending(g => g.Released)
                .ThenByDescending(g => g.Rank)
                .ToList();

            var upcomingGames = mapped
                .Where(g => string.CompareOrdinal(g.Released, today) > 0)
                .OrderBy(g => g.Released)
                .ThenByDescending(g => g.Rank)
                .ToList();

            // Cap TARIHE gore degil GUNE DENGELI uygulanir.
            //
            // Onceki surum "tarih sirala, ilk 100'u al" diyordu; ayda 568 cikis olunca liste
            // yalnizca son bir kac gunu kapsiyor, ayin ilk yarisi TAMAMEN dusuyordu (olculdu:
            // Agustos 2026 sayfasi 12 Agustos'ta basliyor, 3 Agustos'ta cikan Anomaly President
            // hic gorunmuyordu). Artik her GUN icin o gunun en iyileri alinir; boylece ayin
            // tamami temsil edilir ve kesilen sey gun icindeki cop oyunlar olur.
            static List<T> BalanceByDay<T>(List<T> games, Func<T, string?> dayOf, Func<T, double> rankOf, int cap)
            {
                if (games.Count <= cap) return games;

                var days = games.GroupBy(g => dayOf(g) ?? string.Empty).ToList();
                var perDay = Math.Max(2, cap / Math.Max(days.Count, 1));

                var picked = days
                    .SelectMany(day => day.OrderByDescending(rankOf).Take(perDay))
                    .ToHashSet();

                // Gun basina kota dolmayan gunlerden arta kalan yeri en iyi adaylarla doldur.
                if (picked.Count < cap)
                {
                    foreach (var game in games.Where(g => !picked.Contains(g)).OrderByDescending(rankOf))
                    {
                        if (picked.Count >= cap) break;
                        picked.Add(game);
                    }
                }

                return games.Where(picked.Contains).ToList();
            }

            var highlights = PickHighlights(releasedGames, upcomingGames, isYearView, today);

            var result = new AgendaViewModel
            {
                Year = year,
                Month = month,
                Released = BalanceByDay(releasedGames, g => g.Released, g => g.Rank, sectionCap)
                    .Select(g => g.Dto).ToList(),
                Upcoming = BalanceByDay(upcomingGames, g => g.Released, g => g.Rank, sectionCap)
                    .Select(g => g.Dto).ToList(),
                Highlights = highlights,
                Tba = isYearView ? await GetTbaGamesAsync() : new List<GameDto>(),
                Counts = new AgendaCountsDto
                {
                    Released = releasedGames.Count,
                    Upcoming = upcomingGames.Count,
                },
            };

            // 10 dk: sync joblari yeni oyun ekledikce sayfa yarim saat bayat kalmasin.
            _cache.Set(cacheKey, result, TimeSpan.FromMinutes(10));
            return result;
        }

        /// <summary>
        /// Vitrin ("One cikanlar"): donemin GERCEKTEN konusulan oyunlari.
        ///
        /// Iki kural, ikisi de olculmus bir hatadan cikti (29 Eylul 2026):
        ///  1. Havuz donemin TAMAMI. Onceki surum once yaklasan cikislari aliyor, cikmis
        ///     oyunlari yalnizca bos kalan yere koyuyordu. Ayin sonunda "yaklasan" kumesi
        ///     tek bir gune (30 Eylul, 46 indie oyun) dusunce vitrinin altisi de oradan
        ///     doldu; ayni ay cikan Marvel's Wolverine, Control Resonant ve Silent Hill:
        ///     Townfall hic gorunmedi.
        ///  2. Esik var. Esigi gecen oyun yoksa vitrin bos kalir; rastgele oyunla doldurulmaz.
        /// </summary>
        private static List<GameDto> PickHighlights(
            List<AgendaRow> releasedGames, List<AgendaRow> upcomingGames, bool isYearView, string today)
        {
            const int highlightCount = 6;

            // Yil gorunumu ana sayfadaki kolaji besler: butun yilin degil, SU ANIN gundemi.
            // Son 45 gunde cikanlar + yaklasanlar.
            var recentFrom = DateTime.UtcNow.AddDays(-45).ToString("yyyy-MM-dd");
            var recent = isYearView
                ? releasedGames.Where(g => string.CompareOrdinal(g.Released, recentFrom) >= 0).ToList()
                : releasedGames;

            var pool = recent.Concat(upcomingGames).ToList();

            // Hype skoru henuz hic yazilmamissa (job ilk kez kosmadan once ya da pencerenin
            // disindaki eski yillar) eski olcute dusulur, ama yine donemin tamami uzerinden.
            if (!pool.Any(g => g.HypeScore > 0))
            {
                return pool
                    .OrderByDescending(g => g.LegacyRank)
                    .Take(highlightCount)
                    .Select(g => g.Dto)
                    .ToList();
            }

            // Ayni oyunun katalogda iki satiri olabiliyor (farkli kaynaklardan gelmis kopya);
            // ikisi de ayni makaleyle eslesip ayni skoru aliyor. Vitrinde bir kez gorunmeli.
            var hyped = pool
                .Where(g => g.HypeScore >= HypeScoring.HighlightFloor)
                .OrderByDescending(g => g.HypeScore)
                .DistinctBy(g => GameTitleMatcher.Normalize(g.Dto.Name))
                .ToList();

            if (!isYearView) return hyped.Take(highlightCount).Select(g => g.Dto).ToList();

            // Kolajda denge: yeni cikanlar okunma sayisinda zirve yaptigi icin tek basina
            // siralama yaklasan oyunlari (GTA VI disinda) listeden siliyordu.
            var half = highlightCount / 2;
            var picked = hyped.Where(g => string.CompareOrdinal(g.Released, today) > 0).Take(half)
                .Concat(hyped.Where(g => string.CompareOrdinal(g.Released, today) <= 0).Take(half))
                .ToList();

            picked.AddRange(hyped.Where(g => !picked.Contains(g)).Take(highlightCount - picked.Count));

            return picked.OrderByDescending(g => g.HypeScore).Select(g => g.Dto).ToList();
        }

        /// <summary>
        /// Cikis tarihi belli olmayan (Released = null) ama cok beklenen oyunlar. Tarihleri
        /// olmadigi icin hicbir aya dusemiyorlar; yalnizca yil gorunumunde listelenirler.
        /// </summary>
        private async Task<List<GameDto>> GetTbaGamesAsync()
        {
            // Olcut: Wikipedia'nin "Upcoming video games" kategorisinde makalesi olmak.
            // Onceki olcut RawgAdded >= 100 idi ve tarihi hic girilmemis ESKI kayitlari
            // getiriyordu (olculdu: listenin basinda 3DMark ve iptal edilmis Nosgoth vardi).
            var rows = await QueryTbaAsync(hypedOnly: true);

            // Hype skoru henuz yazilmamissa bolum bos kalmasin.
            if (rows.Count < 3) rows = await QueryTbaAsync(hypedOnly: false);

            return rows;
        }

        private async Task<List<GameDto>> QueryTbaAsync(bool hypedOnly)
        {
            var query = _context.Games
                .AsNoTracking()
                .Where(g => g.Released == null && g.BackgroundImage != null && g.GenresJson != null);

            query = hypedOnly
                ? query.Where(g => g.WikipediaTitle != null && g.HypeScore >= HypeScoring.HighlightFloor)
                    .OrderByDescending(g => g.HypeScore)
                : query.Where(g => g.RawgAdded >= 100)
                    .OrderByDescending(g => g.RawgAdded ?? 0);

            var rows = await query.Take(12).Select(ProjectCard).ToListAsync();
            return rows.Select(ToDto).ToList();
        }

        public async Task<List<GameDto>> SearchAsync(string term)
        {
            var tokens = (term ?? string.Empty)
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(t => t.Length > 0)
                .Take(6)
                .ToList();

            if (tokens.Sum(t => t.Length) < 2) return new List<GameDto>();

            var cacheKey = $"agenda-search:{string.Join(' ', tokens).ToLowerInvariant()}";
            if (_cache.TryGetValue(cacheKey, out List<GameDto>? cached) && cached != null)
            {
                return cached;
            }

            // Kapsam gundemin gezilebildigi aralik: gecen yilin basindan ileriye + tarihsizler.
            // Aylik listeler 180 oyunla sinirli oldugu icin sayfada gorunmeyen oyun da burada
            // bulunur; bu yuzden populerlik kapisi YOK, yalnizca kart icin gorsel sarti var.
            var windowStart = $"{DateTime.UtcNow.Year - 1:D4}-01-01";

            var query = _context.Games
                .AsNoTracking()
                .Where(g => g.BackgroundImage != null
                    && (g.Released == null || string.Compare(g.Released, windowStart) >= 0));

            // Kelime bazli ILIKE (GetGamesAsync ile ayni): "blade zero" yazan "Phantom Blade
            // Zero"yu bulur. ILIKE veritabaninda calisir, istek kulturunden etkilenmez.
            foreach (var token in tokens)
            {
                var pattern = $"%{EscapeLike(token)}%";
                query = query.Where(g => EF.Functions.ILike(g.Name, pattern, "\\"));
            }

            var rows = await query
                .OrderByDescending(g => g.HypeScore)
                .ThenByDescending(g => g.TrendScore)
                .Take(24)
                .Select(ProjectCard)
                .ToListAsync();

            var result = rows.Select(ToDto).ToList();
            _cache.Set(cacheKey, result, TimeSpan.FromMinutes(5));
            return result;
        }

        private static string EscapeLike(string value) =>
            value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");

        private sealed class AgendaRow
        {
            public string? Released { get; init; }
            public double HypeScore { get; init; }
            public double LegacyRank { get; init; }
            public GameDto Dto { get; init; } = null!;

            /// <summary>
            /// Tek siralama anahtari: once hype, esitlikte (cogunlukla hype = 0) eski olcut.
            /// Hype 0..100, eski olcut en fazla birkac bin oldugu icin carpan karismayi onler.
            /// </summary>
            public double Rank => HypeScore * 1_000_000 + Math.Min(LegacyRank, 999_999);
        }

        private sealed class CardRow
        {
            public int Id { get; init; }
            public int RawgId { get; init; }
            public string Slug { get; init; } = string.Empty;
            public string Name { get; init; } = string.Empty;
            public string? Released { get; init; }
            public string? BackgroundImage { get; init; }
            public string? CoverImage { get; init; }
            public double? Rating { get; init; }
            public int? Metacritic { get; init; }
            public double AverageRating { get; init; }
            public int RatingCount { get; init; }
            public double? IgdbRating { get; init; }
            public int? IgdbRatingCount { get; init; }
            public string? PlatformsJson { get; init; }
            public string? GenresJson { get; init; }
        }

        private static readonly System.Linq.Expressions.Expression<Func<Core.Entities.Game, CardRow>> ProjectCard = g => new CardRow
        {
            Id = g.Id, RawgId = g.RawgId, Slug = g.Slug, Name = g.Name, Released = g.Released,
            BackgroundImage = g.BackgroundImage, CoverImage = g.CoverImage,
            Rating = g.Rating, Metacritic = g.Metacritic,
            AverageRating = g.AverageRating, RatingCount = g.RatingCount,
            IgdbRating = g.IgdbRating, IgdbRatingCount = g.IgdbRatingCount,
            PlatformsJson = g.PlatformsJson, GenresJson = g.GenresJson,
        };

        private static GameDto ToDto(CardRow g) => new()
        {
            Id = g.Id,
            RawgId = g.RawgId,
            Slug = g.Slug,
            Name = g.Name,
            Released = g.Released,
            BackgroundImage = g.BackgroundImage,
            CoverImage = g.CoverImage,
            Rating = g.Rating,
            Metacritic = g.Metacritic,
            GghubRating = g.AverageRating,
            GghubRatingCount = g.RatingCount,
            IgdbRating = g.IgdbRating,
            IgdbRatingCount = g.IgdbRatingCount,
            Platforms = DeserializeList<PlatformDto>(g.PlatformsJson),
            Genres = DeserializeList<GenreDto>(g.GenresJson),
        };

        /// <summary>
        /// Hype skoru OLMAYAN oyunlarin kendi aralarindaki sirasi. Tek bir sinyale (RAWG
        /// "added") guvenmek yanlisti: Steam ve IGDB kaynakli satirlarda o alan bos oldugu
        /// icin siralama sessizce TARIH sirasina dusuyordu.
        /// </summary>
        private static double PopularityScore(
            int? rawgAdded, int? igdbRatingCount, int? metacritic, double? igdbRating, double? rating, int gghubRatingCount)
        {
            var scores = new[]
            {
                (double)(rawgAdded ?? 0),
                (igdbRatingCount ?? 0) * 20.0,
                (metacritic ?? 0) * 12.0,
                (igdbRating ?? 0) * 6.0,
                (rating ?? 0) * 120.0,
                gghubRatingCount * 50.0,
            };
            return scores.Max();
        }

        private static List<T> DeserializeList<T>(string? json)
        {
            if (string.IsNullOrEmpty(json)) return new List<T>();
            try { return System.Text.Json.JsonSerializer.Deserialize<List<T>>(json) ?? new(); }
            catch { return new(); }
        }
    }
}
