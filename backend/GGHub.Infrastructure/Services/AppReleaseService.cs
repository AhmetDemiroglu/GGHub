using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace GGHub.Infrastructure.Services
{
    /// <inheritdoc />
    public class AppReleaseService : IAppReleaseService
    {
        private const string CacheKey = "app-release-policy";
        private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);
        private const int MaxMessageLength = 500;
        private const int MaxUrlLength = 300;

        private readonly GGHubDbContext _context;
        private readonly IMemoryCache _cache;

        public AppReleaseService(GGHubDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<AppReleasePolicyDto> GetPolicyAsync(CancellationToken ct = default)
            => ToDto(await GetRowAsync(ct));

        public async Task<AppReleasePolicyDto> UpdatePolicyAsync(AppReleasePolicyDto dto, CancellationToken ct = default)
        {
            var iosMin = NormalizeVersion(dto.IosMinVersion, "iOS minimum");
            var iosRec = NormalizeVersion(dto.IosRecommendedVersion, "iOS önerilen");
            var androidMin = NormalizeVersion(dto.AndroidMinVersion, "Android minimum");
            var androidRec = NormalizeVersion(dto.AndroidRecommendedVersion, "Android önerilen");

            if (Compare(iosMin, iosRec) > 0)
                throw new ArgumentException("iOS minimum sürüm önerilen sürümden büyük olamaz.");
            if (Compare(androidMin, androidRec) > 0)
                throw new ArgumentException("Android minimum sürüm önerilen sürümden büyük olamaz.");

            var iosStore = NormalizeUrl(dto.IosStoreUrl, "App Store");
            var androidStore = NormalizeUrl(dto.AndroidStoreUrl, "Google Play");

            var row = await _context.AppReleasePolicies.FirstOrDefaultAsync(p => p.Id == 1, ct);
            if (row is null)
            {
                await CreateDefaultAsync(ct);
                row = await _context.AppReleasePolicies.FirstAsync(p => p.Id == 1, ct);
            }

            row.MaintenanceEnabled = dto.MaintenanceEnabled;
            row.MaintenanceMessageTr = Trim(dto.MaintenanceMessageTr);
            row.MaintenanceMessageEn = Trim(dto.MaintenanceMessageEn);
            row.IosMinVersion = iosMin;
            row.IosRecommendedVersion = iosRec;
            row.AndroidMinVersion = androidMin;
            row.AndroidRecommendedVersion = androidRec;
            row.IosStoreUrl = iosStore;
            row.AndroidStoreUrl = androidStore;
            row.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);

            _cache.Remove(CacheKey);
            _context.Entry(row).State = EntityState.Detached;
            return ToDto(row);
        }

        public async Task<AppReleaseCheckDto> EvaluateAsync(string platform, string version, CancellationToken ct = default)
        {
            var policy = await GetRowAsync(ct);
            var isIos = string.Equals(platform, "ios", StringComparison.OrdinalIgnoreCase);

            var min = isIos ? policy.IosMinVersion : policy.AndroidMinVersion;
            var recommended = isIos ? policy.IosRecommendedVersion : policy.AndroidRecommendedVersion;
            var current = NormalizeVersion(version, "current", throwOnInvalid: false);

            var status = AppReleaseStatus.Ok;
            if (policy.MaintenanceEnabled)
                status = AppReleaseStatus.Maintenance;
            else if (current is not null && Compare(current, min) < 0)
                status = AppReleaseStatus.Required;
            else if (current is not null && Compare(current, recommended) < 0)
                status = AppReleaseStatus.Recommended;

            return new AppReleaseCheckDto
            {
                Status = status,
                Platform = isIos ? "ios" : "android",
                CurrentVersion = current ?? version,
                MinVersion = min,
                RecommendedVersion = recommended,
                StoreUrl = isIos ? policy.IosStoreUrl : policy.AndroidStoreUrl,
                MaintenanceMessageTr = policy.MaintenanceMessageTr,
                MaintenanceMessageEn = policy.MaintenanceMessageEn,
            };
        }

        // ------------------------------------------------------------------ yardimcilar

        /// <summary>
        /// "v1.3" -> "1.3.0". Bos -> null (kisit yok). Gecersizse ArgumentException (admin girisi) ya da
        /// null (istemciden gelen surum; bozuk surum kisit uygulanmadan "ok" doner, uygulama kilitlenmez).
        /// </summary>
        internal static string? NormalizeVersion(string? raw, string label, bool throwOnInvalid = true)
        {
            var text = raw?.Trim().TrimStart('v', 'V');
            if (string.IsNullOrEmpty(text)) return null;

            var parts = text.Split('.');
            if (parts.Length is < 1 or > 4 || !parts.All(p => int.TryParse(p, out var n) && n >= 0))
            {
                if (throwOnInvalid)
                    throw new ArgumentException($"{label} sürümü geçersiz. Örnek biçim: 1.3.0");
                return null;
            }

            var numbers = parts.Select(int.Parse).ToList();
            while (numbers.Count < 3) numbers.Add(0);
            return string.Join('.', numbers);
        }

        /// <summary>Null taraf "kisit yok" sayilir: null ile karsilastirma 0 doner.</summary>
        internal static int Compare(string? a, string? b)
        {
            if (a is null || b is null) return 0;
            var av = a.Split('.').Select(int.Parse).ToArray();
            var bv = b.Split('.').Select(int.Parse).ToArray();
            for (var i = 0; i < Math.Max(av.Length, bv.Length); i++)
            {
                var x = i < av.Length ? av[i] : 0;
                var y = i < bv.Length ? bv[i] : 0;
                if (x != y) return x.CompareTo(y);
            }
            return 0;
        }

        private static string NormalizeUrl(string? raw, string label)
        {
            var text = raw?.Trim() ?? string.Empty;
            if (text.Length == 0 || text.Length > MaxUrlLength
                || !Uri.TryCreate(text, UriKind.Absolute, out var uri)
                || uri.Scheme != Uri.UriSchemeHttps)
            {
                throw new ArgumentException($"{label} adresi geçerli bir https bağlantısı olmalı.");
            }
            return text;
        }

        private static string? Trim(string? raw)
        {
            var text = raw?.Trim();
            if (string.IsNullOrEmpty(text)) return null;
            return text.Length > MaxMessageLength ? text[..MaxMessageLength] : text;
        }

        private async Task<AppReleasePolicy> GetRowAsync(CancellationToken ct)
        {
            if (_cache.TryGetValue(CacheKey, out AppReleasePolicy? cached) && cached is not null)
                return cached;

            var row = await _context.AppReleasePolicies.AsNoTracking().FirstOrDefaultAsync(p => p.Id == 1, ct)
                      ?? await CreateDefaultAsync(ct);

            _cache.Set(CacheKey, row, CacheTtl);
            return row;
        }

        /// <summary>Varsayilan satir. ON CONFLICT: es zamanli ilk okumalar ikinci eklemeyi sessizce dusurur.</summary>
        private async Task<AppReleasePolicy> CreateDefaultAsync(CancellationToken ct)
        {
            var d = new AppReleasePolicy();
            await _context.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "AppReleasePolicies" ("Id", "MaintenanceEnabled", "IosStoreUrl", "AndroidStoreUrl", "UpdatedAt")
                VALUES (1, {d.MaintenanceEnabled}, {d.IosStoreUrl}, {d.AndroidStoreUrl}, {DateTime.UtcNow})
                ON CONFLICT ("Id") DO NOTHING
                """, ct);

            return await _context.AppReleasePolicies.AsNoTracking().FirstAsync(p => p.Id == 1, ct);
        }

        private static AppReleasePolicyDto ToDto(AppReleasePolicy p) => new()
        {
            MaintenanceEnabled = p.MaintenanceEnabled,
            MaintenanceMessageTr = p.MaintenanceMessageTr,
            MaintenanceMessageEn = p.MaintenanceMessageEn,
            IosMinVersion = p.IosMinVersion,
            IosRecommendedVersion = p.IosRecommendedVersion,
            AndroidMinVersion = p.AndroidMinVersion,
            AndroidRecommendedVersion = p.AndroidRecommendedVersion,
            IosStoreUrl = p.IosStoreUrl,
            AndroidStoreUrl = p.AndroidStoreUrl,
            UpdatedAt = p.UpdatedAt,
        };
    }
}
