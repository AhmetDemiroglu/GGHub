using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Gemini harcama defteri.
    ///
    /// Defter GUNLUK ve (kaynak, model) bazinda satir tutuyor: PeriodKey = "yyyy-MM-dd". Aylik harcama
    /// o ayin gunlerinin toplami. Anahtari satir kimliginin parcasi yapmak "sifirla" mantigini tamamen
    /// kaldiriyor: yeni gun = yeni satir, reset job'i ve yaris kosulu yok, gecmis gunler audit olarak kaliyor.
    ///
    /// Tavanlar kaynak basina ve TL cinsinden (AiSettings, admin paneli). Google USD ile fiyatliyor;
    /// cevrim AiSettings.UsdToTryRate ile. Ucretsiz modeller (Gemma) 0 USD yazilir ve tavana takilmaz,
    /// ama token'lari ve cagri sayilari yine sayilir (admin sayaci icin).
    /// </summary>
    public class GeminiBudgetService : IGeminiBudgetService
    {
        private readonly GGHubDbContext _context;
        private readonly GeminiSettings _settings;
        private readonly IAiSettingsProvider _aiSettings;
        private readonly ILogger<GeminiBudgetService> _logger;

        public GeminiBudgetService(
            GGHubDbContext context,
            IOptions<GeminiSettings> settings,
            IAiSettingsProvider aiSettings,
            ILogger<GeminiBudgetService> logger)
        {
            _context = context;
            _settings = settings.Value;
            _aiSettings = aiSettings;
            _logger = logger;
        }

        /// <summary>Bugunun anahtari, UTC. Google'in kotasi da UTC gunune gore sifirlanir.</summary>
        public static string TodayKey() => DateTime.UtcNow.ToString("yyyy-MM-dd");

        private static string CurrentMonthPrefix() => DateTime.UtcNow.ToString("yyyy-MM");

        public bool IsFreeModel(string model) => PriceOf(model).IsFree;

        /// <summary>
        /// Fiyati bilinmeyen model EN PAHALI bilinen fiyattan sayilir: yanlis yazilmis bir model
        /// adi tavani sessizce devre disi birakmasin.
        /// </summary>
        private GeminiModelPrice PriceOf(string model)
        {
            if (_settings.Models.TryGetValue(model, out var price))
            {
                return price;
            }

            var fallback = _settings.Models.Values
                .OrderByDescending(p => p.InputUsdPerMillion + p.OutputUsdPerMillion)
                .FirstOrDefault() ?? new GeminiModelPrice { InputUsdPerMillion = 1m, OutputUsdPerMillion = 5m };

            _logger.LogWarning("[Gemini] '{Model}' icin fiyat tanimli degil; en pahali bilinen fiyattan sayiliyor.", model);
            return fallback;
        }

        public async Task EnsureBudgetAvailableAsync(string source, string model, CancellationToken cancellationToken = default)
        {
            if (IsFreeModel(model))
            {
                return;
            }

            var status = await GetStatusAsync(source, cancellationToken);
            if (status.IsExhausted)
            {
                throw new GeminiBudgetExceededException(source, status.PeriodKey, status.SpentUsd, status.LimitUsd);
            }
        }

        public async Task RecordUsageAsync(string source, string model, int inputTokens, int outputTokens, CancellationToken cancellationToken = default)
        {
            if (inputTokens <= 0 && outputTokens <= 0)
            {
                return;
            }

            var price = PriceOf(model);
            var cost = (inputTokens / 1_000_000m) * price.InputUsdPerMillion
                     + (outputTokens / 1_000_000m) * price.OutputUsdPerMillion;

            var dayKey = TodayKey();
            var now = DateTime.UtcNow;

            // Tek ifadede atomik upsert. EF ile oku-degistir-yaz yapsaydik bot, ceviri job'u ve
            // /translate ucu ayni anda calisirken harcamalar birbirinin uzerine yazilir ve tavan sizardi.
            await _context.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "GeminiUsages" ("PeriodKey", "Source", "Model", "SpentUsd", "InputTokens", "OutputTokens", "CallCount", "LastUpdatedAt")
                VALUES ({dayKey}, {source}, {model}, {cost}, {(long)inputTokens}, {(long)outputTokens}, 1, {now})
                ON CONFLICT ("PeriodKey", "Source", "Model") DO UPDATE SET
                    "SpentUsd"     = "GeminiUsages"."SpentUsd"     + {cost},
                    "InputTokens"  = "GeminiUsages"."InputTokens"  + {(long)inputTokens},
                    "OutputTokens" = "GeminiUsages"."OutputTokens" + {(long)outputTokens},
                    "CallCount"    = "GeminiUsages"."CallCount"    + 1,
                    "LastUpdatedAt" = {now}
                """, cancellationToken);
        }

        /// <summary>
        /// 429 gibi, token yakmayan ama kotadan DUSEN cagrilari sayar. Google reddedilen istegi de
        /// kotaya yaziyor; saymazsak "daha cok hakkim var" sanip 429 uretmeye devam ederiz.
        /// </summary>
        public async Task RecordRejectedCallAsync(string source, string model, CancellationToken cancellationToken = default)
        {
            var dayKey = TodayKey();
            var now = DateTime.UtcNow;

            await _context.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "GeminiUsages" ("PeriodKey", "Source", "Model", "SpentUsd", "InputTokens", "OutputTokens", "CallCount", "LastUpdatedAt")
                VALUES ({dayKey}, {source}, {model}, 0, 0, 0, 1, {now})
                ON CONFLICT ("PeriodKey", "Source", "Model") DO UPDATE SET
                    "CallCount"     = "GeminiUsages"."CallCount" + 1,
                    "LastUpdatedAt" = {now}
                """, cancellationToken);
        }

        public async Task<GeminiBudgetStatus> GetStatusAsync(string source, CancellationToken cancellationToken = default)
        {
            var settings = await _aiSettings.GetAsync(cancellationToken);
            var monthPrefix = CurrentMonthPrefix();
            var dayKey = TodayKey();

            var monthRows = await _context.GeminiUsages
                .AsNoTracking()
                .Where(u => u.Source == source && u.PeriodKey.StartsWith(monthPrefix))
                .ToListAsync(cancellationToken);

            var rate = settings.UsdToTryRate > 0 ? settings.UsdToTryRate : 1m;
            var limitTry = source == GeminiSources.AiAgent
                ? settings.AgentMonthlyBudgetTry
                : settings.TranslationMonthlyBudgetTry;
            var limitUsd = limitTry / rate;

            var spent = monthRows.Sum(u => u.SpentUsd);
            var todayRows = monthRows.Where(u => u.PeriodKey == dayKey).ToList();
            var spentToday = todayRows.Sum(u => u.SpentUsd);

            // Gunluk pay: bugunun basindaki kalan butce, ayin kalan gunlerine (bugun dahil) esit bolunur.
            var now = DateTime.UtcNow;
            var daysLeft = DateTime.DaysInMonth(now.Year, now.Month) - now.Day + 1;
            var remainingAtDayStart = Math.Max(0m, limitUsd - (spent - spentToday));
            var dailyShare = daysLeft > 0 ? remainingAtDayStart / daysLeft : remainingAtDayStart;

            return new GeminiBudgetStatus
            {
                Source = source,
                PeriodKey = monthPrefix,
                LimitUsd = limitUsd,
                UsdToTryRate = rate,
                SpentUsd = spent,
                InputTokens = monthRows.Sum(u => u.InputTokens),
                OutputTokens = monthRows.Sum(u => u.OutputTokens),
                CallCount = monthRows.Sum(u => u.CallCount),
                CallsToday = todayRows.Sum(u => u.CallCount),
                SpentTodayUsd = spentToday,
                DailyShareUsd = dailyShare
            };
        }
    }
}
