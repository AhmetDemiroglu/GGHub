namespace GGHub.Application.Interfaces
{
    /// <summary>Gemini harcamasinin kaynaklari. Her kaynagin kendi aylik TL tavani var (AiSettings).</summary>
    public static class GeminiSources
    {
        public const string Translation = "translation";
        public const string AiAgent = "ai-agent";
    }

    public interface IGeminiBudgetService
    {
        /// <summary>
        /// Ucretli bir model icin kaynagin aylik tavani dolmussa <see cref="GeminiBudgetExceededException"/>
        /// firlatir. Ucretsiz modeller (Gemma) tavana tabi degildir. Her Gemini cagrisindan ONCE calisir.
        /// </summary>
        Task EnsureBudgetAvailableAsync(string source, string model, CancellationToken cancellationToken = default);

        /// <summary>
        /// Gemini'nin donen gercek token sayilariyla harcamayi atomik olarak isler.
        /// Tahmin kullanilmaz: tahmine dayanan tavan, tavan degildir.
        /// </summary>
        Task RecordUsageAsync(string source, string model, int inputTokens, int outputTokens, CancellationToken cancellationToken = default);

        /// <summary>
        /// Token yakmayan ama Google'in kotasindan DUSEN cagrilari (429) sayar.
        /// </summary>
        Task RecordRejectedCallAsync(string source, string model, CancellationToken cancellationToken = default);

        /// <summary>Kaynagin bu ayki durumu (tum modeller toplami).</summary>
        Task<GeminiBudgetStatus> GetStatusAsync(string source, CancellationToken cancellationToken = default);

        /// <summary>Modelin ucretsiz olup olmadigi (fiyat tablosunda 0/0).</summary>
        bool IsFreeModel(string model);
    }

    public class GeminiBudgetStatus
    {
        public string Source { get; set; } = string.Empty;

        /// <summary>Ay anahtari, "2026-09".</summary>
        public string PeriodKey { get; set; } = string.Empty;

        public decimal SpentUsd { get; set; }
        public decimal LimitUsd { get; set; }
        public decimal UsdToTryRate { get; set; }
        public long InputTokens { get; set; }
        public long OutputTokens { get; set; }
        public int CallCount { get; set; }

        /// <summary>Bugun (UTC) yapilan cagri sayisi ve harcama.</summary>
        public int CallsToday { get; set; }
        public decimal SpentTodayUsd { get; set; }

        /// <summary>
        /// Aylik tavanin gunluk payi: kalan butce / ayin kalan gunleri (bugun dahil). Ceviri job'u
        /// bunu gecince o gun durur; sitedeki "Turkceye cevir" butonu kalan payi kullanmaya devam eder.
        /// </summary>
        public decimal DailyShareUsd { get; set; }

        public decimal SpentTry => SpentUsd * UsdToTryRate;
        public decimal LimitTry => LimitUsd * UsdToTryRate;
        public decimal RemainingUsd => Math.Max(0m, LimitUsd - SpentUsd);
        public bool IsExhausted => SpentUsd >= LimitUsd;
        public bool IsDailyShareReached => SpentTodayUsd >= DailyShareUsd;
    }

    /// <summary>
    /// Gemini dakikalik/gunluk kotasi doldu ya da bakiye bitti (HTTP 429). Aylik butce tavanindan
    /// FARKLI: bu bizim koydugumuz bir sinir degil, Google'in reddi.
    /// </summary>
    public class GeminiQuotaExceededException : Exception
    {
        public GeminiQuotaExceededException(string message, bool isBilling = false) : base(message)
        {
            IsBilling = isBilling;
        }

        /// <summary>true: Google hesabinin bakiyesi bitmis (kota degil); kredi yuklenene kadar acilmaz.</summary>
        public bool IsBilling { get; }
    }

    public class GeminiBudgetExceededException : Exception
    {
        public GeminiBudgetExceededException(string source, string periodKey, decimal spentUsd, decimal limitUsd)
            : base($"Gemini '{source}' aylik butcesi doldu ({periodKey}): {spentUsd:F4} / {limitUsd:F2} USD.")
        {
            BudgetSource = source;
            PeriodKey = periodKey;
            SpentUsd = spentUsd;
            LimitUsd = limitUsd;
        }

        /// <summary>Tavani dolan kaynak (GeminiSources). Exception.Source ile karismasin diye ayri ad.</summary>
        public string BudgetSource { get; }
        public string PeriodKey { get; }
        public decimal SpentUsd { get; }
        public decimal LimitUsd { get; }
    }
}
