namespace GGHub.Application.Dtos.Home
{
    public class HomeGameDto
    {
        public int Id { get; set; }
        public int RawgId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string? BackgroundImage { get; set; }
        public double Rating { get; set; }  
        public string? ReleaseDate { get; set; }
        public int? MetacriticScore { get; set; }
        public double? RawgRating { get; set; }  
        public double GghubRating { get; set; }   
        public int GghubRatingCount { get; set; } 
        public string? TrailerUrl { get; set; }
        public string? ClipUrl { get; set; }
        public string? Description { get; set; }
        public List<PlatformDto> Platforms { get; set; } = new();
    }
}