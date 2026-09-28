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

        /// <summary>
        /// Genel metin uretimi (AI botlari). Kaynagin tavani, ucretli modellerde cagridan ONCE kontrol
        /// edilir; ucretsiz modeller (Gemma) dakikalik istek sinirlayicisindan gecer.
        /// </summary>
        /// <exception cref="GeminiBudgetExceededException">Kaynagin aylik tavani dolduysa (yalniz ucretli model).</exception>
        /// <exception cref="GeminiQuotaExceededException">Google 429 dondu (kota ya da bakiye).</exception>
        Task<GeminiGenerateResult> GenerateAsync(GeminiGenerateRequest request, CancellationToken cancellationToken = default);
    }

    /// <summary>Konusma sirasi. Role: "user" ya da "model".</summary>
    public sealed record GeminiTurn(string Role, string Text);

    public sealed class GeminiGenerateRequest
    {
        public string Source { get; init; } = GeminiSources.AiAgent;
        public string Model { get; init; } = string.Empty;
        public string? SystemInstruction { get; init; }
        public IReadOnlyList<GeminiTurn> Turns { get; init; } = Array.Empty<GeminiTurn>();
        public int MaxOutputTokens { get; init; } = 400;
        public double Temperature { get; init; } = 0.9;
    }

    public sealed class GeminiGenerateResult
    {
        /// <summary>Uretilen metin; uretilemediyse (hata, guvenlik engeli, bos yanit) null.</summary>
        public string? Text { get; init; }
        public string? FinishReason { get; init; }
        public string Model { get; init; } = string.Empty;
        public int InputTokens { get; init; }
        public int OutputTokens { get; init; }
    }
}
