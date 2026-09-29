using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Settings;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// IGDB'ye bagli oyunlarin etiketlerini (tema, mod, bakis acisi, anahtar kelime) ve
    /// IGDB'nin "benzer oyunlar" listesini toplu ceker. Benzer oyunlar algoritmasinin veri
    /// kaynagi; bu job calismadan algoritma yalnizca tur/gelistirici/kullanici sinyaliyle kalir.
    ///
    /// IgdbEnrichJob'dan AYRI: o job isimle tek tek eslestirir (300 oyun ~ 2 dk), bu job id ile
    /// 500 oyun/istek ceker (2000 oyun ~ 2 sn). Ayni kuyruga sokmak hizliyi yavasa baglardi.
    /// Kuyruk: IgdbId dolu ve TagsSyncedAt bos/eski olan satirlar, populer once.
    /// </summary>
    public class GameTagSyncJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IgdbSettings _settings;
        private readonly ILogger<GameTagSyncJob> _logger;

        public GameTagSyncJob(
            IServiceScopeFactory scopeFactory,
            IOptions<IgdbSettings> settings,
            ILogger<GameTagSyncJob> logger)
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
                _logger.LogInformation("[IGDB-Tags] Kapali veya kimlik bilgileri yok; job calismayacak.");
                return;
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var service = scope.ServiceProvider.GetRequiredService<IIgdbCatalogService>();

                    var processed = await service.SyncTagsAsync(_settings.TagSyncBatchSize, stoppingToken);

                    // Kuyruk doluyken hizli devam et, bosaldiginda uzun uyu (IgdbEnrichJob ile ayni desen).
                    var wait = processed >= _settings.TagSyncBatchSize
                        ? TimeSpan.FromMinutes(1)
                        : TimeSpan.FromHours(_settings.RunIntervalHours);
                    await Task.Delay(wait, stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[IGDB-Tags] Kosu hatayla bitti; tekrar denenecek.");
                    await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken);
                }
            }
        }
    }
}
