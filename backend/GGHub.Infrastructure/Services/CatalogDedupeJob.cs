using GGHub.Core.Entities;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Katalog tekillestirme. Uc kaynak (RAWG, Steam, IGDB) ayni oyunu farkli yaziyor:
    ///   "EA SPORTS FC(tm) 27" | "EA Sports FC 27" | "EA Sports FC 27: Ultimate Edition"
    /// Ingest tarafi artik GameTitleMatcher ile bunlari ayni satira dusuruyor, ama daha once
    /// olusmus kopyalar DB'de duruyor ve arama/kesfette ucer dorder kayit olarak gorunuyor.
    ///
    /// Bu job normalize edilmis ada gore gruplar; her gruptan EN ZENGIN kaydi "asil" secer,
    /// digerlerinin kullanici baglarini (review, liste, wishlist) asil kayda TASIR ve kopyayi
    /// siler. Kullanici verisi ASLA kaybolmaz; tasima yapilamayan kayit silinmez, loglanir.
    /// </summary>
    public class CatalogDedupeJob : BackgroundService
    {
        private const int BatchSize = 400;

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<CatalogDedupeJob> _logger;

        public CatalogDedupeJob(IServiceScopeFactory scopeFactory, ILogger<CatalogDedupeJob> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Acilista bir kez, sonra 6 saatte bir. Ingest tarafi duzeltildigi icin sonraki
            // kosularda genelde is cikmaz.
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
                    _logger.LogError(ex, "[Dedupe] Kosu hatayla bitti.");
                }

                await Task.Delay(TimeSpan.FromHours(6), stoppingToken);
            }
        }

        private async Task RunOnceAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();

            // Yalnizca son bir yilin cikislari taranir: eski katalog zaten RAWG'dan tek kaynakli
            // geldi ve orada kopya sorunu yok; tarama maliyeti boylece kucuk kaliyor.
            var since = DateTime.UtcNow.AddMonths(-14).ToString("yyyy-MM-dd");
            var candidates = await context.Games
                .Where(g => g.Released != null && string.Compare(g.Released, since) >= 0)
                .Select(g => new { g.Id, g.Name, g.Released, g.RawgId, g.SteamAppId, g.IgdbId,
                                   g.BackgroundImage, g.Metacritic, g.IgdbRating, g.RawgAdded, g.DescriptionTr })
                .ToListAsync(ct);

            var groups = candidates
                .GroupBy(g => (GameTitleMatcher.Normalize(g.Name), g.Released?[..4] ?? "?"))
                .Where(grp => grp.Count() > 1)
                .Take(BatchSize)
                .ToList();

            if (groups.Count == 0)
            {
                _logger.LogInformation("[Dedupe] Kopya bulunamadi ({Scanned} kayit tarandi).", candidates.Count);
                return;
            }

            var merged = 0;
            var skipped = 0;

            foreach (var group in groups)
            {
                ct.ThrowIfCancellationRequested();

                // Asil kayit: en cok kaynak baglantisi + en zengin veri.
                var ordered = group
                    .OrderByDescending(g => (g.RawgId > 0 ? 4 : 0) + (g.SteamAppId != null ? 2 : 0) + (g.IgdbId != null ? 2 : 0))
                    .ThenByDescending(g => g.DescriptionTr != null ? 1 : 0)
                    .ThenByDescending(g => g.BackgroundImage != null ? 1 : 0)
                    .ThenByDescending(g => g.Metacritic ?? 0)
                    .ThenByDescending(g => g.IgdbRating ?? 0)
                    .ThenByDescending(g => g.RawgAdded ?? 0)
                    .ToList();

                var primary = ordered[0];
                foreach (var duplicate in ordered.Skip(1))
                {
                    if (await TryMergeAsync(context, primary.Id, duplicate.Id, ct)) merged++;
                    else skipped++;
                }
            }

            _logger.LogInformation("[Dedupe] {Groups} grup islendi: {Merged} kopya birlestirildi, {Skipped} atlandi.",
                groups.Count, merged, skipped);
        }

        /// <summary>
        /// Kopyanin kullanici baglarini asil kayda tasiyip kopyayi siler. Cakisma olursa
        /// (kullanici ayni oyunu iki kayitla listelemis) kopya bag silinir, asil korunur.
        /// </summary>
        private async Task<bool> TryMergeAsync(GGHubDbContext context, int primaryId, int duplicateId, CancellationToken ct)
        {
            await using var tx = await context.Database.BeginTransactionAsync(ct);
            try
            {
                // Reviews: ayni kullanicinin asil kayitta incelemesi varsa kopya inceleme silinir.
                var reviews = await context.Reviews.Where(r => r.GameId == duplicateId).ToListAsync(ct);
                foreach (var review in reviews)
                {
                    var exists = await context.Reviews.AnyAsync(r => r.GameId == primaryId && r.UserId == review.UserId, ct);
                    if (exists) context.Reviews.Remove(review);
                    else review.GameId = primaryId;
                }

                // Liste/wishlist baglari
                var listGames = await context.UserListGames.Where(x => x.GameId == duplicateId).ToListAsync(ct);
                foreach (var item in listGames)
                {
                    var exists = await context.UserListGames.AnyAsync(x => x.GameId == primaryId && x.UserListId == item.UserListId, ct);
                    if (exists) context.UserListGames.Remove(item);
                    else item.GameId = primaryId;
                }

                await context.SaveChangesAsync(ct);

                var duplicate = await context.Games.FirstOrDefaultAsync(g => g.Id == duplicateId, ct);
                if (duplicate == null) { await tx.RollbackAsync(ct); return false; }

                // Kopyada olup asilda olmayan kaynak baglantilari asila tasinir (veri kaybi olmasin).
                var primary = await context.Games.FirstAsync(g => g.Id == primaryId, ct);
                if (primary.SteamAppId == null && duplicate.SteamAppId != null) primary.SteamAppId = duplicate.SteamAppId;
                if (primary.IgdbId == null && duplicate.IgdbId != null) primary.IgdbId = duplicate.IgdbId;
                if (primary.IgdbRating == null && duplicate.IgdbRating != null)
                {
                    primary.IgdbRating = duplicate.IgdbRating;
                    primary.IgdbRatingCount = duplicate.IgdbRatingCount;
                }
                if (string.IsNullOrEmpty(primary.BackgroundImage)) primary.BackgroundImage = duplicate.BackgroundImage;
                if (string.IsNullOrEmpty(primary.Description)) primary.Description = duplicate.Description;
                if (string.IsNullOrEmpty(primary.PlatformsJson)) primary.PlatformsJson = duplicate.PlatformsJson;
                if (string.IsNullOrEmpty(primary.GenresJson)) primary.GenresJson = duplicate.GenresJson;
                if ((primary.RawgAdded ?? 0) < (duplicate.RawgAdded ?? 0)) primary.RawgAdded = duplicate.RawgAdded;

                // Kopyanin kaynak kolonlarini bosalt: unique index'ler asila tasima sirasinda patlamasin.
                duplicate.SteamAppId = null;
                duplicate.IgdbId = null;
                await context.SaveChangesAsync(ct);

                context.Games.Remove(duplicate);
                await context.SaveChangesAsync(ct);

                await tx.CommitAsync(ct);
                return true;
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync(ct);
                // Bilinmeyen bir FK varsa kopya silinmez: kullanici verisi kaybetmektense
                // katalogda kopya kalmasi yeglenir.
                _logger.LogWarning(ex, "[Dedupe] Birlestirilemedi (primary={Primary}, duplicate={Duplicate})", primaryId, duplicateId);
                return false;
            }
        }
    }
}
