namespace GGHub.Infrastructure.Settings
{
    public class DescriptionTranslationSettings
    {
        public bool Enabled { get; set; }

        public int BatchSize { get; set; } = 50;

        /// <summary>
        /// Gemini cagrilari arasi bekleme. Ucretsiz katmanda gemini-3.1-flash-lite ~15 RPM;
        /// 4000ms ~15 RPM'e denk gelir. Ucretli katmanda cok daha dusuk olabilir.
        /// </summary>
        public int DelayBetweenRequestsMs { get; set; } = 4000;

        public int RunIntervalMinutes { get; set; } = 10;

        public int MaxConsecutiveErrors { get; set; } = 5;

        /// <summary>
        /// Butce dolunca bir sonraki kontrole kadar beklenecek sure. Ay degisince butce
        /// kendiliginden acilir (PeriodKey yeni ay = yeni satir), o yuzden sadece uzun uyumak yeterli.
        /// </summary>
        public int BudgetExhaustedSleepMinutes { get; set; } = 360;
    }
}
