using GGHub.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Botlarin LLM kapisi: ANA model (ucretsiz Gemma) dakikalik sinirlayicidan gecer; Google 429
    /// donerse ya da sira cok uzun beklerse cagri o seferlik YEDEK modele (ucretli flash-lite) duser.
    /// Yedek model "ai-agent" kaynaginin aylik TL tavanina tabidir (GeminiBudgetService).
    ///
    /// 429 alan model bir sure "sogur": o sure boyunca istekler dogrudan yedege gider, Gemma'nin
    /// kotasini reddedilen isteklerle yakmayiz.
    /// </summary>
    public class AiLlmGateway
    {
        private static readonly TimeSpan PrimaryCooldown = TimeSpan.FromMinutes(15);
        private static readonly TimeSpan MaxQueueWait = TimeSpan.FromSeconds(25);

        private readonly IGeminiService _gemini;
        private readonly IAiSettingsProvider _settings;
        private readonly GeminiRateLimiter _limiter;
        private readonly ILogger<AiLlmGateway> _logger;

        public AiLlmGateway(
            IGeminiService gemini,
            IAiSettingsProvider settings,
            GeminiRateLimiter limiter,
            ILogger<AiLlmGateway> logger)
        {
            _gemini = gemini;
            _settings = settings;
            _limiter = limiter;
            _logger = logger;
        }

        /// <exception cref="GeminiBudgetExceededException">Yedek modele dusuldu ve bot tavani dolu.</exception>
        /// <exception cref="GeminiQuotaExceededException">Iki model de reddetti.</exception>
        public async Task<GeminiGenerateResult> GenerateAsync(
            string systemInstruction,
            IReadOnlyList<GeminiTurn> turns,
            int maxOutputTokens,
            double temperature,
            CancellationToken cancellationToken)
        {
            var settings = await _settings.GetAsync(cancellationToken);
            var primary = settings.PrimaryModel;
            var fallback = settings.FallbackModel;

            if (!string.IsNullOrWhiteSpace(primary) && !_limiter.IsCoolingDown(primary))
            {
                var gotSlot = await _limiter.WaitForSlotAsync(primary, settings.PrimaryModelRpm, MaxQueueWait, cancellationToken);
                if (gotSlot)
                {
                    try
                    {
                        var result = await _gemini.GenerateAsync(Request(primary), cancellationToken);
                        if (result.Text is not null) return result;
                        _logger.LogInformation("[AiAgents] {Model} bos/engelli yanit ({Reason}); yedek deneniyor.", primary, result.FinishReason);
                    }
                    catch (GeminiQuotaExceededException ex)
                    {
                        _limiter.StartCooldown(primary, PrimaryCooldown);
                        _logger.LogWarning("[AiAgents] {Model} 429 ({Msg}); {Min} dk yedek modelle devam.", primary, ex.Message, PrimaryCooldown.TotalMinutes);
                    }
                }
            }

            if (string.IsNullOrWhiteSpace(fallback) || string.Equals(fallback, primary, StringComparison.OrdinalIgnoreCase))
            {
                return new GeminiGenerateResult { Model = primary };
            }

            return await _gemini.GenerateAsync(Request(fallback), cancellationToken);

            GeminiGenerateRequest Request(string model) => new()
            {
                Source = GeminiSources.AiAgent,
                Model = model,
                SystemInstruction = systemInstruction,
                Turns = turns,
                MaxOutputTokens = maxOutputTokens,
                Temperature = temperature
            };
        }
    }
}
