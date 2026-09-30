using System.Net.Http.Json;
using System.Text.Json;
using GGHub.Core.Enums;
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
    /// Yeni ya da degisen herkese acik icerigi IndexNow ile Bing/Yandex'e bildirir.
    ///
    /// Neden: ChatGPT arama tarafinda buyuk olcude Bing dizinini kullaniyor. Sitemap ~20 bin URL
    /// ve Bing onu kendi hizinda tariyor; yeni bir inceleme gunlerce dizine girmeyebilir.
    /// IndexNow ile degisen sayfa ayni gun bildirilir.
    ///
    /// Ne gonderilir (son basarili gonderimden bu yana, her dil icin ayri URL):
    ///   - yeni/duzenlenen inceleme: /reviews/{id}, incelenen oyunun sayfasi, yazarin profili
    ///   - yeni/duzenlenen herkese acik ozel liste: /lists/{id}, sahibinin profili
    /// AI bot icerigi BILEREK gonderilmez: arama motoruna her gun yuzlerce otomatik uretilmis
    /// sayfa itmek siteyi "otomatik icerik" olarak isaretletebilir. Bot sayfalari sitemap'te kalir.
    ///
    /// Tum sitemap'i bir kez gondermek icin: scripts/indexnow-submit. Degismeyen URL'yi tekrar
    /// tekrar gondermek Bing kurallarina aykiri, bu yuzden job yalnizca farki gonderir.
    ///
    /// Worker'da calisir (WebAPI'de DEGIL): gelistirici makinesi kapaliyken kacan aralik durum
    /// dosyasindaki zamandan itibaren bir sonraki kosuda yakalanir.
    /// </summary>
    public class IndexNowJob : BackgroundService
    {
        private static readonly string[] Locales = ["tr", "en-US"];

        // IndexNow tek istekte en fazla 10.000 URL kabul ediyor.
        private const int MaxUrlsPerRequest = 10000;

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IndexNowSettings _settings;
        private readonly ILogger<IndexNowJob> _logger;

        public IndexNowJob(
            IServiceScopeFactory scopeFactory,
            IHttpClientFactory httpClientFactory,
            IOptions<IndexNowSettings> settings,
            ILogger<IndexNowJob> logger)
        {
            _scopeFactory = scopeFactory;
            _httpClientFactory = httpClientFactory;
            _settings = settings.Value;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_settings.Enabled || string.IsNullOrWhiteSpace(_settings.StatePath))
            {
                _logger.LogInformation("[IndexNow] Kapali (Enabled=false ya da StatePath bos).");
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
                    _logger.LogError(ex, "[IndexNow] Kosu hatayla bitti.");
                }

                await Task.Delay(TimeSpan.FromHours(Math.Max(1, _settings.RunIntervalHours)), stoppingToken);
            }
        }

        private async Task RunOnceAsync(CancellationToken ct)
        {
            var until = DateTime.UtcNow;
            var since = await ReadLastRunAsync(ct) ?? until.AddHours(-_settings.InitialLookbackHours);

            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();

            var reviews = await context.Reviews.AsNoTracking()
                .Where(r => (r.CreatedAt >= since || r.UpdatedAt >= since)
                    && !r.User.IsDeleted
                    && !r.User.IsBanned
                    && !r.User.IsAiAgent
                    && r.User.ProfileVisibility == ProfileVisibilitySetting.Public)
                .Select(r => new { r.Id, GameSlug = r.Game.Slug, r.User.Username })
                .ToListAsync(ct);

            var lists = await context.UserLists.AsNoTracking()
                .Where(l => (l.CreatedAt >= since || l.UpdatedAt >= since)
                    && l.Visibility == ListVisibilitySetting.Public
                    && l.Type == UserListType.Custom
                    && l.UserListGames.Any()
                    && !l.User.IsDeleted
                    && !l.User.IsBanned
                    && !l.User.IsAiAgent
                    && l.User.ProfileVisibility == ProfileVisibilitySetting.Public)
                .Select(l => new { l.Id, l.User.Username })
                .ToListAsync(ct);

            // Sira onemli: tavan asilirsa once en degerli sayfalar (inceleme, oyun) gitsin.
            var paths = new List<string>();
            paths.AddRange(reviews.Select(r => $"/reviews/{r.Id}"));
            paths.AddRange(reviews.Where(r => !string.IsNullOrEmpty(r.GameSlug)).Select(r => $"/games/{r.GameSlug}"));
            paths.AddRange(lists.Select(l => $"/lists/{l.Id}"));
            paths.AddRange(reviews.Select(r => r.Username).Concat(lists.Select(l => l.Username))
                .Where(u => !string.IsNullOrEmpty(u))
                .Select(u => $"/profiles/{Uri.EscapeDataString(u)}"));

            var urls = paths
                .Distinct()
                .SelectMany(path => Locales.Select(locale => $"https://{_settings.Host}/{locale}{path}"))
                .Take(MaxUrlsPerRequest)
                .ToList();

            if (urls.Count == 0)
            {
                _logger.LogInformation("[IndexNow] {Since:u} sonrasi yeni icerik yok.", since);
                await WriteLastRunAsync(until, ct);
                return;
            }

            if (await SubmitAsync(urls, ct))
            {
                _logger.LogInformation(
                    "[IndexNow] {Urls} URL gonderildi ({Reviews} inceleme, {Lists} liste, {Since:u} sonrasi).",
                    urls.Count, reviews.Count, lists.Count, since);
                await WriteLastRunAsync(until, ct);
            }
            // Basarisizsa zaman ilerlemez: ayni aralik bir sonraki kosuda tekrar denenir.
        }

        private async Task<bool> SubmitAsync(List<string> urls, CancellationToken ct)
        {
            var client = _httpClientFactory.CreateClient("IndexNow");
            var payload = new
            {
                host = _settings.Host,
                key = _settings.Key,
                keyLocation = $"https://{_settings.Host}/{_settings.Key}.txt",
                urlList = urls,
            };

            using var response = await client.PostAsJsonAsync(_settings.Endpoint, payload, ct);
            if (response.IsSuccessStatusCode)
            {
                return true;
            }

            // 400 bicim, 403 anahtar gecersiz/dogrulanmadi, 422 URL host'a ait degil, 429 cok sik.
            var body = await response.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("[IndexNow] Gonderim reddedildi: HTTP {Status} {Body}",
                (int)response.StatusCode, body.Length > 300 ? body[..300] : body);
            return false;
        }

        private async Task<DateTime?> ReadLastRunAsync(CancellationToken ct)
        {
            if (!File.Exists(_settings.StatePath))
            {
                return null;
            }

            try
            {
                await using var stream = File.OpenRead(_settings.StatePath!);
                var state = await JsonSerializer.DeserializeAsync<IndexNowState>(stream, cancellationToken: ct);
                return state?.LastRunUtc;
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "[IndexNow] Durum dosyasi okunamadi, ilk kosu gibi davranilacak.");
                return null;
            }
        }

        private async Task WriteLastRunAsync(DateTime lastRunUtc, CancellationToken ct)
        {
            await using var stream = File.Create(_settings.StatePath!);
            await JsonSerializer.SerializeAsync(stream, new IndexNowState { LastRunUtc = lastRunUtc }, cancellationToken: ct);
        }

        private sealed class IndexNowState
        {
            public DateTime LastRunUtc { get; set; }
        }
    }
}
