namespace GGHub.Application.Interfaces
{
    /// <summary>
    /// Wikipedia'daki bir video oyunu makalesi. Yil, makalenin bulundugu kategoriden gelir
    /// ("2026 video games"); "Upcoming video games" kategorisinde yil olmayabilir.
    /// </summary>
    public record WikipediaGameArticle(string Title, int? Year, bool IsUpcoming);

    /// <summary>
    /// Hype olcumu icin Wikipedia. Anahtarsiz ve ucretsiz; tek sart tanimlayici bir
    /// User-Agent ve isteklerin SIRAYLA atilmasi (paralel atinca 429 donuyor, olculdu).
    /// </summary>
    public interface IWikipediaHypeService
    {
        /// <summary>
        /// Verilen yillarin "video games" kategorilerindeki ve "Upcoming video games"
        /// kategorilerindeki tum makaleler. Oyun basina arama yapmak yerine kategori
        /// okunur: birkac istekle butun liste gelir ve kategori, makalenin gercekten bir
        /// video oyunu oldugunu garanti eder (arama "Growing My Manhole" icin "Mario"
        /// makalesini donduruyordu).
        /// </summary>
        Task<IReadOnlyList<WikipediaGameArticle>> GetGameArticlesAsync(IEnumerable<int> years, CancellationToken ct = default);

        /// <summary>
        /// Makalenin son 30 tam gundeki okunma sayisi. Makale yoksa 0, gecici hata varsa
        /// null doner (null gelen deger DB'deki eski degeri ezmemeli).
        /// </summary>
        Task<int?> GetViews30dAsync(string title, CancellationToken ct = default);
    }
}
