namespace GGHub.Core.Entities
{
    /// <summary>
    /// Aylik Gemini harcama defteri. Donem anahtari satir kimliginin parcasi oldugu icin
    /// "ay basinda sifirla" diye bir mantik gerekmiyor: yeni ay = yeni satir. Reset job'i,
    /// yaris kosulu ve "reset calisti mi" sorusu yok. Gecmis aylar da audit olarak kaliyor.
    /// </summary>
    public class GeminiUsage
    {
        public int Id { get; set; }

        /// <summary>Donem anahtari, "2026-07" formatinda (UTC). Unique.</summary>
        public string PeriodKey { get; set; } = string.Empty;

        /// <summary>Gemini'nin donen gercek usageMetadata'sindan hesaplanan harcama.</summary>
        public decimal SpentUsd { get; set; }

        public long InputTokens { get; set; }
        public long OutputTokens { get; set; }
        public int CallCount { get; set; }
        public DateTime LastUpdatedAt { get; set; }
    }
}
