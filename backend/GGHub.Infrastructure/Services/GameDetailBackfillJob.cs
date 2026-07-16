using GGHub.Infrastructure.Dtos;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// RAWG detay backfill: aciklamasi olmayan oyunlar icin games/{id} cagirir.
    ///
    /// Neden gerekli: RawgImportJob RAWG'nin LIST ucunu kullaniyor (40 oyun/istek) ama list yaniti
    /// description alanini dondurmuyor. Sonuc: 31.917 oyunun 31.641'inde aciklama yok, oyun
    /// sayfalari bos. Aciklama tek yoldan geliyor: oyun basina bir detay istegi.
    ///
    /// Kuyruk RawgAdded DESC: kota biterse en populer oyunlar bitmis olur, yani dogru yerde biter.
    /// </summary>
    public class GameDetailBackfillJob : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<GameDetailBackfillJob> _logger;
        private readonly GameDetailBackfillSettings _settings;
        private readonly RawgApiSettings _apiSettings;

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            WriteIndented = false
        };

        public GameDetailBackfillJob(
            IServiceProvider serviceProvider,
            ILogger<GameDetailBackfillJob> logger,
            IOptions<GameDetailBackfillSettings> settings,
            IOptions<RawgApiSettings> apiSettings)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _settings = settings.Value;
            _apiSettings = apiSettings.Value;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_settings.Enabled)
            {
                _logger.LogInformation("[DetailBackfill] Job kapali.");
                return;
            }

            _logger.LogInformation(
                "[DetailBackfill] Basladi. BatchSize={Batch}, Delay={Delay}ms, MaxRequests/Run={Max}, Interval={Interval}dk",
                _settings.BatchSize, _settings.DelayBetweenRequestsMs, _settings.MaxRequestsPerRun, _settings.RunIntervalMinutes);

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
                    _logger.LogError(ex, "[DetailBackfill] Beklenmeyen hata.");
                }

                try
                {
                    await Task.Delay(TimeSpan.FromMinutes(_settings.RunIntervalMinutes), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }

        private async Task RunOnceAsync(CancellationToken stoppingToken)
        {
            var requestsThisRun = 0;
            var consecutiveErrors = 0;
            var processed = 0;
            var withDescription = 0;

            while (requestsThisRun < _settings.MaxRequestsPerRun && !stoppingToken.IsCancellationRequested)
            {
                using var scope = _serviceProvider.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();
                var httpClient = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>().CreateClient();

                // IX_Games_DetailBackfillQueue (partial, DetailSyncedAt IS NULL) bu sorguyu karsiliyor.
                //
                // "?? 0" SART: Postgres'te ORDER BY x DESC, NULL'lari BASA koyar (NULLS FIRST) ve
                // EF'in OrderByDescending cevirisi de aynen boyle. Bu haliyle job "en populer once"
                // yerine RawgAdded'i NULL olan coplerle basliyordu ("GTA 6 (leaked)" gibi) — yani
                // kota bitse en degersiz oyunlarda bitecekti, tasarimin tam tersi. COALESCE ile
                // NULL'lar 0 olup en sona dusuyor.
                var batch = await context.Games
                    .Where(g => g.DetailSyncedAt == null)
                    .OrderByDescending(g => g.RawgAdded ?? 0)
                    .Take(_settings.BatchSize)
                    .Select(g => new { g.Id, g.RawgId, g.Name })
                    .ToListAsync(stoppingToken);

                if (batch.Count == 0)
                {
                    _logger.LogInformation("[DetailBackfill] Kuyruk bos, islenecek oyun kalmadi.");
                    return;
                }

                foreach (var item in batch)
                {
                    if (stoppingToken.IsCancellationRequested || requestsThisRun >= _settings.MaxRequestsPerRun)
                    {
                        break;
                    }

                    var outcome = await FetchAndApplyAsync(context, httpClient, item.Id, item.RawgId, item.Name, stoppingToken);
                    requestsThisRun++;

                    switch (outcome)
                    {
                        case Outcome.Applied:
                            processed++;
                            consecutiveErrors = 0;
                            break;

                        case Outcome.AppliedWithDescription:
                            processed++;
                            withDescription++;
                            consecutiveErrors = 0;
                            break;

                        case Outcome.RateLimited:
                            consecutiveErrors++;
                            _logger.LogWarning("[DetailBackfill] 429 geldi, {Ms}ms bekleniyor.", _settings.RateLimitBackoffMs);
                            await Task.Delay(_settings.RateLimitBackoffMs, stoppingToken);
                            break;

                        case Outcome.ServerError:
                            consecutiveErrors++;
                            await Task.Delay(_settings.ServerErrorBackoffMs, stoppingToken);
                            break;
                    }

                    if (consecutiveErrors >= _settings.MaxConsecutiveErrors)
                    {
                        _logger.LogWarning(
                            "[DetailBackfill] {Count} ardisik hata, tur sonlandiriliyor.", consecutiveErrors);
                        return;
                    }

                    await Task.Delay(_settings.DelayBetweenRequestsMs, stoppingToken);
                }

                _logger.LogInformation(
                    "[DetailBackfill] Ilerleme: {Processed} oyun islendi ({WithDesc} aciklamali), {Requests}/{Max} istek.",
                    processed, withDescription, requestsThisRun, _settings.MaxRequestsPerRun);
            }
        }

        private enum Outcome { Applied, AppliedWithDescription, RateLimited, ServerError }

        private async Task<Outcome> FetchAndApplyAsync(
            GGHubDbContext context, HttpClient httpClient, int gameId, int rawgId, string name, CancellationToken ct)
        {
            var url = $"{_apiSettings.BaseUrl}games/{rawgId}?key={_apiSettings.ApiKey}";

            HttpResponseMessage response;
            try
            {
                // Ham HttpResponseMessage: GetFromJsonAsync 429 ve 5xx'i exception'a cevirip
                // birbirinden ayirt edilemez hale getiriyor, oysa ikisine farkli tepki veriyoruz.
                response = await httpClient.GetAsync(url, ct);
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
            {
                _logger.LogWarning("[DetailBackfill] Ag hatasi '{Name}': {Msg}", name, ex.Message);
                return Outcome.ServerError;
            }

            using (response)
            {
                if (response.StatusCode == HttpStatusCode.TooManyRequests)
                {
                    return Outcome.RateLimited;
                }

                if ((int)response.StatusCode >= 500)
                {
                    _logger.LogWarning("[DetailBackfill] {Status} '{Name}'", (int)response.StatusCode, name);
                    return Outcome.ServerError;
                }

                var game = await context.Games.FirstOrDefaultAsync(g => g.Id == gameId, ct);
                if (game == null)
                {
                    return Outcome.Applied;
                }

                if (response.StatusCode == HttpStatusCode.NotFound)
                {
                    // RAWG bu oyunu bilmiyor. Yetkili bir cevap: bir daha sorma.
                    game.DetailSyncedAt = DateTime.UtcNow;
                    context.Entry(game).Property(x => x.DetailSyncedAt).IsModified = true;
                    await context.SaveChangesAsync(ct);
                    return Outcome.Applied;
                }

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("[DetailBackfill] {Status} '{Name}'", (int)response.StatusCode, name);
                    return Outcome.ServerError;
                }

                RawgGameSingleDto? dto;
                try
                {
                    dto = await response.Content.ReadFromJsonAsync<RawgGameSingleDto>(ct);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[DetailBackfill] Yanit parse edilemedi '{Name}'", name);
                    return Outcome.ServerError;
                }

                if (dto == null)
                {
                    return Outcome.ServerError;
                }

                var hasDescription = ApplyDetail(context, game, dto);
                await context.SaveChangesAsync(ct);

                return hasDescription ? Outcome.AppliedWithDescription : Outcome.Applied;
            }
        }

        /// <summary>
        /// DTO'yu entity'ye isler. RawgGameService.GetGameBySlugOrIdAsync ile AYNI alanlari ayni
        /// sekilde map'liyor (ozellikle aciklamanin ilk paragrafa kirpilmasi) — UI'in bekledigi
        /// veri sekli o. Kasitli olarak ortak bir mapper cikarilmadi: RawgImportJob da kendi map'ini
        /// yaziyor ve ortak mapper prod okuma yollarini degistirme riski tasiyor.
        /// </summary>
        private bool ApplyDetail(GGHubDbContext context, Core.Entities.Game game, RawgGameSingleDto dto)
        {
            // description_raw'in ilk paragrafi. RawgGameService.cs:54-56 ile birebir ayni.
            var descriptionRaw = dto.Description ?? string.Empty;
            var englishDescription = descriptionRaw.Split(new[] { "\n\n" }, StringSplitOptions.None).FirstOrDefault();

            var platforms = dto.Platform?.Select(p => new { p.Platform.Name, p.Platform.Slug }).ToList();
            var genres = dto.Genre?.Select(g => new { g.Name, g.Slug }).ToList();
            var developers = dto.Developers?.Select(d => new { d.Name, d.Slug, d.ImageBackground }).ToList();
            var publishers = dto.Publishers?.Select(p => new { p.Name, p.Slug }).ToList();
            var stores = dto.Stores?.Select(s => new { StoreName = s.Store.Name, Domain = s.Store.Domain, Url = s.Url }).ToList();

            game.Description = englishDescription;
            game.WebsiteUrl = dto.Website;
            game.EsrbRating = dto.EsrbRating?.Name;
            game.CoverImage = dto.CoverImage;
            game.PlatformsJson = platforms != null ? JsonSerializer.Serialize(platforms, JsonOptions) : null;
            game.GenresJson = genres != null ? JsonSerializer.Serialize(genres, JsonOptions) : null;
            game.DevelopersJson = developers != null ? JsonSerializer.Serialize(developers, JsonOptions) : null;
            game.PublishersJson = publishers != null ? JsonSerializer.Serialize(publishers, JsonOptions) : null;
            game.StoresJson = stores != null ? JsonSerializer.Serialize(stores, JsonOptions) : null;
            game.DetailSyncedAt = DateTime.UtcNow;

            // Sadece dokundugumuz kolonlari isaretle. Bu, LastSyncedAt'in KAZARA yazilmamasini
            // garanti ediyor: o kolonu MetacriticSyncJob cooldown ve siralama icin kullaniyor
            // (MetacriticSyncJob.cs:110-116) ve 31 bin satirda ezmek butun metacritic kuyrugunu bozardi.
            context.Entry(game).Property(x => x.Description).IsModified = true;
            context.Entry(game).Property(x => x.WebsiteUrl).IsModified = true;
            context.Entry(game).Property(x => x.EsrbRating).IsModified = true;
            context.Entry(game).Property(x => x.CoverImage).IsModified = true;
            context.Entry(game).Property(x => x.PlatformsJson).IsModified = true;
            context.Entry(game).Property(x => x.GenresJson).IsModified = true;
            context.Entry(game).Property(x => x.DevelopersJson).IsModified = true;
            context.Entry(game).Property(x => x.PublishersJson).IsModified = true;
            context.Entry(game).Property(x => x.StoresJson).IsModified = true;
            context.Entry(game).Property(x => x.DetailSyncedAt).IsModified = true;

            return !string.IsNullOrWhiteSpace(englishDescription);
        }
    }
}
