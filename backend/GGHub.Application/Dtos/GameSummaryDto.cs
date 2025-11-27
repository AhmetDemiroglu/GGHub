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
    }
}
