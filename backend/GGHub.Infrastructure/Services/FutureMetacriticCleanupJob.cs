using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// RAWG arada henüz çıkmamış oyunlara metacritic puanı verebiliyor (ör. 2027
    /// Tomb Raider'da puan olması). Yeni senkronizasyonlar zaten
    /// RawgGameService.SanitizeMetacritic ile temizleniyor; bu job sadece günde bir
    /// kez DB'de kalmış eski hatalı kayıtları toplu olarak null'a indirir.
    /// </summary>
    public class FutureMetacriticCleanupJob : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<FutureMetacriticCleanupJob> _logger;
        private readonly TimeSpan _interval;
        private readonly TimeSpan _initialDelay;

        public FutureMetacriticCleanupJob(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger<FutureMetacriticCleanupJob> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;

            // Varsayılan: günde bir tur. Override edilebilir.
            var hours = configuration.GetValue<double?>("Jobs:FutureMetacriticCleanup:RunIntervalHours") ?? 24.0;
            _interval = TimeSpan.FromHours(hours);

            // İlk açılışta hemen değil, app stabil hale gelsin: 5 dakika beklesin.
            var startupMin = configuration.GetValue<double?>("Jobs:FutureMetacriticCleanup:StartupDelayMinutes") ?? 5.0;
            _initialDelay = TimeSpan.FromMinutes(startupMin);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation(
                "[FutureMetacriticCleanup] Started. Initial delay: {Delay}. Interval: {Interval}.",
                _initialDelay, _interval);

            try
            {
                await Task.Delay(_initialDelay, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                return;
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RunOnceAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[FutureMetacriticCleanup] Run failed: {Message}", ex.Message);
                }

                try
                {
                    await Task.Delay(_interval, stoppingToken);
                }
                catch (TaskCanceledException)
                {
                    return;
                }
            }
        }

        private async Task RunOnceAsync(CancellationToken ct)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();

            var todayIso = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var updated = await context.Games
                .Where(g => g.Metacritic != null
                            && g.Released != null
                            && string.Compare(g.Released, todayIso) > 0)
                .ExecuteUpdateAsync(s => s.SetProperty(g => g.Metacritic, (int?)null), ct);

            if (updated > 0)
            {
                _logger.LogInformation(
                    "[FutureMetacriticCleanup] Reset Metacritic on {Count} future-dated games.",
                    updated);
            }
        }
    }
}
