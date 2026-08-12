using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Kesfet sayfasinin GUNCEL populerlik siralamasini hesaplar.
    ///
    /// Neden gerekti: varsayilan siralama sabit alanlara (metacritic/rating) + haftalik bir
    /// rotasyona dayaniyordu, yani liste haftalarca ayni kaliyordu. Burada hesaplanan
    /// TrendScore periyodik olarak degistigi icin kesfet dogal olarak taze kaliyor.
    ///
    /// Skor bilesenleri (hepsi ucretsiz kaynaklardan):
    ///   1. GGHub kullanici hareketi  - son 7/30/90 gunde inceleme + listeye/istek listesine ekleme
    ///   2. Steam "en cok satanlar"   - gunluk degisen tek gercek satis sinyali
    ///   3. Steam istek listesi sirasi - cikmamis oyunlarin beklenti sinyali (RawgAdded)
    ///   4. IGDB ilgi                 - oy sayisi ve puan
    ///   5. Kalite ve yenilik         - metacritic + cikisa yakinlik
    /// </summary>
    public class TrendScoreJob : BackgroundService
    {
        private static readonly TimeSpan RunInterval = TimeSpan.FromHours(3);

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<TrendScoreJob> _logger;

        public TrendScoreJob(IServiceScopeFactory scopeFactory, ILogger<TrendScoreJob> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RunOnceAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[Trend] Kosu hatayla bitti.");
                }

                await Task.Delay(RunInterval, stoppingToken);
            }
        }

        private async Task RunOnceAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();
            var steam = scope.ServiceProvider.GetRequiredService<ISteamCatalogService>();

            var now = DateTime.UtcNow;
            var d7 = now.AddDays(-7);
            var d30 = now.AddDays(-30);
            var d90 = now.AddDays(-90);
            var today = now.ToString("yyyy-MM-dd");
            var lastYear = now.AddYears(-1).ToString("yyyy-MM-dd");

            // 1) GGHub hareketi: inceleme (agirlikli) + liste/istek listesi eklemeleri.
            var reviewActivity = await context.Reviews
                .AsNoTracking()
                .Where(r => r.CreatedAt >= d90)
                .GroupBy(r => r.GameId)
                .Select(g => new
                {
                    GameId = g.Key,
                    Score = g.Sum(r => r.CreatedAt >= d7 ? 60 : r.CreatedAt >= d30 ? 30 : 10),
                })
                .ToListAsync(ct);

            var listActivity = await context.UserListGames
                .AsNoTracking()
                .Where(x => x.AddedAt >= d90)
                .GroupBy(x => x.GameId)
                .Select(g => new
                {
                    GameId = g.Key,
                    Score = g.Sum(x => x.AddedAt >= d7 ? 25 : x.AddedAt >= d30 ? 12 : 4),
                })
                .ToListAsync(ct);

            var activityByGameId = new Dictionary<int, double>();
            foreach (var item in reviewActivity)
                activityByGameId[item.GameId] = activityByGameId.GetValueOrDefault(item.GameId) + item.Score;
            foreach (var item in listActivity)
                activityByGameId[item.GameId] = activityByGameId.GetValueOrDefault(item.GameId) + item.Score;

            // 2) Steam en cok satanlar: sira ne kadar ustteyse o kadar guclu sinyal.
            //    DIKKAT: yalnizca PC'yi kapsar; agirligi bilerek sinirli (bkz. 3).
            var topSellers = await steam.GetTopSellerAppIdsAsync(150, ct);
            var sellerRank = topSellers
                .Select((appId, index) => (appId, index))
                .ToDictionary(x => x.appId, x => x.index);

            // 3) IGDB + Twitch populerlik sinyalleri: PLATFORM BAGIMSIZ. Steam listesi tek
            //    basina kullanildiginda PS5/Xbox ozel yapimlari (GTA VI, Wolverine) siralamada
            //    hic gorunmuyordu; bu sinyal dengeyi kuruyor.
            var igdb = scope.ServiceProvider.GetRequiredService<IIgdbCatalogService>();
            var igdbPopularity = await igdb.GetPopularitySignalsAsync(500, ct);

            _logger.LogInformation(
                "[Trend] Sinyaller: {Activity} oyunda GGHub hareketi, {Sellers} Steam en cok satan, {Igdb} IGDB/Twitch populerlik.",
                activityByGameId.Count, sellerRank.Count, igdbPopularity.Count);

            // Aday havuzu: skorlanmaya deger her oyun (kalite kapisi veya hareketi olanlar).
            var games = await context.Games
                .Where(g => g.BackgroundImage != null
                    && (g.Metacritic != null || g.Rating != null || g.IgdbRating != null
                        || g.RawgAdded != null || g.SteamAppId != null))
                .Select(g => new
                {
                    g.Id, g.SteamAppId, g.IgdbId, g.Metacritic, g.Rating, g.IgdbRating, g.IgdbRatingCount,
                    g.RawgAdded, g.Released, g.AverageRating, g.RatingCount, g.TrendScore,
                })
                .ToListAsync(ct);

            var updates = new List<(int Id, double Score)>();

            foreach (var game in games)
            {
                var score = 0.0;

                // Kullanici hareketi en agirlikli bilesen: platformun kendi nabzi.
                score += activityByGameId.GetValueOrDefault(game.Id);

                // Steam satis sirasi. Tavan BILEREK dusuk (180): Steam yalnizca PC'yi kapsiyor
                // ve daha yuksek bir agirlik konsol yapimlarini listeden siliyordu.
                if (game.SteamAppId != null && sellerRank.TryGetValue(game.SteamAppId.Value, out var rank))
                    score += Math.Max(180 - rank * 1.2, 4);

                // IGDB "Want to Play/Playing/Visits" + Twitch izlenme: platform bagimsiz.
                // Steam'in tavani kadar guclu olmasi kasitli; boylece PS5/Xbox ozel yapimlari
                // PC oyunlariyla ayni ligde yarisiyor.
                if (game.IgdbId != null && igdbPopularity.TryGetValue(game.IgdbId.Value, out var igdbScore))
                    score += Math.Min(igdbScore, 200) * 0.9;

                // Beklenti/populerlik sinyalleri
                score += Math.Min(game.RawgAdded ?? 0, 2000) * 0.05;
                score += Math.Min(game.IgdbRatingCount ?? 0, 3000) * 0.02;

                // Kalite: skorun TABANI, tepesi degil. Agirliklar bilerek dusuk; yuksek olunca
                // liste yillar once cikmis klasiklerle donuyor ve "guncel populerlik" hissi
                // kayboluyordu (olculdu: Portal 2 / Half-Life 2 her zaman ilk sirada kaliyordu).
                score += (game.Metacritic ?? 0) * 0.15;
                score += (game.IgdbRating ?? 0) * 0.10;
                score += (game.Rating ?? 0) * 4;
                score += Math.Min(game.AverageRating * game.RatingCount, 60) * 0.3;

                // Yenilik: "su an konusulan" hissi icin en belirleyici ikinci bilesen.
                if (game.Released != null)
                {
                    if (string.CompareOrdinal(game.Released, today) > 0) score += 120;          // yakinda cikacak
                    else if (string.CompareOrdinal(game.Released, lastYear) >= 0) score += 90;  // son 1 yil
                }

                if (Math.Abs(game.TrendScore - score) > 0.01)
                    updates.Add((game.Id, score));
            }

            if (updates.Count == 0)
            {
                _logger.LogInformation("[Trend] Skorlar guncel, degisiklik yok.");
                return;
            }

            // Toplu guncelleme: tek tek SaveChanges uzak Postgres'te cok yavas olurdu.
            const int chunkSize = 500;
            for (var i = 0; i < updates.Count; i += chunkSize)
            {
                ct.ThrowIfCancellationRequested();
                var chunk = updates.Skip(i).Take(chunkSize).ToList();
                var ids = chunk.Select(x => x.Id).ToList();
                var scoreById = chunk.ToDictionary(x => x.Id, x => x.Score);

                var entities = await context.Games.Where(g => ids.Contains(g.Id)).ToListAsync(ct);
                foreach (var entity in entities)
                {
                    entity.TrendScore = scoreById[entity.Id];
                    entity.TrendScoreUpdatedAt = now;
                }
                await context.SaveChangesAsync(ct);
                context.ChangeTracker.Clear();
            }

            _logger.LogInformation("[Trend] {Count} oyunun trend skoru guncellendi.", updates.Count);
        }
    }
}
