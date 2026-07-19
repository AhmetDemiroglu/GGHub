using GGHub.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// DownloadPageEvents tablosunu saklama süresine göre budar (günde bir kez).
    ///
    /// NEDEN Program.cs'te kayıtlı (katalog job'larının aksine): oradaki kural
    /// "yeni AddHostedService ekleme, GGHub.Worker'a ekle" der ve gerekçesi
    /// crawler'ların prod container'ında CPU yakmasını engellemektir. Worker ise
    /// YALNIZCA geliştirici makinesinde açılır. Temizlik ise prod'da çalışmak
    /// ZORUNDA, yoksa tablo sınırsız büyür. Günde bir kez partili DELETE'in CPU
    /// maliyeti ihmal edilebilir; bu yüzden BackgroundEmailService gibi meşru bir
    /// ikinci istisnadır.
    /// </summary>
    public class DownloadEventRetentionJob : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _configuration;
        private readonly ILogger<DownloadEventRetentionJob> _logger;

        private static readonly TimeSpan Interval = TimeSpan.FromHours(24);
        private const int BatchSize = 10_000;

        public DownloadEventRetentionJob(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger<DownloadEventRetentionJob> logger)
        {
            _serviceProvider = serviceProvider;
            _configuration = configuration;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Acilista hemen calisma: deploy sirasinda migration ve isinma ile
            // ayni ana denk gelmesin.
            try
            {
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var retentionDays = _configuration.GetValue<int?>("DownloadAnalytics:RetentionDays") ?? 180;
                    var cutoff = DateTime.UtcNow.AddDays(-retentionDays);

                    using var scope = _serviceProvider.CreateScope();
                    var service = scope.ServiceProvider.GetRequiredService<IDownloadAnalyticsService>();
                    var deleted = await service.PurgeOlderThanAsync(cutoff, BatchSize, stoppingToken);

                    if (deleted > 0)
                        _logger.LogInformation("download-analytics retention: {Deleted} satir silindi ({Days} gun oncesi)", deleted, retentionDays);
                }
                catch (OperationCanceledException)
                {
                    return;
                }
                catch (Exception ex)
                {
                    // Temizlik basarisiz olsa da dongu devam etmeli; yarin tekrar dener.
                    _logger.LogError(ex, "download-analytics retention: temizlik basarisiz");
                }

                try
                {
                    await Task.Delay(Interval, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    return;
                }
            }
        }
    }
}
