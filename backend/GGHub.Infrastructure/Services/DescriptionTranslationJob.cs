using GGHub.Application.Interfaces;
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
    /// Aciklamalari Turkce'ye cevirir (Gemini).
    ///
    /// GameDetailBackfillJob'dan BILEREK ayri: farkli kaynak, farkli hiz limiti, farkli tavan.
    /// RAWG'nin hizini Gemini'nin butcesine baglamak yanlis eslesme olurdu; ayrica Gemini aylik
    /// tavani dolunca RAWG backfill'inin UCRETSIZ olarak devam etmesi gerekiyor.
    ///
    /// Kuyruk bedava turetiliyor, ayri bir marker kolonu gerekmiyor: aciklamasi olup cevirisi
    /// olmayan oyunlar. RawgAdded DESC: butce biterse en populer oyunlar cevrilmis olur.
    /// </summary>
    public class DescriptionTranslationJob : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<DescriptionTranslationJob> _logger;
        private readonly DescriptionTranslationSettings _settings;

        public DescriptionTranslationJob(
            IServiceProvider serviceProvider,
            ILogger<DescriptionTranslationJob> logger,
            IOptions<DescriptionTranslationSettings> settings)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _settings = settings.Value;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_settings.Enabled)
            {
                _logger.LogInformation("[Translation] Job kapali.");
                return;
            }

            _logger.LogInformation("[Translation] Basladi. BatchSize={Batch}, Delay={Delay}ms",
                _settings.BatchSize, _settings.DelayBetweenRequestsMs);

            while (!stoppingToken.IsCancellationRequested)
            {
                var sleep = TimeSpan.FromMinutes(_settings.RunIntervalMinutes);

                try
                {
                    if (!await RunOnceAsync(stoppingToken))
                    {
                        // Kota/butce doldu. Bir sonraki UTC gun basina kadar uyu: Google'in gunluk
                        // kotasi orada sifirlaniyor. Sabit bir sure beklemek ya erken uyanip 429
                        // uretir ya da bosuna saatler kaybettirir. Aylik butce doldu ise gunde bir
                        // uyanip tekrar uyur, o da ucuz.
                        sleep = NextUtcMidnight() - DateTime.UtcNow + TimeSpan.FromMinutes(2);
                        _logger.LogInformation("[Translation] {Hours:F1} saat sonra (UTC gun basi) tekrar denenecek.",
                            sleep.TotalHours);
                    }
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[Translation] Beklenmeyen hata.");
                }

                try
                {
                    await Task.Delay(sleep, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }

        private static DateTime NextUtcMidnight() => DateTime.UtcNow.Date.AddDays(1);

        /// <returns><c>false</c> ise butce veya gunluk kota dolmus demektir; yarina birak.</returns>
        private async Task<bool> RunOnceAsync(CancellationToken stoppingToken)
        {
            var translated = 0;
            var consecutiveErrors = 0;

            while (!stoppingToken.IsCancellationRequested)
            {
                using var scope = _serviceProvider.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();
                var gemini = scope.ServiceProvider.GetRequiredService<IGeminiService>();
                var budget = scope.ServiceProvider.GetRequiredService<IGeminiBudgetService>();

                var status = await budget.GetStatusAsync(stoppingToken);

                if (status.IsExhausted)
                {
                    _logger.LogWarning(
                        "[Translation] {Period} butcesi doldu: {Spent:F4}/{Limit:F2} USD, {Calls} cagri. Ay basinda kendiliginden acilacak.",
                        status.PeriodKey, status.SpentUsd, status.LimitUsd, status.CallCount);
                    return false;
                }

                // Gunluk tavan: Google'in ucretsiz katmani model basina gunde 500 istek veriyor.
                // Bot hepsini yerse CANLI SITEDEKI ceviri butonu da gunun kalanini 429 yer.
                // Burada durup yarina birakiyoruz; kalan pay kullanicilarin.
                if (status.IsDailyCapReached)
                {
                    _logger.LogInformation(
                        "[Translation] Gunluk tavan doldu ({Today}/{Cap}). Siteye pay birakmak icin yarina kadar duruluyor.",
                        status.CallsToday, status.DailyCap);
                    return false;
                }

                // "?? 0" SART: Postgres'te ORDER BY x DESC NULL'lari BASA koyuyor (NULLS FIRST).
                // Bu olmadan butce, RawgAdded'i NULL olan degersiz oyunlarda yanardi.
                var batch = await context.Games
                    .Where(g => g.Description != null
                                && g.Description != ""
                                && (g.DescriptionTr == null || g.DescriptionTr == g.Description))
                    .OrderByDescending(g => g.RawgAdded ?? 0)
                    .Take(_settings.BatchSize)
                    .Select(g => new { g.Id, g.Name })
                    .ToListAsync(stoppingToken);

                if (batch.Count == 0)
                {
                    _logger.LogInformation(
                        "[Translation] Kuyruk bos. Bu ay: {Spent:F4}/{Limit:F2} USD, {Calls} cagri.",
                        status.SpentUsd, status.LimitUsd, status.CallCount);
                    return true;
                }

                foreach (var item in batch)
                {
                    if (stoppingToken.IsCancellationRequested)
                    {
                        return true;
                    }

                    var game = await context.Games.FirstOrDefaultAsync(g => g.Id == item.Id, stoppingToken);
                    if (game?.Description is not { Length: > 0 } description)
                    {
                        continue;
                    }

                    string? result;
                    try
                    {
                        result = await gemini.TranslateHtmlDescriptionAsync(description, stoppingToken);
                    }
                    catch (GeminiBudgetExceededException ex)
                    {
                        _logger.LogWarning("[Translation] Butce cagri sirasinda doldu: {Msg}", ex.Message);
                        return false;
                    }
                    catch (GeminiQuotaExceededException ex)
                    {
                        // Google reddetti (429). Yeniden denemek kotayi daha da yakar: reddedilen
                        // istek de gunluk sayaca giriyor. Gunu kapat.
                        _logger.LogWarning("[Translation] Gemini kotasi doldu: {Msg}", ex.Message);
                        return false;
                    }
                    catch (Exception ex)
                    {
                        consecutiveErrors++;
                        _logger.LogWarning(ex, "[Translation] Hata '{Name}'", item.Name);

                        if (consecutiveErrors >= _settings.MaxConsecutiveErrors)
                        {
                            _logger.LogWarning("[Translation] {Count} ardisik hata, tur sonlandiriliyor.", consecutiveErrors);
                            return true;
                        }

                        await Task.Delay(_settings.DelayBetweenRequestsMs, stoppingToken);
                        continue;
                    }

                    // null = ceviri uretilemedi. Ingilizce metni "Turkce ceviri" diye YAZMA;
                    // DescriptionTr == Description olan kayit zaten kuyrukta kalir ve tekrar denenir.
                    if (string.IsNullOrWhiteSpace(result) ||
                        string.Equals(result, description, StringComparison.OrdinalIgnoreCase))
                    {
                        _logger.LogInformation("[Translation] Ceviri uretilemedi, atlandi: '{Name}'", item.Name);
                        consecutiveErrors++;

                        if (consecutiveErrors >= _settings.MaxConsecutiveErrors)
                        {
                            return true;
                        }

                        await Task.Delay(_settings.DelayBetweenRequestsMs, stoppingToken);
                        continue;
                    }

                    consecutiveErrors = 0;
                    game.DescriptionTr = result;
                    context.Entry(game).Property(x => x.DescriptionTr).IsModified = true;
                    await context.SaveChangesAsync(stoppingToken);
                    translated++;

                    await Task.Delay(_settings.DelayBetweenRequestsMs, stoppingToken);
                }

                _logger.LogInformation("[Translation] {Count} oyun cevrildi bu turda.", translated);
            }

            return true;
        }
    }
}
