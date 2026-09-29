using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Oyun Gundemi vitrininin ("One cikanlar") siralamasini besleyen hype skorunu yazar.
    ///
    /// Neden gerekti: vitrin TrendScore ile siralaniyordu ve TrendScore her guncel oyuna
    /// sabit yenilik primi verdigi icin hicbir sinyali olmayan indie oyunlar, o ay cikan
    /// buyuk yapimlarla ayni havuzda yarisiyordu. Hesabin kendisi HypeScoreCalculator'da;
    /// bu sinif yalnizca periyodu ve yazmayi yonetir. Worker'da kosar (Railway'de DEGIL).
    /// </summary>
    public class HypeScoreJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly HypeScoreSettings _settings;
        private readonly ILogger<HypeScoreJob> _logger;

        public HypeScoreJob(
            IServiceScopeFactory scopeFactory,
            IOptions<HypeScoreSettings> settings,
            ILogger<HypeScoreJob> logger)
        {
            _scopeFactory = scopeFactory;
            _settings = settings.Value;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_settings.Enabled)
            {
                _logger.LogInformation("[Hype] Kapali (Jobs:HypeScore:Enabled=false), job calismayacak.");
                return;
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RunOnceAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[Hype] Kosu hatayla bitti.");
                }

                await Task.Delay(TimeSpan.FromHours(_settings.RunIntervalHours), stoppingToken);
            }
        }

        private async Task RunOnceAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();
            var calculator = scope.ServiceProvider.GetRequiredService<HypeScoreCalculator>();

            var now = DateTime.UtcNow;

            // Pencere gundem sayfasinin gezilebildigi araliktir: gecen yilin basindan ileriye.
            // Tarihsiz (TBA) oyunlar da dahil; "Tarihi belli olmayanlar" bolumu onlari siraliyor.
            var results = await calculator.ComputeAsync(
                new HypeScoreCalculator.Options($"{now.Year - 1:D4}-01-01", null, IncludeUndated: true, UseStoredColumns: true),
                ct);

            var updates = results.Where(r => r.Changed).ToDictionary(r => r.Id);
            if (updates.Count == 0)
            {
                _logger.LogInformation("[Hype] Skorlar guncel, degisiklik yok.");
                return;
            }

            // Toplu guncelleme: tek tek SaveChanges uzak Postgres'te cok yavas olurdu.
            const int chunkSize = 500;
            foreach (var chunk in updates.Keys.Chunk(chunkSize))
            {
                ct.ThrowIfCancellationRequested();
                var ids = chunk.ToList();

                var entities = await context.Games.Where(g => ids.Contains(g.Id)).ToListAsync(ct);
                foreach (var entity in entities)
                {
                    var result = updates[entity.Id];
                    entity.HypeScore = result.Breakdown.Total;
                    entity.HypeScoreUpdatedAt = now;
                    entity.WikipediaTitle = result.WikipediaTitle;
                    entity.WikipediaViews30d = result.WikipediaViews30d;
                    entity.WikipediaViewsUpdatedAt = result.WikipediaViewsUpdatedAt;
                }

                try
                {
                    await context.SaveChangesAsync(ct);
                }
                catch (DbUpdateConcurrencyException ex)
                {
                    // TrendScoreJob ile ayni durum: CatalogDedupeJob paralel kosup kopya satirlari
                    // siliyor. Yalnizca silinen satirlar birakilir, parcanin geri kalani yazilir.
                    foreach (var entry in ex.Entries) entry.State = EntityState.Detached;

                    try
                    {
                        await context.SaveChangesAsync(ct);
                    }
                    catch (DbUpdateConcurrencyException)
                    {
                        _logger.LogInformation("[Hype] {Count} kayitlik parca yazilamadi, atlandi.", ids.Count);
                    }
                }
                finally
                {
                    context.ChangeTracker.Clear();
                }
            }

            _logger.LogInformation(
                "[Hype] {Count} oyunun hype skoru guncellendi ({Hyped} oyun vitrin esiginin ustunde).",
                updates.Count, results.Count(r => r.Breakdown.Total >= HypeScoring.HighlightFloor));
        }
    }
}
