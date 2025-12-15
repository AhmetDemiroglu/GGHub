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

        public MetacriticSyncJob(IServiceProvider serviceProvider, ILogger<MetacriticSyncJob> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("[MetacriticSync] Service started");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await SyncMetacriticScoresAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[MetacriticSync] Error during sync batch");
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

            _logger.LogInformation("[MetacriticSync] Processing batch of {Count} games", gameIdsToSync.Count);

            if (gameIdsToSync.Count == 0) return;

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

                            _logger.LogInformation("[MetacriticSync] SAVED DB -> '{GameName}': {Score}", game.Name, result.Score);
                        }
                        else
                        {
                            game.LastSyncedAt = DateTime.UtcNow;
                            await context.SaveChangesAsync(stoppingToken);

                            _logger.LogWarning("[MetacriticSync] Not found: '{GameName}'", game.Name);
                        }

                        await Task.Delay(TimeSpan.FromSeconds(Random.Shared.Next(5, 15)), stoppingToken);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError("[MetacriticSync] Failed processing game ID {Id}: {Message}", gameId, ex.Message);
                    }
                }
            }

            _logger.LogInformation("[MetacriticSync] Batch completed.");
        }
    }
}