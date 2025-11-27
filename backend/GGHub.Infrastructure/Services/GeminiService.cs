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
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={_apiKey}";

            var prompt = $@"
                Translate the following video game description to Turkish. 
                - Use professional gaming terminology (RPG, loot, quest, etc. can stay or use common TR equivalents).
                - Do NOT translate proper nouns (Game names, specific character names, unique locations).
                - CRITICAL: Keep all HTML tags (<p>, <br>, <strong>, <ul>, <li> etc.) exactly where they are. Do not remove or alter them.
                - Return ONLY the translated text, no explanation or preamble.
                
                Text to translate: 
                {englishText}";

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
            catch
            {
                return englishText;
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