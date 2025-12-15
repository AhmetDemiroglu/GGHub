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
        private readonly string _logFilePath;

        public MetacriticSyncJob(IServiceProvider serviceProvider, ILogger<MetacriticSyncJob> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _logFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "metacritic_sync.txt");
        }
        private void LogToFile(string message)
        {
            try
            {
                var logLine = $"[{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}] {message}{Environment.NewLine}";
                File.AppendAllText(_logFilePath, logLine);
            }
            catch { }
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var msg = "!!! [MetacriticSync] SERVIS BASLATILDI (V4 - File Logging) !!!";
            _logger.LogInformation(msg);
            LogToFile(msg); 

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
                        LogToFile($"Processing -> '{game.Name}'...");
                        var serviceTask = metacriticService.GetMetacriticScoreAsync(game.Name, game.Released);
                        var timeoutTask = Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

                        var completedTask = await Task.WhenAny(serviceTask, timeoutTask);

                        if (completedTask == timeoutTask)
                        {
                            throw new TimeoutException("30 saniye içinde cevap gelmedi (Hard Limit).");
                        }

                        var result = await serviceTask;
                        if (result != null)
                        {
                            game.Metacritic = result.Score;
                            game.MetacriticUrl = result.Url;

                            context.Games.Update(game);
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

                        await Task.Delay(TimeSpan.FromSeconds(Random.Shared.Next(5, 10)), stoppingToken);
                    }
                    catch (TimeoutException tEx)
                    {
                        var timeMsg = $"TIMEOUT -> '{game.Name}': {tEx.Message}";
                        _logger.LogWarning(timeMsg);
                        LogToFile(timeMsg);

                        game.LastSyncedAt = DateTime.UtcNow;
                        await context.SaveChangesAsync(stoppingToken);
                    }
                    catch (Exception ex)
                    {
                        var errMsg = $"ERROR -> '{game.Name}': {ex.Message}";
                        _logger.LogError(errMsg);
                        LogToFile(errMsg);
                    }
                }
            }
            LogToFile("--- Batch Tamamlandı ---");
        }
    }
}