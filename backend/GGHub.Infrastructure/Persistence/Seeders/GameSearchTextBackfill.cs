using GGHub.Core.Entities;
using GGHub.Core.Specifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Persistence.Seeders
{
    /// <summary>
    /// Game.SearchText'i bos ya da eski surumle uretilmis satirlari doldurur. Yeni ve adi degisen
    /// oyunlari DbContext zaten kayit sirasinda isler; bu yalniz mevcut katalog ve kural degisikligi
    /// (GameSearchKeys.Version arttiginda) icindir. Her acilista calisir, is yoksa tek sorguda biter.
    /// Bu sure icinde arama bozulmaz: SearchText bos satirlarda GameSearch ada ILIKE ile bakar.
    /// </summary>
    public static class GameSearchTextBackfill
    {
        private const int BatchSize = 1000;

        public static async Task RunAsync(IServiceProvider services, ILogger logger, CancellationToken ct)
        {
            var total = 0;
            var lastId = 0;
            try
            {
                while (!ct.IsCancellationRequested)
                {
                    using var scope = services.CreateScope();
                    var context = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();

                    var rows = await context.Games
                        .AsNoTracking()
                        .Where(g => g.Id > lastId
                            && (g.SearchText == null || !g.SearchText.StartsWith(GameSearchKeys.VersionPrefix)))
                        .OrderBy(g => g.Id)
                        .Select(g => new { g.Id, g.Name })
                        .Take(BatchSize)
                        .ToListAsync(ct);

                    if (rows.Count == 0) break;
                    lastId = rows[^1].Id;

                    foreach (var row in rows)
                    {
                        // Taslak varlik: yalniz SearchText guncellenir, Name dokunulmaz
                        // (DbContext'in yeniden uretme kapisi da bu yuzden atlar).
                        var stub = new Game { Id = row.Id, SearchText = GameSearchKeys.Build(row.Name) };
                        context.Games.Attach(stub);
                        context.Entry(stub).Property(g => g.SearchText).IsModified = true;
                    }

                    try
                    {
                        await context.SaveChangesAsync(ct);
                    }
                    catch (DbUpdateConcurrencyException)
                    {
                        // Bu arada silinen satir (CatalogDedupeJob) tum batch'i dusurur; tek tek yaz.
                        context.ChangeTracker.Clear();
                        foreach (var row in rows)
                        {
                            var text = GameSearchKeys.Build(row.Name);
                            await context.Games.Where(g => g.Id == row.Id)
                                .ExecuteUpdateAsync(s => s.SetProperty(g => g.SearchText, text), ct);
                        }
                    }
                    total += rows.Count;
                }

                if (total > 0) logger.LogInformation("GameSearchTextBackfill: {Count} oyunun arama metni uretildi.", total);
            }
            catch (OperationCanceledException)
            {
            }
            catch (Exception ex)
            {
                // Arama bu olmadan da calisir (ILIKE yedegi); acilisi asla dusurmez.
                logger.LogError(ex, "GameSearchTextBackfill yarida kaldi ({Count} satir islendi).", total);
            }
        }
    }
}
