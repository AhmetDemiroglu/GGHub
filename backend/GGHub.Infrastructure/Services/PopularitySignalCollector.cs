using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// TrendScoreJob ve HypeScoreJob'in ORTAK canli sinyalleri. Iki job ayni sorgulari ayri
    /// ayri yazsaydi "bot incelemeleri sayilmaz" gibi bir kural birinde duzeltilip digerinde
    /// unutulurdu.
    /// </summary>
    public record PopularitySignals(
        Dictionary<int, double> ActivityByGameId,
        Dictionary<int, int> SteamSellerRank,
        Dictionary<int, double> IgdbPopularity);

    public static class PopularitySignalCollector
    {
        public static async Task<PopularitySignals> CollectAsync(
            GGHubDbContext context,
            ISteamCatalogService steam,
            IIgdbCatalogService igdb,
            DateTime now,
            CancellationToken ct)
        {
            var d7 = now.AddDays(-7);
            var d30 = now.AddDays(-30);
            var d90 = now.AddDays(-90);

            // 1) GGHub hareketi: inceleme (agirlikli) + liste/istek listesi eklemeleri.
            // AI bot incelemeleri trend sinyali DEGIL: botlar bir oyunu gundeme tasimamali.
            var reviewActivity = await context.Reviews
                .AsNoTracking()
                .Where(r => r.CreatedAt >= d90 && !r.User.IsAiAgent)
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
            //    DIKKAT: yalnizca PC'yi kapsar.
            var topSellers = await steam.GetTopSellerAppIdsAsync(150, ct);
            var sellerRank = topSellers
                .Select((appId, index) => (appId, index))
                .ToDictionary(x => x.appId, x => x.index);

            // 3) IGDB + Twitch populerlik sinyalleri: PLATFORM BAGIMSIZ. Steam listesi tek
            //    basina kullanildiginda PS5/Xbox ozel yapimlari (GTA VI, Wolverine) siralamada
            //    hic gorunmuyordu; bu sinyal dengeyi kuruyor.
            var igdbPopularity = await igdb.GetPopularitySignalsAsync(500, ct);

            return new PopularitySignals(activityByGameId, sellerRank, igdbPopularity);
        }
    }
}
