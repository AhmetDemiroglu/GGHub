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

        public decimal RemainingUsd => Math.Max(0m, LimitUsd - SpentUsd);
        public bool IsExhausted => SpentUsd >= LimitUsd;
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
