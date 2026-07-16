namespace GGHub.Application.Interfaces
{
    public interface IGeminiBudgetService
    {
        /// <summary>
        /// Aylik butce dolmussa <see cref="GeminiBudgetExceededException"/> firlatir.
        /// Her Gemini cagrisindan ONCE calisir.
        /// </summary>
        Task EnsureBudgetAvailableAsync(CancellationToken cancellationToken = default);

        /// <summary>
        /// Gemini'nin donen gercek token sayilariyla harcamayi atomik olarak isler.
        /// Tahmin kullanilmaz: tahmine dayanan tavan, tavan degildir.
        /// </summary>
        Task RecordUsageAsync(int inputTokens, int outputTokens, CancellationToken cancellationToken = default);

        /// <summary>
        /// Token yakmayan ama Google'in gunluk kotasindan DUSEN cagrilari (429) sayar.
        /// </summary>
        Task RecordRejectedCallAsync(CancellationToken cancellationToken = default);

        Task<GeminiBudgetStatus> GetStatusAsync(CancellationToken cancellationToken = default);
    }

    public class GeminiBudgetStatus
    {
        public string PeriodKey { get; set; } = string.Empty;
        public decimal SpentUsd { get; set; }
        public decimal LimitUsd { get; set; }
        public long InputTokens { get; set; }
        public long OutputTokens { get; set; }
        public int CallCount { get; set; }

        /// <summary>Bugun yapilan cagri sayisi. Gemini ucretsiz katmani GUNLUK istek sayisiyla sinirli.</summary>
        public int CallsToday { get; set; }

        /// <summary>Botun gunluk cagri tavani. 0 = sinirsiz (faturalandirma acikken).</summary>
        public int DailyCap { get; set; }

        public decimal RemainingUsd => Math.Max(0m, LimitUsd - SpentUsd);
        public bool IsExhausted => SpentUsd >= LimitUsd;
        public bool IsDailyCapReached => DailyCap > 0 && CallsToday >= DailyCap;
    }

    /// <summary>
    /// Gemini gunluk/dakikalik kotasi doldu (HTTP 429). Aylik butce tavanindan FARKLI: bu bizim
    /// koydugumuz bir sinir degil, Google'in reddi. Ucretsiz katmanda model basina gunde 500 istek.
    /// </summary>
    public class GeminiQuotaExceededException : Exception
    {
        public GeminiQuotaExceededException(string message) : base(message) { }
    }

    public class GeminiBudgetExceededException : Exception
    {
        public GeminiBudgetExceededException(string periodKey, decimal spentUsd, decimal limitUsd)
            : base($"Gemini aylik butcesi doldu ({periodKey}): {spentUsd:F4} / {limitUsd:F2} USD.")
        {
            PeriodKey = periodKey;
            SpentUsd = spentUsd;
            LimitUsd = limitUsd;
        }

        public string PeriodKey { get; }
        public decimal SpentUsd { get; }
        public decimal LimitUsd { get; }
    }
}
