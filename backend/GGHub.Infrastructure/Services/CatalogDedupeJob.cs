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

            // Tarama kapsami: son 14 ayin cikislari VE kaynak baglantisi olan (Steam/IGDB) tum
            // kayitlar. Yalnizca tarih penceresine bakan ilk surum, kopyanin DOGRU tarihli yarisi
            // pencere disinda kaldiginda esi bulamiyordu (olculdu: Palworld'un 2024-01-19 kaydi
            // taranmiyor, yalnizca bozuk 2026 kaydi goruluyordu). Kopyalar zaten Steam/IGDB
            // ingest'inden dogdugu icin bu kume dogru olan.
            // Ek kume: adi BIRDEN FAZLA kayitta gecen oyunlar. Tarih penceresi + kaynak
            // baglantisi olcutleri kopyanin bir yarisini disarida birakabiliyordu (olculdu:
            // Palworld'un dogru 2024 kaydi ne pencereye ne de baglanti kumesine giriyordu,
            // dolayisiyla es bulunamiyor ve kopya hic birlesmiyordu).
            var duplicateNames = await context.Games
                .GroupBy(g => g.Name.ToLower())
                .Where(grp => grp.Count() > 1)
                .Select(grp => grp.Key)
                .ToListAsync(ct);

            var since = DateTime.UtcNow.AddMonths(-14).ToString("yyyy-MM-dd");
            var candidates = await context.Games
                .Where(g => (g.Released != null && string.Compare(g.Released, since) >= 0)
                    || g.SteamAppId != null
                    || g.IgdbId != null
                    || duplicateNames.Contains(g.Name.ToLower()))
                .Select(g => new { g.Id, g.Name, g.Released, g.RawgId, g.SteamAppId, g.IgdbId,
                                   g.BackgroundImage, g.Metacritic, g.IgdbRating, g.RawgAdded, g.DescriptionTr })
                .ToListAsync(ct);

            // Gruplama ADA gore; yil ayrimi BILEREK kaldirildi. Yil anahtara dahilken bozuk
            // tarihli kopyalar ayri gruplara dusuyor ve hic birlesmiyordu (olculdu: Palworld
            // hem 2024-01-19 hem 2026-07-10 satiriyla katalogda duruyordu). Ayni isimli farkli
            // oyunlar (remake'ler) icin koruma asagida: yil farki 4'ten buyukse ve HER IKI kayit
            // da kaynak baglantisi tasiyorsa birlestirilmez.
            var groups = candidates
                .GroupBy(g => GameTitleMatcher.Normalize(g.Name))
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

                // Asil kayit: en cok kaynak baglantisi + en zengin veri. Esitlikte ADI TEMIZ
                // olan kazanir: "EA Sports FC 27" kullaniciya "EA SPORTS FC(tm) 27"den iyi
                // gorunur ve arama sonuclarinda daha okunakli.
                var ordered = group
                    .OrderByDescending(g => (g.RawgId > 0 ? 4 : 0) + (g.SteamAppId != null ? 2 : 0) + (g.IgdbId != null ? 2 : 0))
                    .ThenByDescending(g => g.DescriptionTr != null ? 1 : 0)
                    .ThenByDescending(g => g.BackgroundImage != null ? 1 : 0)
                    .ThenBy(g => g.Name.Any(c => c == '™' || c == '®') ? 1 : 0)
                    .ThenByDescending(g => g.Metacritic ?? 0)
                    .ThenByDescending(g => g.IgdbRating ?? 0)
                    .ThenByDescending(g => g.RawgAdded ?? 0)
                    .ToList();

                var primary = ordered[0];
                foreach (var duplicate in ordered.Skip(1))
                {
                    // Remake koruması: "Resident Evil 2" (1998) ile remake'i (2019) ayni isimde
                    // ama FARKLI oyunlardir. Ikisi de kendi kaynak baglantisini tasiyor ve arada
                    // 4 yildan fazla varsa birlestirme; bozuk tarihli kopyalarda ise taraflardan
                    // biri genelde baglantisizdir ve birlestirme dogru olur.
                    if (IsLikelyDifferentGame(primary, duplicate)) { skipped++; continue; }

                    if (await TryMergeAsync(context, primary.Id, duplicate.Id, ct)) merged++;
                    else skipped++;
                }
            }

            _logger.LogInformation("[Dedupe] {Groups} grup islendi: {Merged} kopya birlestirildi, {Skipped} atlandi.",
                groups.Count, merged, skipped);

            await FixLegacyPlatformSlugsAsync(context, ct);
            await CleanTrademarkSymbolsAsync(context, ct);
            await RepairTruncatedPlatformsAsync(context, ct);
        }

        /// <summary>
        /// IGDB zenginlestirmesinin bir surumunde platform listesi BIRLESTIRILMEK yerine
        /// UZERINE YAZILIYORDU; cok platformlu oyunlar tek platforma dustu (olculdu: Elden Ring
        /// yalnizca "switch-2" kaldi). Kod duzeltildi, bu adim hasarli satirlari onarir:
        /// tek platformu yeni nesil konsol olan ama coklu platform sinyali tasiyan (RAWG'dan
        /// gelmis) kayitlarin platformlari IGDB'den yeniden cekilsin diye IgdbCheckedAt sifirlanir.
        /// </summary>
        private async Task RepairTruncatedPlatformsAsync(GGHubDbContext context, CancellationToken ct)
        {
            // Tek elemanli platform listesi + IGDB baglantisi olan kayitlar supheli.
            var suspects = await context.Games
                .Where(g => g.IgdbId != null
                    && g.PlatformsJson != null
                    && (g.PlatformsJson == "[{\"Name\":\"Switch 2\",\"Slug\":\"nintendo-switch\"}]"
                        || g.PlatformsJson.Contains("switch-2")))
                .Take(300)
                .ToListAsync(ct);

            if (suspects.Count == 0) return;

            foreach (var game in suspects)
            {
                // Yalnizca "yeniden kontrol et" isareti konur; PlatformsJson SILINMEZ.
                // Silmek, IGDB tekrar dolduramazsa oyunu platformsuz birakirdi.
                game.IgdbCheckedAt = null;
            }

            await context.SaveChangesAsync(ct);
            _logger.LogInformation("[Dedupe] {Count} satirda kirpilmis platform listesi onarim icin sifirlandi.", suspects.Count);
        }

        /// <summary>
        /// Adlardaki (tm)/(R)/(C) isaretlerini temizler. Steam bu isaretleri adin parcasi olarak
        /// veriyor ("EA SPORTS FC(tm) 27"); arama sonuclarinda ve kartlarda okunaksiz duruyor.
        /// Slug DEGISMEZ, yani mevcut linkler bozulmaz.
        /// </summary>
        private async Task CleanTrademarkSymbolsAsync(GGHubDbContext context, CancellationToken ct)
        {
            var dirty = await context.Games
                .Where(g => g.Name.Contains("™") || g.Name.Contains("®") || g.Name.Contains("©"))
                .Take(500)
                .ToListAsync(ct);

            if (dirty.Count == 0) return;

            foreach (var game in dirty)
            {
                game.Name = game.Name
                    .Replace("™", string.Empty)
                    .Replace("®", string.Empty)
                    .Replace("©", string.Empty)
                    .Replace("  ", " ")
                    .Trim();
            }

            await context.SaveChangesAsync(ct);
            _logger.LogInformation("[Dedupe] {Count} oyun adindan marka isareti temizlendi.", dirty.Count);
        }

        /// <summary>
        /// Iki JSON listesini Slug'a gore tekillestirerek birlestirir (platformlar, turler).
        /// Bozuk JSON gelirse dolu olani aynen korur; veri kaybetmemek onceliklidir.
        /// </summary>
        private static string? MergeJsonLists(string? primaryJson, string? duplicateJson)
        {
            if (string.IsNullOrEmpty(duplicateJson)) return primaryJson;
            if (string.IsNullOrEmpty(primaryJson)) return duplicateJson;

            try
            {
                var a = System.Text.Json.JsonSerializer.Deserialize<List<NamedSlug>>(primaryJson) ?? new();
                var b = System.Text.Json.JsonSerializer.Deserialize<List<NamedSlug>>(duplicateJson) ?? new();

                var merged = a.Concat(b)
                    .Where(x => !string.IsNullOrWhiteSpace(x.Slug))
                    .GroupBy(x => x.Slug!, StringComparer.OrdinalIgnoreCase)
                    .Select(g => g.First())
                    .ToList();

                return merged.Count == 0 ? primaryJson : System.Text.Json.JsonSerializer.Serialize(merged);
            }
            catch
            {
                return primaryJson;
            }
        }

        private sealed class NamedSlug
        {
            public string? Name { get; set; }
            public string? Slug { get; set; }
        }

        /// <summary>
        /// IGDB'nin kendi platform slug'lariyla ("win", "series-x", "ps5") yazilmis eski satirlari
        /// katalog slug'larina ("pc", "xbox-series-x", "playstation5") cevirir. Harita sonradan
        /// eklendigi icin o satirlarda platform ikonlari hic gorunmuyordu.
        /// </summary>
        private async Task FixLegacyPlatformSlugsAsync(GGHubDbContext context, CancellationToken ct)
        {
            var legacy = await context.Games
                .Where(g => g.PlatformsJson != null
                    && (g.PlatformsJson.Contains("\"win\"")
                        || g.PlatformsJson.Contains("\"series-x\"")
                        || g.PlatformsJson.Contains("\"ps5\"")
                        || g.PlatformsJson.Contains("\"ps4--1\"")
                        || g.PlatformsJson.Contains("\"xboxone\"")))
                .Take(500)
                .ToListAsync(ct);

            if (legacy.Count == 0) return;

            foreach (var game in legacy)
            {
                game.PlatformsJson = game.PlatformsJson!
                    .Replace("\"Slug\":\"win\"", "\"Slug\":\"pc\"")
                    .Replace("\"Slug\":\"series-x\"", "\"Slug\":\"xbox-series-x\"")
                    .Replace("\"Slug\":\"series-x-s\"", "\"Slug\":\"xbox-series-x\"")
                    .Replace("\"Slug\":\"ps5\"", "\"Slug\":\"playstation5\"")
                    .Replace("\"Slug\":\"ps4--1\"", "\"Slug\":\"playstation4\"")
                    .Replace("\"Slug\":\"ps4\"", "\"Slug\":\"playstation4\"")
                    .Replace("\"Slug\":\"xboxone\"", "\"Slug\":\"xbox-one\"")
                    .Replace("\"Slug\":\"switch-2\"", "\"Slug\":\"nintendo-switch\"")
                    .Replace("\"Slug\":\"switch2\"", "\"Slug\":\"nintendo-switch\"")
                    .Replace("\"Slug\":\"switch\"", "\"Slug\":\"nintendo-switch\"")
                    .Replace("\"Slug\":\"mac\"", "\"Slug\":\"macos\"");
            }

            await context.SaveChangesAsync(ct);
            _logger.LogInformation("[Dedupe] {Count} satirda platform slug'lari duzeltildi.", legacy.Count);
        }

        /// <summary>
        /// Ayni isimli iki kaydin GERCEKTEN farkli oyunlar olma ihtimali (remake/yeniden yapim).
        /// Olcut: her ikisinde de gercek bir kaynak baglantisi var (RAWG id pozitif ya da Steam/IGDB
        /// id dolu) VE cikis yillari 4'ten fazla ayrik. Bozuk tarihten dogan kopyalarda taraflardan
        /// biri genelde tek kaynakli oldugu icin bu koruma devreye girmez.
        /// </summary>
        private static bool IsLikelyDifferentGame(dynamic a, dynamic b)
        {
            int? YearOf(string? released) =>
                released != null && released.Length >= 4 && int.TryParse(released[..4], out var y) ? y : null;

            var ya = YearOf(a.Released);
            var yb = YearOf(b.Released);
            if (ya == null || yb == null) return false;
            if (Math.Abs(ya.Value - yb.Value) <= 4) return false;

            bool Linked(dynamic g) => g.RawgId > 0 && (g.SteamAppId != null || g.IgdbId != null);
            return Linked(a) && Linked(b);
        }

        /// <summary>
        /// Kopyanin kullanici baglarini asil kayda tasiyip kopyayi siler. Cakisma olursa
        /// (kullanici ayni oyunu iki kayitla listelemis) kopya bag silinir, asil korunur.
        /// </summary>
        private async Task<bool> TryMergeAsync(GGHubDbContext context, int primaryId, int duplicateId, CancellationToken ct)
        {
            // DIKKAT: Worker'in DbContext'i EnableRetryOnFailure ile kurulu. Boyle bir baglantida
            // BeginTransactionAsync dogrudan cagrilamaz ("execution strategy does not support
            // user-initiated transactions") ve ilk surumde TUM birlestirmeler bu yuzden sessizce
            // basarisiz oldu. Transaction, execution strategy'nin ICINDE acilmali.
            var strategy = context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () => await MergeCoreAsync(context, primaryId, duplicateId, ct));
        }

        private async Task<bool> MergeCoreAsync(GGHubDbContext context, int primaryId, int duplicateId, CancellationToken ct)
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

                // Platform ve turler BIRLESTIRILIR, uzerine yazilmaz: Steam kaydinda yalnizca
                // "pc", IGDB kaydinda PS5/Xbox/Switch bulunuyor. Uzerine yazma yapilsaydi
                // kopya silinince o platformlar tamamen kaybolurdu.
                primary.PlatformsJson = MergeJsonLists(primary.PlatformsJson, duplicate.PlatformsJson);
                primary.GenresJson = MergeJsonLists(primary.GenresJson, duplicate.GenresJson);
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
                // katalogda kopya kalmasi yeglenir. Degisiklikler geri alindigi icin izleyen
                // kayitlar temizlenmeli, yoksa sonraki birlestirme onlari tekrar yazmaya calisir.
                context.ChangeTracker.Clear();
                _logger.LogWarning(ex, "[Dedupe] Birlestirilemedi (primary={Primary}, duplicate={Duplicate})", primaryId, duplicateId);
                return false;
            }
        }
    }
}
