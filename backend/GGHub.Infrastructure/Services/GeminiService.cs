using GGHub.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace GGHub.Infrastructure.Services
{
    public class GeminiService : IGeminiService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;

        public GeminiService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _apiKey = configuration["Gemini:ApiKey"] ?? throw new ArgumentNullException("Gemini API Key bulunamadı.");
        }

        public async Task<string> TranslateHtmlDescriptionAsync(string englishText)
        {
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={_apiKey}";

            var prompt = $@"
                GÖREVİN: Aşağıda verilen İngilizce video oyunu açıklamasını TÜRKÇE'ye çevirmek.
                
                KAYNAK METİN (İngilizce):
                ""{englishText}""

                KURALLAR:
                1. Çıktı KESİNLİKLE TÜRKÇE olmalı. Asla İngilizce metni aynen kopyalama.
                2. Metin kısaysa bile mutlaka çevir.
                3. Oyun terimlerini (RPG, FPS, Loot, Quest vb.) olduğu gibi bırak veya Türk oyuncu jargonuna uygun karşılıklarını kullan.
                4. Özel isimleri (Oyun adları, Karakter isimleri, Şehir adları) ASLA çevirme (Örn: 'Wild Hunt' -> 'Vahşi Av' YAPMA).
                5. HTML etiketlerini (<p>, <br>, <strong> vb.) BOZMA ve yerlerini değiştirme.
                6. Sadece çeviriyi ver. ""İşte çeviri:"" gibi giriş cümleleri kullanma.

                TÜRKÇE ÇEVİRİ:
                ";

            var requestBody = new
            {
                contents = new[]
                {
                    new { parts = new[] { new { text = prompt } } }
                }
            };

            try
            {
                var response = await _httpClient.PostAsJsonAsync(url, requestBody);
                response.EnsureSuccessStatusCode();

                var result = await response.Content.ReadFromJsonAsync<GeminiResponse>();
                return result?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text ?? englishText;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GEMINI ERROR] {ex.Message}");
                throw;
            }
        }
        private class GeminiResponse
        {
            [JsonPropertyName("candidates")]
            public List<Candidate>? Candidates { get; set; }
        }
        private class Candidate
        {
            [JsonPropertyName("content")]
            public Content? Content { get; set; }
        }
        private class Content
        {
            [JsonPropertyName("parts")]
            public List<Part>? Parts { get; set; }
        }
        private class Part
        {
            [JsonPropertyName("text")]
            public string? Text { get; set; }
        }
    }
}