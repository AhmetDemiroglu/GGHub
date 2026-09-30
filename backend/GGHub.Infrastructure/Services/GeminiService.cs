using GGHub.Core.Utilities;
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
            await _budget.EnsureBudgetAvailableAsync(GeminiSources.Translation, _settings.Model, cancellationToken);

            var requestBody = new Dictionary<string, object>
            {
                ["contents"] = new[]
                {
                    new { role = "user", parts = new[] { new { text = BuildPrompt(englishText) } } }
                },
                ["generationConfig"] = new Dictionary<string, object>
                {
                    ["maxOutputTokens"] = _settings.MaxOutputTokens,
                    ["temperature"] = 0.3
                }
            };

            var result = await SendAsync(GeminiSources.Translation, _settings.Model, requestBody, cancellationToken);
            if (result is null)
            {
                return null;
            }

            // maxOutputTokens'a carpan yanit yarim kalmis demektir; yarim ceviri bozuk veridir.
            if (string.Equals(result.FinishReason, "MAX_TOKENS", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("[Gemini] Cikti {Max} token sinirina takildi, ceviri yarim; atlandi.", _settings.MaxOutputTokens);
                return null;
            }

            return result.Text;
        }

        public async Task<GeminiGenerateResult> GenerateAsync(GeminiGenerateRequest request, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.Model) || request.Turns.Count == 0)
            {
                return new GeminiGenerateResult { Model = request.Model };
            }

            await _budget.EnsureBudgetAvailableAsync(request.Source, request.Model, cancellationToken);

            var generationConfig = new Dictionary<string, object>
            {
                ["maxOutputTokens"] = request.MaxOutputTokens,
                ["temperature"] = request.Temperature
            };

            // Bot metinleri kisa ve gunluk dilde; dusunme adimi yalnizca token ve gecikme ekliyor.
            // "minimal" Gemma 4 ve Gemini 3 ailesinde gecerli (ai.google.dev, Eyl 2026).
            if (request.Model.StartsWith("gemma-", StringComparison.OrdinalIgnoreCase) ||
                request.Model.StartsWith("gemini-3", StringComparison.OrdinalIgnoreCase))
            {
                generationConfig["thinkingConfig"] = new { thinkingLevel = "minimal" };
            }

            var requestBody = new Dictionary<string, object>
            {
                ["contents"] = request.Turns
                    .Select(t => new { role = t.Role, parts = new[] { new { text = t.Text } } })
                    .ToArray(),
                ["generationConfig"] = generationConfig
            };

            if (!string.IsNullOrWhiteSpace(request.SystemInstruction))
            {
                requestBody["systemInstruction"] = new { parts = new[] { new { text = request.SystemInstruction } } };
            }

            var result = await SendAsync(request.Source, request.Model, requestBody, cancellationToken);
            return result ?? new GeminiGenerateResult { Model = request.Model };
        }

        /// <summary>
        /// Ortak HTTP yolu: gonder, 429'u ayir, kullanimi deftere yaz, metni cikar.
        /// null = ceviri/metin uretilemedi (HTTP hatasi, parse hatasi).
        /// </summary>
        private async Task<GeminiGenerateResult?> SendAsync(
            string source, string model, object requestBody, CancellationToken cancellationToken)
        {
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

            using var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(requestBody)
            };

            // Anahtar query string yerine header'da: query string proxy ve erisim loglarina dusuyor.
            request.Headers.Add("x-goog-api-key", _settings.ApiKey);

            using var response = await _httpClient.SendAsync(request, cancellationToken);

            // 429'u digerlerinden AYIR. Google reddedilen istegi de kotaya yaziyor, yani sessizce
            // null donup devam etmek kotayi yakmaya devam etmek demek. Ayrica cagiranin buna farkli
            // tepki vermesi gerekiyor: ceviri job'u gunu kapatmali, bot yedek modele gecmeli, uc ise
            // kullaniciya durust bir "simdi olmaz" donmeli.
            if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            {
                await _budget.RecordRejectedCallAsync(source, model, cancellationToken);

                var quotaBody = await response.Content.ReadAsStringAsync(cancellationToken);

                // 429'un IKI ayri sebebi var ve karistirilmasi pahaliya mal oluyor:
                //   a) hiz/kota limiti  -> bir sure sonra kendiliginden acilir
                //   b) BAKIYE bitmesi   -> Google'a kredi yuklenene kadar ACILMAZ
                // 3-6 Eylul 2026'da bot dort gun bosta durdu ve log yanlis yeri isaret ettigi icin sebep
                // ancak yanit govdesi okununca anlasildi ("Your prepayment credits are depleted").
                var isBilling = quotaBody.Contains("prepayment", StringComparison.OrdinalIgnoreCase)
                    || quotaBody.Contains("credits are depleted", StringComparison.OrdinalIgnoreCase)
                    || quotaBody.Contains("billing", StringComparison.OrdinalIgnoreCase);

                if (isBilling)
                {
                    _logger.LogWarning(
                        "[Gemini] 429 ({Model}): GOOGLE HESABININ BAKIYESI BITMIS (kota degil). Kredi "
                        + "yuklenene kadar ucretli cagrilar duracak. https://ai.studio/projects {Body}",
                        model, SafeText.Truncate(quotaBody, 300));
                }
                else
                {
                    _logger.LogWarning(
                        "[Gemini] 429 kota/hiz limiti ({Model}). {Body}",
                        model, SafeText.Truncate(quotaBody, 300));
                }

                throw new GeminiQuotaExceededException(
                    isBilling
                        ? "Google hesabinin bakiyesi bitmis (HTTP 429); kredi yuklenmeli."
                        : $"Gemini kotasi doldu (HTTP 429, {model}).",
                    isBilling);
            }

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning(
                    "[Gemini] HTTP {Status} ({Model}): {Body}",
                    (int)response.StatusCode,
                    model,
                    SafeText.Truncate(body, 300));
                return null;
            }

            GeminiResponse? result;
            try
            {
                result = await response.Content.ReadFromJsonAsync<GeminiResponse>(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[Gemini] Yanit parse edilemedi ({Model}).", model);
                return null;
            }

            // Token'lar yandi: metni kullanabilsek de kullanamasak da harcamayi isle.
            // Aksi halde surekli MAX_TOKENS'a carpan bir girdi butceyi sessizce sizdirirdi.
            var inputTokens = result?.UsageMetadata?.PromptTokenCount ?? 0;
            var outputTokens = (result?.UsageMetadata?.CandidatesTokenCount ?? 0)
                             + (result?.UsageMetadata?.ThoughtsTokenCount ?? 0);
            if (inputTokens > 0 || outputTokens > 0)
            {
                await _budget.RecordUsageAsync(source, model, inputTokens, outputTokens, cancellationToken);
            }

            var candidate = result?.Candidates?.FirstOrDefault();

            // Dusunme parcalari (thought = true) cevaba dahil degil.
            var text = string.Concat(
                candidate?.Content?.Parts?
                    .Where(p => p.Thought != true && !string.IsNullOrEmpty(p.Text))
                    .Select(p => p.Text) ?? Enumerable.Empty<string?>());

            return new GeminiGenerateResult
            {
                Text = string.IsNullOrWhiteSpace(text) ? null : text.Trim(),
                FinishReason = candidate?.FinishReason,
                Model = model,
                InputTokens = inputTokens,
                OutputTokens = outputTokens
            };
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

            /// <summary>Dusunme token'lari ayri raporlanir ama cikti fiyatindan faturalanir.</summary>
            [JsonPropertyName("thoughtsTokenCount")]
            public int ThoughtsTokenCount { get; set; }
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

            [JsonPropertyName("thought")]
            public bool? Thought { get; set; }
        }
    }
}
