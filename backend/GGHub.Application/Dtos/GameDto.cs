namespace GGHub.Application.Dtos
{
    public class GameDto
    {
        public int Id { get; set; }
        public int RawgId { get; set; }
        public string Slug { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Released { get; set; }
        public string? BackgroundImage { get; set; }
        public double? Rating { get; set; }
        public int? Metacritic { get; set; }
        public string? Description { get; set; }
        public string? CoverImage { get; set; }
        public string? WebsiteUrl { get; set; }
        public string? EsrbRating { get; set; }
        public double GghubRating { get; set; }
        public int GghubRatingCount { get; set; }
        public List<PlatformDto> Platforms { get; set; } = new();
        public List<GenreDto> Genres { get; set; } = new();
        public List<DeveloperDto> Developers { get; set; } = new();
        public List<PublisherDto> Publishers { get; set; } = new();
        public List<StoreDto> Stores { get; set; } = new();
        public bool IsInWishlist { get; set; }
        public string? DescriptionTr { get; set; }
    }
    public class DeveloperDto
    {
        public string Name { get; set; }
        public string Slug { get; set; }
        public string? ImageBackground { get; set; }
    }

    public class PublisherDto { public string Name { get; set; } public string Slug { get; set; } }
    public class StoreDto
    {
        public string StoreName { get; set; }
        public string? Domain { get; set; }
        public string Url { get; set; } // Satın alma linki
    }
}