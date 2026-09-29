using System.Security.Claims;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Logging;

namespace GGHub.WebAPI.Logging
{
    /// <summary>
    /// HttpContext'ten hata kaydi alanlarini kopyalar. Middleware ve Serilog sink ayni
    /// kodu kullanir; kopya yakalama ANINDA alinir cunku yazici istek bittikten sonra calisir.
    /// </summary>
    public static class RequestErrorContext
    {
        /// <summary>Bu istekte en az bir hata kaydedildi mi (ciplak 5xx kaydini bastirmak icin).</summary>
        public const string CapturedItemKey = "gghub.errorCaptured";

        public static ErrorCapture ForException(Exception exception, HttpContext? context, string? logger, ErrorSource source, string? message, int? statusCode, string environment)
        {
            return Fill(new ErrorCapture
            {
                Source = source,
                ExceptionType = exception.GetType().FullName ?? exception.GetType().Name,
                Message = Compose(message, exception.Message),
                Logger = logger,
                StackTrace = ErrorCaptureFactory.FullStack(exception),
                InnerChain = ErrorCaptureFactory.InnerChain(exception),
                TopFrame = ErrorCaptureFactory.TopFrame(exception),
                StatusCode = statusCode,
                Environment = environment
            }, context);
        }

        public static ErrorCapture ForMessage(string exceptionType, string message, HttpContext? context, string? logger, ErrorSource source, int? statusCode, string environment)
        {
            return Fill(new ErrorCapture
            {
                Source = source,
                ExceptionType = exceptionType,
                Message = ErrorCaptureFactory.Truncate(message, ErrorCaptureFactory.MaxMessage),
                Logger = logger,
                StatusCode = statusCode,
                Environment = environment
            }, context);
        }

        private static ErrorCapture Fill(ErrorCapture capture, HttpContext? context)
        {
            if (context is null) return capture;

            try
            {
                var request = context.Request;
                var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var route = (context.GetEndpoint() as RouteEndpoint)?.RoutePattern.RawText;

                return capture with
                {
                    Method = request.Method,
                    RouteTemplate = route ?? (context.GetEndpoint() is null ? null : request.Path.Value),
                    Path = request.Path.Value,
                    QueryString = ErrorCaptureFactory.MaskQueryString(request.QueryString.Value),
                    UserId = int.TryParse(userId, out var id) ? id : null,
                    Username = context.User.FindFirst(ClaimTypes.Name)?.Value,
                    UserAgent = request.Headers.UserAgent.ToString() is { Length: > 0 } agent ? agent : null,
                    Locale = request.Headers.AcceptLanguage.ToString() is { Length: > 0 } language
                        ? ErrorCaptureFactory.Truncate(language, 16)
                        : null,
                    TraceId = context.TraceIdentifier
                };
            }
            catch
            {
                // Istek nesnesi kapanmis olabilir (yanit bittikten sonra atilan log). Istek
                // alanlari olmadan da kayit degerli.
                return capture;
            }
        }

        /// <summary>Log mesaji ile exception mesaji farkliysa ikisi birlikte: "log mesaji | exception mesaji".</summary>
        private static string Compose(string? logMessage, string exceptionMessage)
        {
            if (string.IsNullOrWhiteSpace(logMessage) || logMessage.Contains(exceptionMessage, StringComparison.Ordinal))
            {
                return ErrorCaptureFactory.Truncate(string.IsNullOrWhiteSpace(logMessage) ? exceptionMessage : logMessage, ErrorCaptureFactory.MaxMessage);
            }
            return ErrorCaptureFactory.Truncate($"{logMessage} | {exceptionMessage}", ErrorCaptureFactory.MaxMessage);
        }
    }
}
