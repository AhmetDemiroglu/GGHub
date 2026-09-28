namespace GGHub.Infrastructure.Settings
{
    public class GeminiSettings
    {
        public string ApiKey { get; set; } = string.Empty;

        /// <summary>
        /// Ceviri modeli. Yeni projelere acik en ucuz UCRETLI model. Degistirirsen fiyatini
        /// <see cref="Models"/>'a da ekle; fiyati bilinmeyen model en pahali bilinen fiyattan sayilir.
        /// </summary>
        public string Model { get; set; } = "gemini-3.1-flash-lite";

        /// <summary>
        /// Olculen ortalama ceviri ~480 cikti token'i (aciklamalar ortalama 1193 karakter).
        /// 2048 dort kat pay birakir; buna carpan bir cikti normal degildir, kacak uretim
        /// isaretidir ve tek cagrida aylik butceyi yiyebilir.
        /// </summary>
        public int MaxOutputTokens { get; set; } = 2048;

        /// <summary>
        /// Model basina fiyat (1M token basina USD). Ucretsiz modeller 0/0: harcamaya islemez ama
        /// token'lari sayilir. Kaynak: ai.google.dev/gemini-api/docs/pricing (Eyl 2026).
        ///
        /// Aylik TL tavanlari ve kur BURADA DEGIL: admin panelinden duzenlenen AiSettings satirinda.
        /// Eski "MonthlyBudgetUsd", "DailyCallCap", "UsdToTryRate" anahtarlari artik okunmuyor.
        /// </summary>
        public Dictionary<string, GeminiModelPrice> Models { get; set; } = new(StringComparer.OrdinalIgnoreCase)
        {
            ["gemini-3.1-flash-lite"] = new() { InputUsdPerMillion = 0.25m, OutputUsdPerMillion = 1.50m },
            ["gemini-3.5-flash-lite"] = new() { InputUsdPerMillion = 0.30m, OutputUsdPerMillion = 2.50m },
            ["gemma-4-31b-it"] = new() { InputUsdPerMillion = 0m, OutputUsdPerMillion = 0m },
            ["gemma-4-26b-a4b-it"] = new() { InputUsdPerMillion = 0m, OutputUsdPerMillion = 0m },
        };
    }

    public class GeminiModelPrice
    {
        public decimal InputUsdPerMillion { get; set; }
        public decimal OutputUsdPerMillion { get; set; }

        public bool IsFree => InputUsdPerMillion == 0m && OutputUsdPerMillion == 0m;
    }
}
