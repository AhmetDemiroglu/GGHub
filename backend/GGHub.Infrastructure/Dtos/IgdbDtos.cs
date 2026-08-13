using System.Text.Json.Serialization;

namespace GGHub.Infrastructure.Dtos
{
    // IGDB v4 yanit sekilleri (Apicalypse sorgusu ile istenen alanlar).

    public class IgdbTokenResponseDto
    {
        [JsonPropertyName("access_token")]
        public string? AccessToken { get; set; }

        [JsonPropertyName("expires_in")]
        public long ExpiresIn { get; set; }
    }

    /// <summary>
    /// release_dates ucu: bir oyunun BELIRLI bir platformdaki cikis tarihi. Oyun basina
    /// birden fazla satir olabilir (PS5, PC, Xbox ayri ayri); en erken tam tarih kullanilir.
    /// </summary>
    public class IgdbReleaseDateDto
    {
        [JsonPropertyName("id")]
        public long Id { get; set; }

        /// <summary>Unix saniye. category=0 (tam tarih) disinda hassasiyet dusuktur.</summary>
        [JsonPropertyName("date")]
        public long? Date { get; set; }

        /// <summary>
        /// 0=YYYYMMMMDD (tam tarih), 1=YYYYMMM (ay), 2=YYYY, 3..6=ceyrek, 7=TBD.
        /// DIKKAT: eski alan adi "category" idi ve IGDB artik onu DONDURMUYOR; "category = 0"
        /// filtresi hicbir kaydi eslestirmedigi icin senkron sessizce bos donuyordu.
        /// </summary>
        [JsonPropertyName("date_format")]
        public int DateFormat { get; set; }

        [JsonPropertyName("human")]
        public string? Human { get; set; }

        [JsonPropertyName("game")]
        public IgdbGameDto? Game { get; set; }
    }

    public class IgdbGameDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("slug")]
        public string? Slug { get; set; }

        [JsonPropertyName("summary")]
        public string? Summary { get; set; }

        [JsonPropertyName("first_release_date")]
        public long? FirstReleaseDate { get; set; }

        [JsonPropertyName("hypes")]
        public int? Hypes { get; set; }

        [JsonPropertyName("follows")]
        public int? Follows { get; set; }

        [JsonPropertyName("total_rating")]
        public double? TotalRating { get; set; }

        [JsonPropertyName("total_rating_count")]
        public int? TotalRatingCount { get; set; }

        [JsonPropertyName("aggregated_rating")]
        public double? AggregatedRating { get; set; }

        [JsonPropertyName("cover")]
        public IgdbCoverDto? Cover { get; set; }

        /// <summary>Genis (16:9) ekran goruntuleri; kart/hero arka plani icin kapaktan iyidir.</summary>
        [JsonPropertyName("screenshots")]
        public List<IgdbScreenshotRefDto>? Screenshots { get; set; }

        [JsonPropertyName("genres")]
        public List<IgdbNamedDto>? Genres { get; set; }

        [JsonPropertyName("platforms")]
        public List<IgdbPlatformDto>? Platforms { get; set; }

        [JsonPropertyName("involved_companies")]
        public List<IgdbInvolvedCompanyDto>? InvolvedCompanies { get; set; }

        [JsonPropertyName("websites")]
        public List<IgdbWebsiteDto>? Websites { get; set; }

        /// <summary>
        /// "Digital Deluxe Edition" gibi SURUM kayitlarinin ana oyunu. Buyuk yapimlarda cikis
        /// tarihi bazen yalnizca surum kaydinda bulunuyor (ornek: Marvel's Wolverine).
        /// Boyle durumlarda katalogda ana oyunun adi kullanilir, surum adi degil.
        /// </summary>
        [JsonPropertyName("version_parent")]
        public IgdbGameDto? VersionParent { get; set; }

        [JsonPropertyName("parent_game")]
        public IgdbGameDto? ParentGame { get; set; }
    }

    /// <summary>
    /// popularity_primitives ucu: bir oyunun belirli bir kaynaktaki populerlik degeri.
    /// Deger 0..1 arasinda normalize gelir (ornek: 0.0021).
    /// </summary>
    public class IgdbPopularityDto
    {
        [JsonPropertyName("game_id")]
        public int GameId { get; set; }

        [JsonPropertyName("value")]
        public double Value { get; set; }

        [JsonPropertyName("popularity_type")]
        public int PopularityType { get; set; }
    }

    public class IgdbCoverDto
    {
        [JsonPropertyName("image_id")]
        public string? ImageId { get; set; }
    }

    public class IgdbScreenshotRefDto
    {
        [JsonPropertyName("image_id")]
        public string? ImageId { get; set; }
    }

    public class IgdbNamedDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("slug")]
        public string? Slug { get; set; }
    }

    public class IgdbPlatformDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("abbreviation")]
        public string? Abbreviation { get; set; }

        [JsonPropertyName("slug")]
        public string? Slug { get; set; }
    }

    public class IgdbInvolvedCompanyDto
    {
        [JsonPropertyName("company")]
        public IgdbNamedDto? Company { get; set; }

        [JsonPropertyName("developer")]
        public bool Developer { get; set; }

        [JsonPropertyName("publisher")]
        public bool Publisher { get; set; }
    }

    public class IgdbWebsiteDto
    {
        [JsonPropertyName("url")]
        public string? Url { get; set; }

        /// <summary>1=official, 13=steam (IGDB website kategorileri).</summary>
        [JsonPropertyName("category")]
        public int Category { get; set; }
    }
}
