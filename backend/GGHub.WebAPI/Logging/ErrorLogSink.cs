using GGHub.Core.Enums;
using GGHub.Infrastructure.Logging;
using Serilog.Core;
using Serilog.Events;

namespace GGHub.WebAPI.Logging
{
    /// <summary>
    /// Error ve ustu seviyedeki HER logu hata kuyruguna kopyalar. Middleware yalnizca
    /// yakalanmamis exception'i gorur; controller'larin catch edip logladigi hatalar, arka plan
    /// isleri ve bot motoru buradan gelir.
    ///
    /// Atlananlar:
    ///   - Serilog istek logu: 5xx yaniti Error seviyesinde yazar, ayni hatanin ikinci kaydi olurdu.
    ///   - EF Core: basarisiz komutu loglar, ardindan AYNI hatayi firlatir; firlatilan hata
    ///     cagiranin logu ya da middleware ile (GGHub stack'iyle birlikte) zaten kaydedilir.
    ///   - Hata kaydinin kendi siniflari (dongu olmasin).
    ///   - Istemcinin baglantiyi kesmesi (OperationCanceledException).
    ///   - Polly (RAWG/Steam/IGDB dayaniklilik boru hatti): her zaman asimi ve yeniden denemeyi Error
    ///     seviyesinde loglar ama istek cogunlukla basariyla biter (yeniden deneme, DB kopyasi, IGDB).
    ///     30 Eyl 2026'da tek bir RAWG zaman asimi "yeni hata" bildirimi uretti, kullanici ise sayfayi
    ///     sorunsuz gordu. Gercek kesinti (her kaynak coktu) uc 503 catalog_unavailable donunce
    ///     middleware'in "ciplak 5xx" kaydiyla yakalanir.
    /// </summary>
    public class ErrorLogSink : ILogEventSink
    {
        private static readonly string[] IgnoredSources =
        {
            "Serilog.AspNetCore.RequestLoggingMiddleware",
            "Microsoft.EntityFrameworkCore",
            "Polly",
            "GGHub.Infrastructure.Logging",
            "GGHub.WebAPI.Logging",
            "GGHub.WebAPI.Middleware.ErrorCaptureMiddleware"
        };

        private readonly ErrorLogQueue _queue;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly string _environment;

        public ErrorLogSink(ErrorLogQueue queue, IHttpContextAccessor httpContextAccessor, IHostEnvironment environment)
        {
            _queue = queue;
            _httpContextAccessor = httpContextAccessor;
            _environment = environment.EnvironmentName;
        }

        public void Emit(LogEvent logEvent)
        {
            if (!_queue.Enabled || logEvent.Level < LogEventLevel.Error) return;

            try
            {
                var logger = SourceContext(logEvent);
                if (logger is not null && IgnoredSources.Any(s => logger.StartsWith(s, StringComparison.Ordinal))) return;

                var exception = logEvent.Exception;
                if (exception is OperationCanceledException) return;
                if (exception is not null && ErrorCaptureFactory.IsCaptured(exception)) return;

                var context = _httpContextAccessor.HttpContext;
                var source = context is not null
                    ? ErrorSource.Api
                    : (logger?.Contains("AiAgent", StringComparison.Ordinal) == true || logger?.Contains(".AiAgents.", StringComparison.Ordinal) == true
                        ? ErrorSource.Bot
                        : ErrorSource.Job);

                var message = logEvent.RenderMessage();
                var capture = exception is not null
                    ? RequestErrorContext.ForException(exception, context, logger, source, message, statusCode: null, _environment)
                    // Exception'siz LogError: gruplama sablondan (degiskenler gruplari bolmesin).
                    : RequestErrorContext.ForMessage("LogError: " + ErrorCaptureFactory.Truncate(logEvent.MessageTemplate.Text, 200),
                        message, context, logger, source, statusCode: null, _environment);

                if (exception is not null) ErrorCaptureFactory.MarkCaptured(exception);
                if (context is not null) context.Items[RequestErrorContext.CapturedItemKey] = true;

                _queue.Enqueue(capture);
            }
            catch
            {
                // Log yazmak asla hata uretmez.
            }
        }

        private static string? SourceContext(LogEvent logEvent)
        {
            return logEvent.Properties.TryGetValue("SourceContext", out var value) && value is ScalarValue { Value: string text }
                ? text
                : null;
        }
    }
}
