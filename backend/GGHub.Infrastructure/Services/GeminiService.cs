using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace GGHub.Infrastructure.Services
{
    public class GeminiService : IGeminiService
    {
        private readonly HttpClient _httpClient;
        private readonly IGeminiBudgetService _budget;
        private readonly ILogger<GeminiService> _logger;
        private readonly GeminiSettings _settings;

        public GeminiService(
            HttpClient httpClient,
            IGeminiBudgetService budget,
            IOptions<GeminiSettings> settings,
            ILogger<GeminiService> logger)
        {
            _httpClient = httpClient;
            _budget = budget;
            _logger = logger;
            _settings = settings.Value;

            if (string.IsNullOrWhiteSpace(_settings.ApiKey))
            {
                throw new InvalidOperationException(
                    GGHub.Infrastructure.Localization.AppText.Get("config.geminiApiKeyMissing"));
            }
        }

        public async Task<string?> TranslateHtmlDescriptionAsync(string englishText, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(englishText))
            {
                return null;
            }

            // Tavan servisin ICINDE, job'da degil: boylece /translate ucu dahil her cagri yolu
            // ayni deftere yazar. Job'a koysaydik uc acikta kalirdi.
            await _budget.EnsureBudgetAvailableAsync(cancellationToken);

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_settings.Model}:generateContent";

            var requestBody = new
            {
                contents = new[]
                {
                    new { parts = new[] { new { text = BuildPrompt(englishText) } } }
                },
                generationConfig = new
                {
                    maxOutputTokens = _settings.MaxOutputTokens,
                    temperature = 0.3
                }
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(requestBody)
            };

            // Anahtar query string yerine header'da: query string proxy ve erisim loglarina dusuyor.
            request.Headers.Add("x-goog-api-key", _settings.ApiKey);

            using var response = await _httpClient.SendAsync(request, cancellationToken);

            // 429'u digerlerinden AYIR. Google reddedilen istegi de gunluk kotaya yaziyor, yani
            // sessizce null donup devam etmek kotayi yakmaya devam etmek demek. Ayrica cagiranin
            // buna farkli tepki vermesi gerekiyor: bot gunu kapatmali, uc ise kullaniciya durust
            // bir "simdi olmaz" donmeli.
            if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            {
                await _budget.RecordRejectedCallAsync(cancellationToken);

                var quotaBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning(
                    "[Gemini] 429 kota doldu. Anahtar ucretsiz katmandaysa limit model basina gunde 500 istek. {Body}",
                    quotaBody.Length > 200 ? quotaBody[..200] : quotaBody);

                throw new GeminiQuotaExceededException("Gemini kotasi doldu (HTTP 429).");
            }

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning(
                    "[Gemini] HTTP {Status}: {Body}",
                    (int)response.StatusCode,
                    body.Length > 300 ? body[..300] : body);
                return null;
            }

            GeminiResponse? result;
            try
            {
                result = await response.Content.ReadFromJsonAsync<GeminiResponse>(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[Gemini] Yanit parse edilemedi.");
                return null;
            }

            // Token'lar yandi: metni kullanabilsek de kullanamasak da harcamayi isle.
            // Aksi halde surekli MAX_TOKENS'a carpan bir girdi butceyi sessizce sizdirirdi.
            if (result?.UsageMetadata is { } usage)
            {
                await _budget.RecordUsageAsync(usage.PromptTokenCount, usage.CandidatesTokenCount, cancellationToken);
            }

            var candidate = result?.Candidates?.FirstOrDefault();

            // maxOutputTokens'a carpan yanit yarim kalmis demektir; yarim ceviri bozuk veridir.
            if (string.Equals(candidate?.FinishReason, "MAX_TOKENS", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("[Gemini] Cikti {Max} token sinirina takildi, ceviri yarim; atlandi.", _settings.MaxOutputTokens);
                return null;
            }

            var text = candidate?.Content?.Parts?.FirstOrDefault()?.Text;
            return string.IsNullOrWhiteSpace(text) ? null : text.Trim();
        }

        private static string BuildPrompt(string englishText)
        {
            // Ham string literal: kapanis tirnaginin girintisi taban kabul edilir, yani her satirin
            // basindaki bosluk derlemede dusuyor. Eskiden girintili verbatim string her cagriya
            // ~350 karakter saf bosluk tasiyordu.
            return $"""
                GÖREVİN: Aşağıda verilen İngilizce video oyunu açıklamasını TÜRKÇE'ye çevirmek.

                KAYNAK METİN (İngilizce):
                "{englishText}"

                KURALLAR:
                1. Çıktı KESİNLİKLE TÜRKÇE olmalı. Asla İngilizce metni aynen kopyalama.
                2. Metin kısaysa bile mutlaka çevir.
                3. Oyun terimlerini (RPG, FPS, Loot, Quest vb.) olduğu gibi bırak veya Türk oyuncu jargonuna uygun karşılıklarını kullan.
                4. Özel isimleri (Oyun adları, Karakter isimleri, Şehir adları) ASLA çevirme (Örn: 'Wild Hunt' -> 'Vahşi Av' YAPMA).
                5. HTML etiketlerini (<p>, <br>, <strong> vb.) BOZMA ve yerlerini değiştirme.
                6. Sadece çeviriyi ver. "İşte çeviri:" gibi giriş cümleleri kullanma.

                TÜRKÇE ÇEVİRİ:
                """;
        }

        private class GeminiResponse
        {
            [JsonPropertyName("candidates")]
            public List<Candidate>? Candidates { get; set; }

            [JsonPropertyName("usageMetadata")]
            public UsageMetadata? UsageMetadata { get; set; }
        }

        private class UsageMetadata
        {
            [JsonPropertyName("promptTokenCount")]
            public int PromptTokenCount { get; set; }

            [JsonPropertyName("candidatesTokenCount")]
            public int CandidatesTokenCount { get; set; }
        }

        private class Candidate
        {
            [JsonPropertyName("content")]
            public Content? Content { get; set; }

            [JsonPropertyName("finishReason")]
            public string? FinishReason { get; set; }
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
