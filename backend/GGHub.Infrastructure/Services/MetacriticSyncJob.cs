using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services
{
    public class MetacriticSyncJob : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<MetacriticSyncJob> _logger;
        private readonly TimeSpan _interval = TimeSpan.FromMinutes(30);

        // Log dosyasının yolu (Uygulamanın çalıştığı dizine kaydeder)
        private readonly string _logFilePath;

        public MetacriticSyncJob(IServiceProvider serviceProvider, ILogger<MetacriticSyncJob> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            // Dosya yolu: /app/metacritic_sync.txt
            _logFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "metacritic_sync.txt");
        }

        // Basit dosya yazma yardımcısı
        private void LogToFile(string message)
        {
            try
            {
                var logLine = $"[{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}] {message}{Environment.NewLine}";
                File.AppendAllText(_logFilePath, logLine);
            }
            catch { /* Dosya hatası ana akışı bozmasın */ }
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var msg = "!!! [MetacriticSync] SERVIS BASLATILDI (V4 - File Logging) !!!";
            _logger.LogInformation(msg);
            LogToFile(msg); // Dosyaya da yaz

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await SyncMetacriticScoresAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    var err = $"[MetacriticSync] Kritik Hata: {ex.Message}";
                    _logger.LogError(ex, err);
                    LogToFile(err);
                }

                await Task.Delay(_interval, stoppingToken);
            }
        }

        private async Task SyncMetacriticScoresAsync(CancellationToken stoppingToken)
        {
            List<int> gameIdsToSync;

            using (var scope = _serviceProvider.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();

                gameIdsToSync = await context.Games
                    .Where(g => g.Metacritic == null && !string.IsNullOrEmpty(g.Name))
                    .OrderByDescending(g => g.LastSyncedAt)
                    .Take(20)
                    .Select(g => g.Id)
                    .ToListAsync(stoppingToken);
            }

            if (gameIdsToSync.Count == 0)
            {
                // Boşuna log kirliliği yapmasın, sadece console'a bilgi düşsün
                _logger.LogInformation("[MetacriticSync] İşlenecek oyun yok.");
                return;
            }

            LogToFile($"--- Yeni Batch Başladı: {gameIdsToSync.Count} oyun ---");

            foreach (var gameId in gameIdsToSync)
            {
                if (stoppingToken.IsCancellationRequested) break;

                using (var scope = _serviceProvider.CreateScope())
                {
                    var context = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();
                    var metacriticService = scope.ServiceProvider.GetRequiredService<IMetacriticService>();

                    var game = await context.Games.FindAsync(new object[] { gameId }, stoppingToken);
                    if (game == null) continue;

                    try
                    {
                        var result = await metacriticService.GetMetacriticScoreAsync(game.Name, game.Released);

                        if (result != null)
                        {
                            game.Metacritic = result.Score;
                            game.MetacriticUrl = result.Url;
                            await context.SaveChangesAsync(stoppingToken);

                            var successMsg = $"SUCCESS -> '{game.Name}': {result.Score}";
                            _logger.LogInformation(successMsg);
                            LogToFile(successMsg);
                        }
                        else
                        {
                            game.LastSyncedAt = DateTime.UtcNow;
                            await context.SaveChangesAsync(stoppingToken);

                            var failMsg = $"NOT FOUND -> '{game.Name}'";
                            _logger.LogWarning(failMsg);
                            LogToFile(failMsg);
                        }

                        // IP ban yememek için bekleme
                        await Task.Delay(TimeSpan.FromSeconds(Random.Shared.Next(5, 10)), stoppingToken);
                    }
                    catch (Exception ex)
                    {
                        var errMsg = $"ERROR -> ID {gameId}: {ex.Message}";
                        _logger.LogError(errMsg);
                        LogToFile(errMsg);
                    }
                }
            }
            LogToFile("--- Batch Tamamlandı ---");
        }
    }
}