namespace GGHub.Infrastructure.Settings
{
    public class GeminiSettings
    {
        public string ApiKey { get; set; } = string.Empty;

        /// <summary>
        /// Fiyat listesindeki en ucuz model. Degistirirsen asagidaki USD/M degerlerini de guncelle.
        /// </summary>
        public string Model { get; set; } = "gemini-3.1-flash-lite";

        /// <summary>
        /// Aylik sert tavan. Dolunca cagri yapilmaz, bir sonraki ay kendiliginden acilir.
        /// 10.00 USD, 16 Tem 2026 kuruyla (1 USD = 47.1 TL) ~471 TL'ye denk gelir; hedef 500 TL/ay
        /// oldugu icin ay ici kur kaymasina pay birakildi. Kur ciddi oynarsa bu deger elle guncellenir.
        /// </summary>
        public decimal MonthlyBudgetUsd { get; set; } = 10.00m;

        /// <summary>gemini-3.1-flash-lite girdi fiyati (1M token basina USD).</summary>
        public decimal InputUsdPerMillion { get; set; } = 0.25m;

        /// <summary>gemini-3.1-flash-lite cikti fiyati (1M token basina USD).</summary>
        public decimal OutputUsdPerMillion { get; set; } = 1.50m;

        /// <summary>
        /// Olculen ortalama ceviri ~480 cikti token'i (aciklamalar ortalama 1193 karakter).
        /// 2048 dort kat pay birakir; buna carpan bir cikti normal degildir, kacak uretim
        /// isaretidir ve tek cagrida aylik butceyi yiyebilir.
        /// </summary>
        public int MaxOutputTokens { get; set; } = 2048;
    }
}
