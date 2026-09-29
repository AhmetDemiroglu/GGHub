using GGHub.Core.Enums;
using GGHub.Infrastructure.Localization;
using GGHub.Infrastructure.Logging;
using GGHub.WebAPI.Logging;

namespace GGHub.WebAPI.Middleware
{
    /// <summary>
    /// Yakalanmamis exception'larin son duragi. Eskiden boyle bir katman YOKTU: hata bos govdeli
    /// 500 olarak donuyor, yalnizca Railway konsoluna dusuyordu (ornek: yaniti olan liste yorumunu
    /// silmek). Simdi hata kuyruga yazilir (admin paneli /errors) ve istemciye makine-okur bir
    /// govde doner: { message, code: "server_error", errorId }.
    ///
    /// Ikinci gorev: exception'i yutup HICBIR SEY loglamadan 5xx donen uclar. Yanit 5xx ise ve
    /// bu istekte baska bir hata kaydedilmediyse "ciplak 5xx" olarak kaydedilir.
    ///
    /// MVC exception filtreleri (catalog_unavailable, ai_consent_required) bundan ONCE calisir;
    /// onlarin ele aldigi hatalar buraya hic ulasmaz.
    /// </summary>
    public class ErrorCaptureMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ErrorLogQueue _queue;
        private readonly string _environment;

        public ErrorCaptureMiddleware(RequestDelegate next, ErrorLogQueue queue, IHostEnvironment environment)
        {
            _next = next;
            _queue = queue;
            _environment = environment.EnvironmentName;
        }

        /// <summary>Accept-Language'in ilk dili ("tr-TR,tr;q=0.9" -> "tr-TR"), desteklenen dile indirgenmis.</summary>
        private static string RequestLocale(HttpContext context)
        {
            var first = context.Request.Headers.AcceptLanguage.ToString().Split(',')[0].Split(';')[0].Trim();
            return AppText.NormalizeLocale(first);
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
            {
                // Istemci baglantiyi kesti: hata degil, kayda girmez.
                if (!context.Response.HasStarted) context.Response.StatusCode = 499;
                return;
            }
            catch (Exception exception)
            {
                if (!ErrorCaptureFactory.IsCaptured(exception))
                {
                    ErrorCaptureFactory.MarkCaptured(exception);
                    _queue.Enqueue(RequestErrorContext.ForException(
                        exception, context, logger: null, ErrorSource.Api, message: null,
                        StatusCodes.Status500InternalServerError, _environment));
                }
                context.Items[RequestErrorContext.CapturedItemKey] = true;

                // Yanit baslamissa (akis, SignalR) govde yazilamaz; hatayi sunucuya birak.
                if (context.Response.HasStarted) throw;

                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await context.Response.WriteAsJsonAsync(new
                {
                    // Istek kulturu burada YOK: UseRequestLocalization ic katmanda kurulur ve
                    // exception disari cikarken geri alinir. Dil dogrudan basliktan okunur.
                    message = AppText.GetFor(RequestLocale(context), "common.serverError"),
                    code = "server_error",
                    errorId = context.TraceIdentifier
                });
                return;
            }

            if (context.Response.StatusCode >= 500 && !context.Items.ContainsKey(RequestErrorContext.CapturedItemKey))
            {
                _queue.Enqueue(RequestErrorContext.ForMessage(
                    $"Http{context.Response.StatusCode}",
                    $"HTTP {context.Response.StatusCode}: uc exception'i yuttu ya da loglamadan hata dondu.",
                    context, logger: null, ErrorSource.Api, context.Response.StatusCode, _environment));
            }
        }
    }
}
