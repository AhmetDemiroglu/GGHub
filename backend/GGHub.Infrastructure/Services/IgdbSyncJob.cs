using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Settings;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// IGDB cikis takvimi senkronu. Steam yalnizca PC'yi, RAWG ise (calistiginda) genis ama
    /// gec guncellenen bir katalogu kapsiyor; konsol ozel yapimlarin gundemde gorunmesini
    /// saglayan kaynak budur. Kimlik bilgileri girilmemisse job kendini kapatir.
    /// </summary>
    public class IgdbSyncJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IgdbSettings _settings;
        private readonly ILogger<IgdbSyncJob> _logger;

        public IgdbSyncJob(
            IServiceScopeFactory scopeFactory,
            IOptions<IgdbSettings> settings,
            ILogger<IgdbSyncJob> logger)
        {
            _scopeFactory = scopeFactory;
            _settings = settings.Value;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_settings.Enabled
                || string.IsNullOrWhiteSpace(_settings.ClientId)
                || string.IsNullOrWhiteSpace(_settings.ClientSecret))
            {
                _logger.LogInformation("[IGDB] Kapali veya kimlik bilgileri yok; job calismayacak.");
                return;
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var service = scope.ServiceProvider.GetRequiredService<IIgdbCatalogService>();

                    // 1) Cikis takvimi (gundemi besler)
                    await service.SyncReleaseWindowAsync(stoppingToken);

                    // 2) Mevcut katalogu zenginlestir (IGDB puani + eslesme). Kuyruk zamanla
                    //    kurur; 30 gunde bir yeniden kontrol edilerek puanlar guncel kalir.
                    await service.EnrichExistingGamesAsync(_settings.EnrichBatchSize, stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[IGDB] Kosu beklenmedik hatayla bitti; sonraki periyotta tekrar denenecek.");
                }

                await Task.Delay(TimeSpan.FromHours(_settings.RunIntervalHours), stoppingToken);
            }
        }
    }
}
