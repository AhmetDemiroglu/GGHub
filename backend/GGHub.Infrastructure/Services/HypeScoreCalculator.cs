using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Hype skorunun butun boru hatti: aday oyunlar, Wikipedia eslesmesi, okunma sayilari,
    /// canli sinyaller, skor. YAZMAZ; yazma HypeScoreJob'in isi. Boylece ayni hesap teshis
    /// raporunda (GGHub.Worker --hype-report) hicbir seyi degistirmeden calistirilabiliyor.
    /// </summary>
    public class HypeScoreCalculator
    {
        /// <param name="WindowStart">Dahil, "yyyy-MM-dd".</param>
        /// <param name="WindowEnd">Dahil, "yyyy-MM-dd"; null ise ust sinir yok.</param>
        /// <param name="IncludeUndated">Cikis tarihi olmayan (TBA) oyunlar da aday olsun mu.</param>
        /// <param name="UseStoredColumns">
        /// false ise Hype/Wikipedia kolonlari HIC okunmaz ve her okunma sayisi canli cekilir.
        /// Rapor migration uygulanmadan once de calisabilsin diye var.
        /// </param>
        public record Options(string WindowStart, string? WindowEnd, bool IncludeUndated, bool UseStoredColumns);

        public record Result(
            int Id,
            string Name,
            string? Released,
            string? WikipediaTitle,
            int? WikipediaViews30d,
            DateTime? WikipediaViewsUpdatedAt,
            HypeScoring.Breakdown Breakdown,
            bool Changed);

        private sealed class Candidate
        {
            public int Id { get; init; }
            public string Name { get; init; } = string.Empty;
            public string? Released { get; init; }
            public int? SteamAppId { get; init; }
            public int? IgdbId { get; init; }
            public int? Metacritic { get; init; }
            public int? IgdbRatingCount { get; init; }
            public double StoredHype { get; init; }
            public string? StoredTitle { get; init; }
            public int? StoredViews { get; init; }
            public DateTime? StoredViewsAt { get; init; }
        }

        private readonly GGHubDbContext _context;
        private readonly ISteamCatalogService _steam;
        private readonly IIgdbCatalogService _igdb;
        private readonly IWikipediaHypeService _wikipedia;
        private readonly HypeScoreSettings _settings;
        private readonly ILogger<HypeScoreCalculator> _logger;

        public HypeScoreCalculator(
            GGHubDbContext context,
            ISteamCatalogService steam,
            IIgdbCatalogService igdb,
            IWikipediaHypeService wikipedia,
            IOptions<HypeScoreSettings> settings,
            ILogger<HypeScoreCalculator> logger)
        {
            _context = context;
            _steam = steam;
            _igdb = igdb;
            _wikipedia = wikipedia;
            _settings = settings.Value;
            _logger = logger;
        }

        public async Task<List<Result>> ComputeAsync(Options options, CancellationToken ct = default)
        {
            var now = DateTime.UtcNow;
            var today = now.ToString("yyyy-MM-dd");

            var candidates = await LoadCandidatesAsync(options, ct);
            if (candidates.Count == 0) return new List<Result>();

            // Wikipedia kategorileri. Erken erisim oyunlarinda makale yili ile katalogdaki
            // cikis yili kayiyor (RuneScape: Dragonwilds makalesi "2025", 1.0 cikisi 2026),
            // bu yuzden pencere iki yil geriye de bakar.
            var firstYear = int.Parse(options.WindowStart[..4]) - 2;
            var lastYear = Math.Max(now.Year + 2, firstYear);
            var articles = await _wikipedia.GetGameArticlesAsync(Enumerable.Range(firstYear, lastYear - firstYear + 1), ct);

            // Kategoriler bos geldiyse Wikipedia'ya ulasilamamistir. O durumda eslesmeler
            // SILINMEZ: DB'deki son bilinen baslik ve okunma sayisiyla devam edilir.
            var wikipediaReachable = articles.Count >= 100;
            if (!wikipediaReachable)
                _logger.LogWarning("[Hype] Wikipedia kategorileri okunamadi ({Count} makale); eski eslesmeler korunuyor.", articles.Count);

            var articlesByKey = articles
                .Select(a => new { Key = GameTitleMatcher.Normalize(a.Title), Article = a })
                .Where(x => x.Key.Length >= 3)
                .GroupBy(x => x.Key)
                .ToDictionary(g => g.Key, g => g.Select(x => x.Article).ToList());

            var titleByGameId = new Dictionary<int, string?>();
            foreach (var game in candidates)
            {
                titleByGameId[game.Id] = wikipediaReachable
                    ? MatchArticle(game, articlesByKey, today, now.Year)
                    : game.StoredTitle;
            }

            var viewsByTitle = await LoadViewsAsync(candidates, titleByGameId, options.UseStoredColumns, now, ct);

            var signals = await PopularitySignalCollector.CollectAsync(_context, _steam, _igdb, now, ct);

            _logger.LogInformation(
                "[Hype] {Candidates} aday, {Matched} Wikipedia eslesmesi, {Sellers} Steam en cok satan, {Igdb} IGDB populerlik.",
                candidates.Count, titleByGameId.Values.Count(t => t != null), signals.SteamSellerRank.Count, signals.IgdbPopularity.Count);

            var results = new List<Result>(candidates.Count);
            foreach (var game in candidates)
            {
                var title = titleByGameId[game.Id];

                int? views = null;
                DateTime? viewsAt = null;
                if (title != null)
                {
                    if (viewsByTitle.TryGetValue(title, out var fetched))
                    {
                        views = fetched;
                        viewsAt = now;
                    }
                    else if (title == game.StoredTitle)
                    {
                        // Tazelenmesi gerekmeyen ya da bu kosuda cekilemeyen deger: eskisi gecerli.
                        views = game.StoredViews;
                        viewsAt = game.StoredViewsAt;
                    }
                }

                var breakdown = HypeScoring.Compute(new HypeScoring.Signals(
                    WikipediaViews30d: views,
                    SteamSellerRank: game.SteamAppId != null && signals.SteamSellerRank.TryGetValue(game.SteamAppId.Value, out var rank) ? rank : null,
                    IgdbPopularity: game.IgdbId != null && signals.IgdbPopularity.TryGetValue(game.IgdbId.Value, out var igdbScore) ? igdbScore : 0,
                    Metacritic: game.Metacritic,
                    IgdbRatingCount: game.IgdbRatingCount,
                    GghubActivity: signals.ActivityByGameId.GetValueOrDefault(game.Id)));

                var changed = Math.Abs(game.StoredHype - breakdown.Total) > 0.01
                    || title != game.StoredTitle
                    || views != game.StoredViews;

                results.Add(new Result(game.Id, game.Name, game.Released, title, views, viewsAt, breakdown, changed));
            }

            return results;
        }

        private async Task<List<Candidate>> LoadCandidatesAsync(Options options, CancellationToken ct)
        {
            var start = options.WindowStart;
            var end = options.WindowEnd;
            var includeUndated = options.IncludeUndated;

            var query = _context.Games
                .AsNoTracking()
                .Where(g => g.BackgroundImage != null
                    && ((g.Released != null
                            && string.Compare(g.Released, start) >= 0
                            && (end == null || string.Compare(g.Released, end) <= 0))
                        || (includeUndated && g.Released == null)));

            if (options.UseStoredColumns)
            {
                return await query
                    .Select(g => new Candidate
                    {
                        Id = g.Id, Name = g.Name, Released = g.Released,
                        SteamAppId = g.SteamAppId, IgdbId = g.IgdbId,
                        Metacritic = g.Metacritic, IgdbRatingCount = g.IgdbRatingCount,
                        StoredHype = g.HypeScore, StoredTitle = g.WikipediaTitle,
                        StoredViews = g.WikipediaViews30d, StoredViewsAt = g.WikipediaViewsUpdatedAt,
                    })
                    .ToListAsync(ct);
            }

            return await query
                .Select(g => new Candidate
                {
                    Id = g.Id, Name = g.Name, Released = g.Released,
                    SteamAppId = g.SteamAppId, IgdbId = g.IgdbId,
                    Metacritic = g.Metacritic, IgdbRatingCount = g.IgdbRatingCount,
                })
                .ToListAsync(ct);
        }

        /// <summary>
        /// Oyunun adiyla ayni anahtara inen makaleler arasindan yila EN YAKIN olani secer.
        /// Yil kontrolu sart: ayni adli eski bir oyun ile yeni yapim (remake) karismamali.
        /// </summary>
        private static string? MatchArticle(
            Candidate game,
            Dictionary<string, List<WikipediaGameArticle>> articlesByKey,
            string today,
            int currentYear)
        {
            var key = GameTitleMatcher.Normalize(game.Name);
            if (key.Length < 3 || !articlesByKey.TryGetValue(key, out var sameNamed)) return null;

            int? gameYear = game.Released != null && game.Released.Length >= 4
                && int.TryParse(game.Released[..4], out var parsed) ? parsed : null;
            var unreleased = game.Released == null || string.CompareOrdinal(game.Released, today) > 0;

            WikipediaGameArticle? best = null;
            var bestDistance = int.MaxValue;

            foreach (var article in sameNamed)
            {
                int distance;
                if (article.Year is int articleYear)
                {
                    if (gameYear is int year) distance = Math.Abs(articleYear - year);
                    else if (article.IsUpcoming) distance = 1;
                    else continue;
                }
                else
                {
                    // Yilsiz "Upcoming video games": oyun cikmamis ya da yeni cikmis olmali.
                    if (!unreleased && (gameYear ?? 0) < currentYear - 1) continue;
                    distance = 1;
                }

                if (distance > 2 || distance >= bestDistance) continue;
                best = article;
                bestDistance = distance;
            }

            return best?.Title;
        }

        private async Task<Dictionary<string, int>> LoadViewsAsync(
            List<Candidate> candidates,
            Dictionary<int, string?> titleByGameId,
            bool useStored,
            DateTime now,
            CancellationToken ct)
        {
            var staleBefore = now.AddHours(-_settings.ViewsRefreshHours);

            var titles = candidates
                .Where(game =>
                {
                    var title = titleByGameId[game.Id];
                    if (title == null) return false;
                    if (!useStored) return true;
                    return title != game.StoredTitle
                        || game.StoredViews == null
                        || game.StoredViewsAt == null
                        || game.StoredViewsAt < staleBefore;
                })
                .Select(game => titleByGameId[game.Id]!)
                .Distinct()
                .ToList();

            var views = new Dictionary<string, int>();
            foreach (var title in titles)
            {
                ct.ThrowIfCancellationRequested();

                var value = await _wikipedia.GetViews30dAsync(title, ct);
                if (value != null) views[title] = value.Value;

                if (_settings.DelayBetweenRequestsMs > 0)
                    await Task.Delay(_settings.DelayBetweenRequestsMs, ct);
            }

            if (titles.Count > 0)
                _logger.LogInformation("[Hype] {Fetched}/{Total} makalenin okunma sayisi cekildi.", views.Count, titles.Count);

            return views;
        }
    }
}
