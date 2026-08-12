namespace GGHub.Application.Dtos
{
    public class GameSummaryDto
    {
        public int Id { get; set; }
        public int RawgId { get; set; }
        public string Name { get; set; }
        public string Slug { get; set; }
        public string? CoverImage { get; set; }
        public string? BackgroundImage { get; set; }
        public string? Released { get; set; }
        public double? Rating { get; set; }
        public int? Metacritic { get; set; }
        public double GghubRating { get; set; }
        public int GghubRatingCount
        {
            get; set;
        }
        /// <summary>IGDB toplam puani (0-100); listelerde de 4. puan kaynagi gorunur.</summary>
        public double? IgdbRating { get; set; }
        public int? IgdbRatingCount { get; set; }
    }
}
