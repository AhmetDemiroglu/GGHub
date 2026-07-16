using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Core.Specifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Persistence.Seeders
{
    /// <summary>
    /// User.UsernameNormalized backfill'i + mevcut kullanici adi carpismalarinin temizligi.
    ///
    /// Neden gerekli: production'da gorsel olarak neredeyse ayni iki hesap var
    /// ("ahmetdemiroglu" ve OAuth'un urettigi "ahmetdemiroğlu"). Username ayni zamanda bir
    /// giris tanimlayicisi oldugu icin bu bir guvenlik problemi. Normalize anahtara unique
    /// kisiti koyabilmemiz icin ONCE bu carpismalarin temizlenmesi sart.
    ///
    /// Idempotent: is bittikten sonraki acilislarda iki adet indeksli kontrol sorgusu
    /// calisir ve hicbir veri yuklenmeden cikilir.
    ///
    /// DIKKAT: yeniden adlandirma production verisi uzerinde GERI ALINAMAZ bir islemdir.
    /// Bu yuzden her rename Information seviyesinde loglanir (Railway loglarindan denetlenebilir)
    /// ve ayrica AuditLogs tablosuna yazilir.
    /// </summary>
    public static class UsernameNormalizationSeeder
    {
        public static async Task SeedAsync(GGHubDbContext context, ILogger logger, IAuditService? auditService = null)
        {
            try
            {
                // --- 1) Ucuz on kontrol: is var mi? ---
                // Backfill edilmemis satir var mi?
                var hasUnbackfilled = await context.Users.AnyAsync(u => u.UsernameNormalized == null);

                // Backfill EDILMIS satirlar arasinda carpisma kalmis mi? (IX_Users_UsernameNormalized
                // uzerinden gruplu tarama; veri yuklemez.)
                var hasCollisions = await context.Users
                    .Where(u => u.UsernameNormalized != null)
                    .GroupBy(u => u.UsernameNormalized)
                    .AnyAsync(g => g.Count() > 1);

                if (!hasUnbackfilled && !hasCollisions)
                {
                    // Normal durum: yapacak is yok, cik.
                    return;
                }

                logger.LogInformation(
                    "[UsernameNormalization] Basliyor. Backfill gerekli: {HasUnbackfilled}, carpisma var: {HasCollisions}",
                    hasUnbackfilled, hasCollisions);

                // --- 2) Tum kullanicilari yukle ---
                // Silinmis (IsDeleted) kullanicilar DAHIL: onlarin kullanici adlari da unique
                // index'te yer kaplamaya devam ediyor, dolayisiyla carpismaya dahiller.
                var users = await context.Users.ToListAsync();
                if (users.Count == 0)
                {
                    return;
                }

                // --- 3) Anahtarlari hesapla ve grupla ---
                var computed = users
                    .Select(u => new { User = u, Key = UsernameNormalizer.Normalize(u.Username) })
                    .ToList();

                var groups = computed.GroupBy(x => x.Key).ToList();

                // Halihazirda kullanimda olan (veya bu kosuda tahsis edilen) tum anahtarlar.
                // Yeni ad ararken buna bakiyoruz.
                var takenKeys = new HashSet<string>(
                    computed.Select(x => x.Key).Where(k => k.Length > 0),
                    StringComparer.Ordinal);

                // Carpisan gruplardaki kullanicilarin icerik sayilari (keeper secimi icin).
                var collidedIds = groups
                    .Where(g => g.Count() > 1)
                    .SelectMany(g => g.Select(x => x.User.Id))
                    .ToList();

                var contentCounts = await GetContentCountsAsync(context, collidedIds);

                var renames = new List<(User User, string OldUsername, string NewUsername)>();
                var backfilledCount = 0;

                foreach (var group in groups)
                {
                    var key = group.Key;

                    // --- Ozel durum: anahtari tamamen eriyen satirlar ---
                    // Ornegin OAuth'un urettigi "中文" gibi bir kullanici adi ASCII'ye
                    // katlandiginda geriye hicbir sey kalmaz. Bos anahtar hem benzersizlik
                    // hem de arama icin kullanilamaz (bos anahtarla yapilan bir sorgu bu
                    // hesaplara eslesirdi), bu yuzden bu satirlar "user" tabanindan yeni bir
                    // ad alir. Grup buyuklugunden bagimsiz olarak her biri yeniden adlandirilir.
                    if (key.Length == 0)
                    {
                        foreach (var entry in group)
                        {
                            var freshKey = NextFreeKey("user", takenKeys);
                            var oldUsername = entry.User.Username;
                            entry.User.Username = freshKey;
                            entry.User.UsernameNormalized = freshKey;
                            entry.User.UpdatedAt = DateTime.UtcNow;
                            renames.Add((entry.User, oldUsername, freshKey));
                        }
                        continue;
                    }

                    // --- Tekil grup: sadece anahtari yaz, kullanici adina dokunma ---
                    if (group.Count() == 1)
                    {
                        var only = group.First();
                        if (only.User.UsernameNormalized != key)
                        {
                            only.User.UsernameNormalized = key;
                            backfilledCount++;
                        }
                        continue;
                    }

                    // --- Carpisma: keeper'i sec ---
                    // Sira: once PasswordHash sahibi (elle kayit olmus hesap), sonra daha ESKI
                    // CreatedAt, sonra daha cok icerik. Son kirici Id: ayni degerlerde secim
                    // deterministik kalsin (aksi halde yeniden kosuda farkli hesap kazanabilirdi).
                    var ordered = group
                        .OrderByDescending(x => x.User.PasswordHash != null)
                        .ThenBy(x => x.User.CreatedAt)
                        .ThenByDescending(x => contentCounts.TryGetValue(x.User.Id, out var c) ? c : 0)
                        .ThenBy(x => x.User.Id)
                        .ToList();

                    var keeper = ordered.First();

                    logger.LogInformation(
                        "[UsernameNormalization] Carpisma '{Key}': {Count} hesap. Keeper = UserId {KeeperId} " +
                        "('{KeeperUsername}', sifreli: {HasPassword}, olusturma: {CreatedAt:o}, icerik: {Content})",
                        key, ordered.Count, keeper.User.Id, keeper.User.Username,
                        keeper.User.PasswordHash != null, keeper.User.CreatedAt,
                        contentCounts.TryGetValue(keeper.User.Id, out var kc) ? kc : 0);

                    // Keeper adini korur, temiz anahtari alir.
                    keeper.User.UsernameNormalized = key;

                    // Kaybedenler yeniden adlandirilir: {anahtar}{n}, n = 2'den baslar.
                    foreach (var loser in ordered.Skip(1))
                    {
                        var newKey = NextFreeKey(key, takenKeys);
                        var oldUsername = loser.User.Username;

                        loser.User.Username = newKey;
                        loser.User.UsernameNormalized = newKey;
                        loser.User.UpdatedAt = DateTime.UtcNow;

                        renames.Add((loser.User, oldUsername, newKey));
                    }
                }

                await context.SaveChangesAsync();

                // --- 4) Denetim izi ---
                foreach (var (user, oldUsername, newUsername) in renames)
                {
                    logger.LogInformation(
                        "[UsernameNormalization] RENAME UserId {UserId}: '{OldUsername}' -> '{NewUsername}'",
                        user.Id, oldUsername, newUsername);
                }

                if (auditService != null)
                {
                    foreach (var (user, oldUsername, newUsername) in renames)
                    {
                        try
                        {
                            // ProfileService.UpdateProfileAsync ile ayni desen: actor == subject.
                            // Sistem kaynakli bir degisiklik oldugu icin ayri bir admin actor yok;
                            // AuditLog.UserId'de FK bulunmadigindan sahte bir id yazmak yerine
                            // etkilenen kullanicinin kendi id'sini kullaniyoruz.
                            await auditService.LogAsync(
                                user.Id,
                                "UsernameNormalizationRename",
                                "User",
                                user.Id,
                                new { OldUsername = oldUsername, NewUsername = newUsername, Reason = "Username collision remediation" });
                        }
                        catch (Exception ex)
                        {
                            // Denetim yazimi asil islemi bozmamali; rename zaten log'a dusuldu.
                            logger.LogError(ex,
                                "[UsernameNormalization] Audit kaydi yazilamadi (UserId {UserId})", user.Id);
                        }
                    }
                }

                logger.LogInformation(
                    "[UsernameNormalization] Tamamlandi. Backfill edilen: {Backfilled}, yeniden adlandirilan: {Renamed}, toplam kullanici: {Total}",
                    backfilledCount, renames.Count, users.Count);
            }
            catch (Exception ex)
            {
                // GamificationSeeder / Program.cs durusuyla ayni: seeder hatasi uygulamanin
                // ayaga kalkmasini engellememeli.
                logger.LogError(ex, "[UsernameNormalization] Seeder basarisiz oldu.");
            }
        }

        /// <summary>
        /// {baseKey}{n} formunda, n = 2'den baslayarak bos olan ilk anahtari bulur ve
        /// bulundugu anda tahsis edilmis sayar.
        /// </summary>
        private static string NextFreeKey(string baseKey, HashSet<string> takenKeys)
        {
            for (var n = 2; ; n++)
            {
                var candidate = $"{baseKey}{n}";
                if (takenKeys.Add(candidate))
                {
                    return candidate;
                }
            }
        }

        /// <summary>
        /// Keeper heuristigi icin icerik sayilari: inceleme + liste + liste yorumu + inceleme yorumu.
        /// Yalnizca carpisan hesaplar icin ve UserId'ye gore gruplanmis 4 sorgu ile hesaplanir.
        /// </summary>
        private static async Task<Dictionary<int, int>> GetContentCountsAsync(GGHubDbContext context, List<int> userIds)
        {
            var totals = new Dictionary<int, int>();
            if (userIds.Count == 0)
            {
                return totals;
            }

            void Merge(IEnumerable<KeyValuePair<int, int>> counts)
            {
                foreach (var kv in counts)
                {
                    totals[kv.Key] = totals.TryGetValue(kv.Key, out var existing) ? existing + kv.Value : kv.Value;
                }
            }

            Merge(await context.Reviews
                .Where(r => userIds.Contains(r.UserId))
                .GroupBy(r => r.UserId)
                .Select(g => new KeyValuePair<int, int>(g.Key, g.Count()))
                .ToListAsync());

            Merge(await context.UserLists
                .Where(l => userIds.Contains(l.UserId))
                .GroupBy(l => l.UserId)
                .Select(g => new KeyValuePair<int, int>(g.Key, g.Count()))
                .ToListAsync());

            Merge(await context.UserListComments
                .Where(c => userIds.Contains(c.UserId))
                .GroupBy(c => c.UserId)
                .Select(g => new KeyValuePair<int, int>(g.Key, g.Count()))
                .ToListAsync());

            Merge(await context.ReviewComments
                .Where(c => userIds.Contains(c.UserId))
                .GroupBy(c => c.UserId)
                .Select(g => new KeyValuePair<int, int>(g.Key, g.Count()))
                .ToListAsync());

            return totals;
        }
    }
}
