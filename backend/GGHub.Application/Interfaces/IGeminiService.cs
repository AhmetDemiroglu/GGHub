namespace GGHub.Application.Interfaces
{
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
