using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Localization;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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

        // 14 gun degil 180 gun: kuyruk tarandiktan sonra ~25 bin puansiz oyun kaliyor ve bunlarin
        // buyuk cogunlugu Metacritic'te hic incelenmemis indie oyunlar. 14 gunde bir hepsini
        // yeniden taramak sonsuza kadar suren kalici bir yuk demekti. Metacritic bir oyuna
        // cikistan aylar sonra puan vermez; 180 gun gecikmeli incelemeleri yakalamaya yeter.
        private static readonly TimeSpan NoScoreRetryInterval = TimeSpan.FromDays(180);
        private static readonly TimeSpan NoResultsRetryInterval = TimeSpan.FromDays(180);
        private static readonly TimeSpan TransientRetryInterval = TimeSpan.FromMinutes(30);

        // Ozet log'un siklik siniri. Ozet tum tabloyu taramak zorunda; dakikada bir degil saatte bir.
        private static readonly TimeSpan SnapshotInterval = TimeSpan.FromHours(1);
        private DateTime _lastSnapshotAt = DateTime.MinValue;

        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<MetacriticSyncJob> _logger;
        private readonly string _logFilePath;
        private readonly bool _enabled;
        private readonly Encoding _utf8NoBom = new UTF8Encoding(false);

        public MetacriticSyncJob(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger<MetacriticSyncJob> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _logFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "metacritic_sync.txt");

            // Bayrak kontrolu job'in ICINDE. Eskiden Program.cs'te "if (metacriticJobEnabled)"
            // olarak duruyordu; kayit yeri Worker'a tasininca kontrol tamamen kaybolmustu ve job
            // Enabled=false iken calisip prod DB'ye yaziyordu. Varsayilan false.
            _enabled = configuration.GetValue<bool>("Jobs:MetacriticSync:Enabled");
        }

        // Dosya sinirsiz buyuyordu ve rotasyonu yoktu; job aylarca calisinca diski dolduruyordu.
        private const long MaxLogFileBytes = 5 * 1024 * 1024;

        private void LogToFile(string message)
        {
            try
            {
                var info = new FileInfo(_logFilePath);
                if (info.Exists && info.Length > MaxLogFileBytes)
                {
                    // Tek kusaklik rotasyon: mevcut .txt -> .1.txt, yenisi bastan baslar.
                    var rolled = Path.ChangeExtension(_logFilePath, ".1.txt");
                    File.Delete(rolled);
                    File.Move(_logFilePath, rolled);
                }

                var logLine = $"[{DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}] {message}{Environment.NewLine}";
                File.AppendAllText(_logFilePath, logLine, _utf8NoBom);
            }
            catch
            {
                // Salt-okunur dosya sisteminde (container) yazamayiz; Serilog zaten ayni mesaji aliyor.
            }
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_enabled)
            {
                _logger.LogInformation("[MetacriticSync] Job kapali.");
                return;
            }

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

                if (now - _lastSnapshotAt >= SnapshotInterval)
                {
                    _lastSnapshotAt = now;
                    await LogSnapshotAsync(context, gameIdsToSync.Count, stoppingToken);
                }
            }

            if (gameIdsToSync.Count == 0)
            {
                const string noEligibleMessage = "[MetacriticSync] No games eligible for sync right now.";
                _logger.LogInformation(noEligibleMessage);
                LogToFile(noEligibleMessage);
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
                        throw new TimeoutException(AppText.Get("metacritic.noResponse30Seconds"));
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

        /// <summary>
        /// Ilerleme ozeti. Eskiden bu ozet icin HER DAKIKA yedi ayri CountAsync calisiyordu ve
        /// hicbirinin index'i yoktu: prod'da olculdu, her biri Seq Scan + ~1794 buffer + ~12 ms.
        /// Yani dakikada ~112 MB, gunde ~161 GB Postgres I/O, tek bir log satiri ugruna; islevsel
        /// katkisi sifirdi. Simdi tek GROUP BY ve saatte bir: 10.080 tarama/gun yerine 24.
        /// </summary>
        private async Task LogSnapshotAsync(GGHubDbContext context, int eligibleNow, CancellationToken stoppingToken)
        {
            // Puani olan oyunlarin gercek URL'leri tek kovada toplansin, yoksa 1700+ satir donerdi.
            var buckets = await context.Games
                .GroupBy(g => g.Metacritic != null ? "with_score" : (g.MetacriticUrl ?? "never_tried"))
                .Select(grp => new { Status = grp.Key, Count = grp.Count() })
                .ToListAsync(stoppingToken);

            var total = buckets.Sum(b => b.Count);
            int Bucket(string key) => buckets.FirstOrDefault(b => b.Status == key)?.Count ?? 0;

            var withScore = Bucket("with_score");
            var neverTried = Bucket("never_tried");
            var noScore = Bucket(BuildStatusMarker(MetacriticService.StatusNoScore));
            var noResults = Bucket(BuildStatusMarker(MetacriticService.StatusNoResults));
            var transient = buckets
                .Where(b => b.Status.StartsWith(StatusPrefix, StringComparison.Ordinal)
                            && b.Status != BuildStatusMarker(MetacriticService.StatusNoScore)
                            && b.Status != BuildStatusMarker(MetacriticService.StatusNoResults))
                .Sum(b => b.Count);

            var summary =
                $"[MetacriticSync] Snapshot | Total: {total}, WithScore: {withScore}, NeverTried: {neverTried}, " +
                $"NoScoreCooldown: {noScore}, NoResultsCooldown: {noResults}, TransientCooldown: {transient}, " +
                $"EligibleNow: {eligibleNow}";

            _logger.LogInformation(summary);
            LogToFile(summary);
        }

        private static string BuildStatusMarker(string status)
        {
            return $"{StatusPrefix}{status}";
        }
    }
}
