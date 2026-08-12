using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Steam'in one cikanlar ucundan (featuredcategories) yeni cikan + yakinda cikacak
    /// oyunlari periyodik olarak katalogla. Amac: RAWG'in gec indeksledigi/atladigi guncel
    /// Steam oyunlarinin (Oyun Gundemi sayfasi dahil) katalogda hazir olmasi.
    /// Maliyet 0: uclar anahtarsiz; tek kisit resmi olmayan rate limit, o da istekler arasi
    /// bekleme + kosu basi tavanla korunuyor. Worker'da kosar (Railway'de DEGIL).
    /// </summary>
    public class SteamNewReleasesSyncJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly SteamCatalogSettings _settings;
        private readonly ILogger<SteamNewReleasesSyncJob> _logger;

        public SteamNewReleasesSyncJob(
            IServiceScopeFactory scopeFactory,
            IOptions<SteamCatalogSettings> settings,
            ILogger<SteamNewReleasesSyncJob> logger)
        {
            _scopeFactory = scopeFactory;
            _settings = settings.Value;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_settings.Enabled)
            {
                _logger.LogInformation("[SteamSync] Kapali (SteamCatalog:Enabled=false), job calismayacak.");
                return;
            }

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
                    _logger.LogError(ex, "[SteamSync] Kosu beklenmedik hatayla bitti; sonraki periyotta tekrar denenecek.");
                }

                await Task.Delay(TimeSpan.FromMinutes(_settings.RunIntervalMinutes), stoppingToken);
            }
        }

        private async Task RunOnceAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var steamCatalog = scope.ServiceProvider.GetRequiredService<ISteamCatalogService>();
            var context = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();

            var featuredIds = await steamCatalog.GetFeaturedAppIdsAsync(ct);
            // Genis pencere: magaza aramasinin "populer yakinda cikacaklar" listesi (~100 oyun).
            // featuredcategories tek basina ~20-40 oyunla sinirli kaliyordu ve gundemin gelecek
            // aylari bos gorunuyordu.
            var comingSoonIds = await steamCatalog.GetComingSoonAppIdsAsync(200, ct);

            var idList = featuredIds.Concat(comingSoonIds).Distinct().ToList();
            if (idList.Count == 0)
            {
                _logger.LogInformation("[SteamSync] featured + comingsoon bos dondu, islem yok.");
                return;
            }
            var known = await context.Games
                .AsNoTracking()
                .Where(g => g.SteamAppId != null && idList.Contains(g.SteamAppId.Value))
                .Select(g => g.SteamAppId!.Value)
                .ToListAsync(ct);
            var knownSet = known.ToHashSet();

            var missing = idList.Where(id => !knownSet.Contains(id))
                .Take(_settings.MaxAppDetailsPerRun)
                .ToList();

            // Katalogda ZATEN olan oyunlarin populerlik skorunu da tazele. Onceki surum yalnizca
            // yeni oyunlara skor yaziyordu; sonuc olarak daha once eklenmis buyuk yapimlar
            // sinyalsiz kaliyor ve gundem vitrini tarih sirasina dusuyordu. Bu yol ekstra HTTP
            // istegi ATMAZ, sadece DB gunceller.
            var refreshed = await RefreshPopularityAsync(context, idList, knownSet, ct);

            if (missing.Count == 0)
            {
                _logger.LogInformation("[SteamSync] {Total} one cikan oyunun tamami zaten katalogda ({Refreshed} skor tazelendi).",
                    idList.Count, refreshed);
                return;
            }

            // Populerlik skoru listedeki siradan turetilir: GetComingSoonAppIdsAsync once
            // "en cok istek listesine eklenenler" filtresini tariyor, yani basta buyuk yapimlar
            // var. Bu skor RawgAdded'a yazilir ve gundem vitrini ile discover siralamasini besler.
            var rankByAppId = idList
                .Select((id, index) => (id, index))
                .ToDictionary(x => x.id, x => x.index);

            var ingested = 0;
            var linked = 0;
            foreach (var appId in missing)
            {
                ct.ThrowIfCancellationRequested();

                var rank = rankByAppId.TryGetValue(appId, out var r) ? r : idList.Count;
                var popularityHint = Math.Max(1000 - rank * 5, 60);

                var game = await steamCatalog.IngestAppAsync(appId, ct, popularityHint);
                if (game != null)
                {
                    if (game.ImportSource == "steam" && game.RawgId == -appId) ingested++;
                    else linked++;
                }

                if (_settings.DelayBetweenRequestsMs > 0)
                    await Task.Delay(_settings.DelayBetweenRequestsMs, ct);
            }

            _logger.LogInformation(
                "[SteamSync] Kosu bitti: {Missing} aday islendi, {Ingested} yeni oyun, {Linked} mevcut satira baglandi, {Refreshed} skor tazelendi.",
                missing.Count, ingested, linked, refreshed);
        }

        /// <summary>
        /// Steam listesindeki siradan turetilen populerlik skorunu, katalogda zaten bulunan
        /// satirlara yazar. Skor yalnizca YUKSELIR (baska kaynagin daha guclu sinyalini ezmez).
        /// </summary>
        private static async Task<int> RefreshPopularityAsync(
            GGHubDbContext context, List<int> idList, HashSet<int> knownSet, CancellationToken ct)
        {
            var knownIds = idList.Where(knownSet.Contains).ToList();
            if (knownIds.Count == 0) return 0;

            var rankByAppId = idList
                .Select((id, index) => (id, index))
                .ToDictionary(x => x.id, x => x.index);

            var games = await context.Games
                .Where(g => g.SteamAppId != null && knownIds.Contains(g.SteamAppId.Value))
                .ToListAsync(ct);

            var changed = 0;
            foreach (var game in games)
            {
                var rank = rankByAppId.TryGetValue(game.SteamAppId!.Value, out var r) ? r : idList.Count;
                var score = Math.Max(1000 - rank * 5, 60);
                if ((game.RawgAdded ?? 0) >= score) continue;

                game.RawgAdded = score;
                changed++;
            }

            if (changed > 0) await context.SaveChangesAsync(ct);
            return changed;
        }
    }
}
