using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Text;

namespace GGHub.Infrastructure.Services
{
    public class MetacriticSyncJob : BackgroundService
    {
        private const string StatusPrefix = "metacritic-status:";
        private static readonly TimeSpan BatchInterval = TimeSpan.FromMinutes(1);
        private static readonly TimeSpan NoScoreRetryInterval = TimeSpan.FromDays(14);
        private static readonly TimeSpan NoResultsRetryInterval = TimeSpan.FromDays(14);
        private static readonly TimeSpan TransientRetryInterval = TimeSpan.FromMinutes(30);

        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<MetacriticSyncJob> _logger;
        private readonly string _logFilePath;
        private readonly Encoding _utf8NoBom = new UTF8Encoding(false);

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
                File.AppendAllText(_logFilePath, logLine, _utf8NoBom);
            }
            catch
            {
            }
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var msg = "!!! [MetacriticSync] SERVICE STARTED !!!";
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
                    var err = $"[MetacriticSync] Critical error: {ex.Message}";
                    _logger.LogError(ex, err);
                    LogToFile(err);
                }

                await Task.Delay(BatchInterval, stoppingToken);
            }
        }

        private async Task SyncMetacriticScoresAsync(CancellationToken stoppingToken)
        {
            List<int> gameIdsToSync;
            var now = DateTime.UtcNow;

            using (var scope = _serviceProvider.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();

                gameIdsToSync = await context.Games
                    .Where(g => g.Metacritic == null && !string.IsNullOrEmpty(g.Name))
                    .Where(g =>
                        g.MetacriticUrl == null ||
                        (g.MetacriticUrl == BuildStatusMarker(MetacriticService.StatusNoScore) && g.LastSyncedAt <= now - NoScoreRetryInterval) ||
                        (g.MetacriticUrl == BuildStatusMarker(MetacriticService.StatusNoResults) && g.LastSyncedAt <= now - NoResultsRetryInterval) ||
                        (g.MetacriticUrl == BuildStatusMarker(MetacriticService.StatusTimeout) && g.LastSyncedAt <= now - TransientRetryInterval) ||
                        (g.MetacriticUrl == BuildStatusMarker(MetacriticService.StatusHttpError) && g.LastSyncedAt <= now - TransientRetryInterval) ||
                        (g.MetacriticUrl == BuildStatusMarker(MetacriticService.StatusParseError) && g.LastSyncedAt <= now - TransientRetryInterval) ||
                        (g.MetacriticUrl == BuildStatusMarker(MetacriticService.StatusException) && g.LastSyncedAt <= now - TransientRetryInterval))
                    .OrderBy(g => g.LastSyncedAt)
                    .Take(30)
                    .Select(g => g.Id)
                    .ToListAsync(stoppingToken);
            }

            if (gameIdsToSync.Count == 0)
            {
                _logger.LogInformation("[MetacriticSync] No games eligible for sync right now.");
                LogToFile("[MetacriticSync] No games eligible for sync right now.");
                return;
            }

            LogToFile($"--- New batch started: {gameIdsToSync.Count} games ---");

            foreach (var gameId in gameIdsToSync)
            {
                if (stoppingToken.IsCancellationRequested)
                {
                    break;
                }

                using var scope = _serviceProvider.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();
                var metacriticService = scope.ServiceProvider.GetRequiredService<IMetacriticService>();

                var game = await context.Games.FindAsync(new object[] { gameId }, stoppingToken);
                if (game == null)
                {
                    continue;
                }

                try
                {
                    LogToFile($"Processing -> '{game.Name}'...");

                    var serviceTask = metacriticService.GetMetacriticScoreAsync(game.Name, game.Released);
                    var timeoutTask = Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
                    var completedTask = await Task.WhenAny(serviceTask, timeoutTask);

                    if (completedTask == timeoutTask)
                    {
                        throw new TimeoutException("No response within 30 seconds.");
                    }

                    var result = await serviceTask;
                    await ApplyResultAsync(context, game, result, stoppingToken);

                    await Task.Delay(TimeSpan.FromSeconds(Random.Shared.Next(5, 10)), stoppingToken);
                }
                catch (TimeoutException tEx)
                {
                    var timeMsg = $"TIMEOUT -> '{game.Name}': {tEx.Message}";
                    _logger.LogWarning(timeMsg);
                    LogToFile(timeMsg);

                    game.LastSyncedAt = DateTime.UtcNow;
                    game.MetacriticUrl = BuildStatusMarker(MetacriticService.StatusTimeout);
                    context.Entry(game).Property(x => x.LastSyncedAt).IsModified = true;
                    context.Entry(game).Property(x => x.MetacriticUrl).IsModified = true;
                    await context.SaveChangesAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    var errMsg = $"ERROR -> '{game.Name}': {ex.Message}";
                    _logger.LogError(errMsg);
                    LogToFile(errMsg);

                    game.LastSyncedAt = DateTime.UtcNow;
                    game.MetacriticUrl = BuildStatusMarker(MetacriticService.StatusException);
                    context.Entry(game).Property(x => x.LastSyncedAt).IsModified = true;
                    context.Entry(game).Property(x => x.MetacriticUrl).IsModified = true;
                    await context.SaveChangesAsync(stoppingToken);
                }
            }

            LogToFile("--- Batch completed ---");
        }

        private async Task ApplyResultAsync(GGHubDbContext context, GGHub.Core.Entities.Game game, MetacriticResult? result, CancellationToken stoppingToken)
        {
            var now = DateTime.UtcNow;

            if (result?.Score is int score)
            {
                game.Metacritic = score;
                game.MetacriticUrl = result.Url;
                game.LastSyncedAt = now;

                context.Entry(game).Property(x => x.Metacritic).IsModified = true;
                context.Entry(game).Property(x => x.MetacriticUrl).IsModified = true;
                context.Entry(game).Property(x => x.LastSyncedAt).IsModified = true;

                var successMsg = $"SUCCESS -> '{game.Name}': {score}";
                _logger.LogInformation(successMsg);
                LogToFile(successMsg);

                await context.SaveChangesAsync(stoppingToken);
                return;
            }

            var status = result?.DebugInfo ?? MetacriticService.StatusException;
            game.LastSyncedAt = now;
            game.MetacriticUrl = BuildStatusMarker(status);

            context.Entry(game).Property(x => x.LastSyncedAt).IsModified = true;
            context.Entry(game).Property(x => x.MetacriticUrl).IsModified = true;

            var message = status switch
            {
                MetacriticService.StatusNoScore => $"NO SCORE -> '{game.Name}'",
                MetacriticService.StatusNoResults => $"NO RESULTS -> '{game.Name}'",
                MetacriticService.StatusTimeout => $"RETRY LATER (timeout) -> '{game.Name}'",
                MetacriticService.StatusHttpError => $"RETRY LATER (http_error) -> '{game.Name}'",
                MetacriticService.StatusParseError => $"RETRY LATER (parse_error) -> '{game.Name}'",
                _ => $"RETRY LATER (exception) -> '{game.Name}'"
            };

            if (status == MetacriticService.StatusNoScore || status == MetacriticService.StatusNoResults)
            {
                _logger.LogInformation(message);
            }
            else
            {
                _logger.LogWarning(message);
            }

            LogToFile(message);
            await context.SaveChangesAsync(stoppingToken);
        }

        private static string BuildStatusMarker(string status)
        {
            return $"{StatusPrefix}{status}";
        }
    }
}
