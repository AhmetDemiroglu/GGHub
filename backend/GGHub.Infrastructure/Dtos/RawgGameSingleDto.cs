using System.Text.Json.Serialization;

namespace GGHub.Infrastructure.Dtos
{
    public class RawgGameSingleDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("slug")]
        public string Slug { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("description_raw")]
        public string? Description { get; set; }

        [JsonPropertyName("metacritic")]
        public int? Metacritic { get; set; }

        [JsonPropertyName("released")]
        public string? Released { get; set; }

        [JsonPropertyName("background_image")]
        public string? BackgroundImage { get; set; }

        [JsonPropertyName("website")]
        public string? Website { get; set; }

        [JsonPropertyName("rating")]
        public double? Rating { get; set; }

        [JsonPropertyName("background_image_additional")] // Cover image yerine genelde bu kullanılır veya null gelir
        public string? CoverImage { get; set; }

        [JsonPropertyName("platforms")]
        public List<RawgPlatformWrapperDto>? Platform { get; set; }

        [JsonPropertyName("genres")]
        public List<RawgGenreDto>? Genre { get; set; }

        [JsonPropertyName("esrb_rating")]
        public RawgEsrbDto? EsrbRating { get; set; }

        [JsonPropertyName("developers")]
        public List<RawgDeveloperDto>? Developers { get; set; }

        [JsonPropertyName("publishers")]
        public List<RawgPublisherDto>? Publishers { get; set; }

        [JsonPropertyName("stores")]
        public List<RawgStoreWrapperDto>? Stores { get; set; }
    }
    public class RawgEsrbDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }
        [JsonPropertyName("name")]
        public string Name { get; set; }
        [JsonPropertyName("slug")]
        public string Slug { get; set; }
    }

    public class RawgDeveloperDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }
        [JsonPropertyName("name")]
        public string Name { get; set; }
        [JsonPropertyName("slug")]
        public string Slug { get; set; }
        [JsonPropertyName("image_background")]
        public string? ImageBackground { get; set; }
    }

    public class RawgPublisherDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }
        [JsonPropertyName("name")]
        public string Name { get; set; }
        [JsonPropertyName("slug")]
        public string Slug { get; set; }
    }

    public class RawgStoreWrapperDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }
        [JsonPropertyName("url")]
        public string Url { get; set; }
        [JsonPropertyName("store")]
        public RawgStoreDto Store { get; set; }
    }

    public class RawgStoreDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }
        [JsonPropertyName("name")]
        public string Name { get; set; }
        [JsonPropertyName("slug")]
        public string Slug { get; set; }
        [JsonPropertyName("domain")]
        public string? Domain { get; set; }
    }
}