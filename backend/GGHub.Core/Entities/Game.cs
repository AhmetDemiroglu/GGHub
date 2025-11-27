namespace GGHub.Core.Entities
{
    public class Game
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
        public DateTime LastSyncedAt { get; set; }
        public string? PlatformsJson { get; set; }
        public string? GenresJson { get; set; }
        public string? DevelopersJson { get; set; } 
        public string? PublishersJson { get; set; }
        public string? StoresJson { get; set; }    
        public string? WebsiteUrl { get; set; }   
        public string? EsrbRating { get; set; }
        public double AverageRating { get; set; } = 0;
        public int RatingCount { get; set; } = 0;
        public string? DescriptionTr { get; set; }
    }
}