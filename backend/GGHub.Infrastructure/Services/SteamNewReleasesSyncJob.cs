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
            if (featuredIds.Count == 0)
            {
                _logger.LogInformation("[SteamSync] featuredcategories bos dondu, islem yok.");
                return;
            }

            var idList = featuredIds.ToList();
            var known = await context.Games
                .AsNoTracking()
                .Where(g => g.SteamAppId != null && idList.Contains(g.SteamAppId.Value))
                .Select(g => g.SteamAppId!.Value)
                .ToListAsync(ct);
            var knownSet = known.ToHashSet();

            var missing = idList.Where(id => !knownSet.Contains(id))
                .Take(_settings.MaxAppDetailsPerRun)
                .ToList();

            if (missing.Count == 0)
            {
                _logger.LogInformation("[SteamSync] {Total} one cikan oyunun tamami zaten katalogda.", idList.Count);
                return;
            }

            var ingested = 0;
            var linked = 0;
            foreach (var appId in missing)
            {
                ct.ThrowIfCancellationRequested();

                var game = await steamCatalog.IngestAppAsync(appId, ct);
                if (game != null)
                {
                    if (game.ImportSource == "steam" && game.RawgId == -appId) ingested++;
                    else linked++;
                }

                if (_settings.DelayBetweenRequestsMs > 0)
                    await Task.Delay(_settings.DelayBetweenRequestsMs, ct);
            }

            _logger.LogInformation(
                "[SteamSync] Kosu bitti: {Missing} aday islendi, {Ingested} yeni oyun, {Linked} mevcut satira baglandi.",
                missing.Count, ingested, linked);
        }
    }
}
