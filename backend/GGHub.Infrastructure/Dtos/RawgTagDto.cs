using System.Text.Json.Serialization;

namespace GGHub.Infrastructure.Dtos
{
    /// <summary>
    /// RAWG etiketi. Hem liste (games) hem detay (games/{id}) ucu dondurur; RAWG'in
    /// kullanici etiketleridir ("Singleplayer", "Open World", "Souls-like"). language
    /// alani "eng" disinda (rusca etiketler) olabilir; yalnizca Ingilizce olanlar alinir.
    /// </summary>
    public class RawgTagDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("slug")]
        public string? Slug { get; set; }

        [JsonPropertyName("language")]
        public string? Language { get; set; }
    }
}
