using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Settings;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Mevcut katalogu IGDB puani/eslesmesiyle zenginlestirir. IgdbSyncJob'dan AYRI bir job:
    /// takvim senkronu binlerce kaydi isledigi icin uzun suruyor ve zenginlestirme sirasi hic
    /// gelmiyordu (olculdu: puanlar saatlerce bos kaldi). Ayri job'da ikisi paralel ilerler.
    /// Kuyruk populerlige gore siralidir; ilk kosularda en cok gezilen oyunlar puan kazanir.
    /// </summary>
    public class IgdbEnrichJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IgdbSettings _settings;
        private readonly ILogger<IgdbEnrichJob> _logger;

        public IgdbEnrichJob(
            IServiceScopeFactory scopeFactory,
            IOptions<IgdbSettings> settings,
            ILogger<IgdbEnrichJob> logger)
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
                _logger.LogInformation("[IGDB-Enrich] Kapali veya kimlik bilgileri yok; job calismayacak.");
                return;
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var service = scope.ServiceProvider.GetRequiredService<IIgdbCatalogService>();
                    var processed = await service.EnrichExistingGamesAsync(_settings.EnrichBatchSize, stoppingToken);

                    // Kuyruk doluyken hizli devam et, bosaldiginda uzun uyu.
                    var wait = processed >= _settings.EnrichBatchSize
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
                    _logger.LogError(ex, "[IGDB-Enrich] Kosu hatayla bitti; tekrar denenecek.");
                    await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken);
                }
            }
        }
    }
}
