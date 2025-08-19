using System.Text.Json.Serialization;

namespace GGHub.Infrastructure.Dtos
{
    public class RawgPlatformDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }
        [JsonPropertyName("name")]
        public string Name { get; set; }
        [JsonPropertyName("slug")]
        public string Slug { get; set; }
    }

    public class RawgPlatformWrapperDto
    {
        [JsonPropertyName("platform")]
        public RawgPlatformDto Platform { get; set; }
    }
}