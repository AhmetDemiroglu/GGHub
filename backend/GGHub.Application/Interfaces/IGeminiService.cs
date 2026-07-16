namespace GGHub.Application.Interfaces
{
    /// <summary>
    /// Ceviri istendi ama uretilemedi (Gemini hata dondu, bos yanit verdi veya cikti sinirina
    /// takildi). Bilerek exception: sessizce Ingilizce metni dondurmek, cagiranin basarili
    /// sanmasina ve kullaniciya "Ceviri tamamlandi" denmesine yol aciyordu.
    /// </summary>
    public class GeminiTranslationFailedException : Exception
    {
        public GeminiTranslationFailedException(string message) : base(message) { }
    }

    public interface IGeminiService
    {
        /// <summary>
        /// Ingilizce HTML aciklamayi Turkce'ye cevirir.
        /// </summary>
        /// <returns>
        /// Ceviri metni, ya da ceviri uretilemediyse <c>null</c>. Cagiran null gelirse HICBIR SEY
        /// yazmamalidir. Eskiden hata durumunda ingilizce metnin kendisi donuyordu ve bu, DB'ye
        /// "Turkce ceviri" diye Ingilizce metin yazilmasina yol aciyordu.
        /// </returns>
        /// <exception cref="GeminiBudgetExceededException">Aylik butce dolduysa.</exception>
        Task<string?> TranslateHtmlDescriptionAsync(string englishText, CancellationToken cancellationToken = default);
    }
}
