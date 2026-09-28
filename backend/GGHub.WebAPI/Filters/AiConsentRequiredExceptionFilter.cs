using GGHub.Application.Exceptions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace GGHub.WebAPI.Filters
{
    /// <summary>
    /// AiConsentRequiredException -> 403 + makine-okur "ai_consent_required" kodu ve engel sebebi.
    /// Global filter: DM, gonderi/yanit ve inceleme yorumu uclarinin hepsini tek noktadan kapsar.
    /// Istemci (web + mobil axios interceptor) bu kodla onay penceresini acar.
    /// </summary>
    public class AiConsentRequiredExceptionFilter : IExceptionFilter
    {
        public void OnException(ExceptionContext context)
        {
            if (context.Exception is not AiConsentRequiredException ex) return;

            context.Result = new ObjectResult(new
            {
                code = "ai_consent_required",
                reason = ex.Reason,
                message = ex.Message
            })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
            context.ExceptionHandled = true;
        }
    }
}
