using System.Text.Json.Serialization;

namespace GGHub.Infrastructure.Dtos
{
    // Steam magaza uclarinin (anahtarsiz) yanit sekilleri. Resmi dokumantasyonu olmayan
    // uclardir; alanlar bilinçli olarak nullable tutuldu ki sema kaymalari parse'i dusurmesin.

    // --- storesearch: /api/storesearch/?term=X&cc=us&l=en ---

    public class SteamStoreSearchResponseDto
    {
        [JsonPropertyName("total")]
        public int Total { get; set; }

        [JsonPropertyName("items")]
        public List<SteamStoreSearchItemDto>? Items { get; set; }
    }

    public class SteamStoreSearchItemDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }
    }

    // --- appdetails: /api/appdetails?appids=X&cc=us&l=en ---
    // Yanit appid'ye anahtarlanmis sozluktur: { "3156330": { "success": true, "data": {...} } }

    public class SteamAppDetailsEnvelopeDto
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("data")]
        public SteamAppDataDto? Data { get; set; }
    }

    public class SteamAppDataDto
    {
        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("steam_appid")]
        public int SteamAppId { get; set; }

        [JsonPropertyName("short_description")]
        public string? ShortDescription { get; set; }

        [JsonPropertyName("header_image")]
        public string? HeaderImage { get; set; }

        [JsonPropertyName("website")]
        public string? Website { get; set; }

        [JsonPropertyName("developers")]
        public List<string>? Developers { get; set; }

        [JsonPropertyName("publishers")]
        public List<string>? Publishers { get; set; }

        [JsonPropertyName("platforms")]
        public SteamPlatformsDto? Platforms { get; set; }

        [JsonPropertyName("metacritic")]
        public SteamMetacriticDto? Metacritic { get; set; }

        [JsonPropertyName("genres")]
        public List<SteamGenreDto>? Genres { get; set; }

        [JsonPropertyName("screenshots")]
        public List<SteamScreenshotDto>? Screenshots { get; set; }

        [JsonPropertyName("release_date")]
        public SteamReleaseDateDto? ReleaseDate { get; set; }
    }

    public class SteamPlatformsDto
    {
        [JsonPropertyName("windows")]
        public bool Windows { get; set; }

        [JsonPropertyName("mac")]
        public bool Mac { get; set; }

        [JsonPropertyName("linux")]
        public bool Linux { get; set; }
    }

    public class SteamMetacriticDto
    {
        [JsonPropertyName("score")]
        public int? Score { get; set; }

        [JsonPropertyName("url")]
        public string? Url { get; set; }
    }

    public class SteamGenreDto
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }
    }

    public class SteamScreenshotDto
    {
        [JsonPropertyName("path_full")]
        public string? PathFull { get; set; }
    }

    public class SteamReleaseDateDto
    {
        [JsonPropertyName("coming_soon")]
        public bool ComingSoon { get; set; }

        /// <summary>cc=us&amp;l=en ile ornekler: "24 Jan, 2024", "Aug 12, 2026", "Q4 2026", "2026", "To be announced".</summary>
        [JsonPropertyName("date")]
        public string? Date { get; set; }
    }

    // --- featuredcategories: /api/featuredcategories?cc=us&l=en ---

    public class SteamFeaturedCategoriesDto
    {
        [JsonPropertyName("new_releases")]
        public SteamFeaturedCategoryDto? NewReleases { get; set; }

        [JsonPropertyName("coming_soon")]
        public SteamFeaturedCategoryDto? ComingSoon { get; set; }
    }

    public class SteamFeaturedCategoryDto
    {
        [JsonPropertyName("items")]
        public List<SteamFeaturedItemDto>? Items { get; set; }
    }

    public class SteamFeaturedItemDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }
    }
}
