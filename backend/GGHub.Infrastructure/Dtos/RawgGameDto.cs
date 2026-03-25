using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Text.Json.Serialization;

namespace GGHub.Infrastructure.Dtos
{
    public class RawgGameDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("slug")]
        public string Slug { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("released")]
        public string? Released { get; set; }

        [JsonPropertyName("background_image")]
        public string? BackgroundImage { get; set; }

        [JsonPropertyName("rating")]
        public double? Rating { get; set; }

        [JsonPropertyName("metacritic")]
        public int? Metacritic { get; set; }
        [JsonPropertyName("platforms")]
        public List<RawgPlatformWrapperDto> Platforms { get; set; }

        [JsonPropertyName("genres")]
        public List<RawgGenreDto> Genres { get; set; }

        [JsonPropertyName("ratings_count")]
        public int RatingsCount { get; set; }

        [JsonPropertyName("added")]
        public int Added { get; set; }

        [JsonPropertyName("reviews_text_count")]
        public int ReviewsTextCount { get; set; }

        [JsonPropertyName("suggestions_count")]
        public int SuggestionsCount { get; set; }

        [JsonPropertyName("tba")]
        public bool Tba { get; set; }
    }
}
