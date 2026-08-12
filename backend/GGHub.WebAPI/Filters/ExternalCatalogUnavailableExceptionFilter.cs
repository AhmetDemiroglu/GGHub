using GGHub.Application.Exceptions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace GGHub.WebAPI.Filters
{
    /// <summary>
    /// Oyun DB'de yok ve dis katalog (RAWG) erisilemez durumdaysa istegin ham 500 yerine
    /// 503 + makine-okur "catalog_unavailable" kodu ile donmesini saglar. Global filter olarak
    /// kayitli oldugu icin EnsureGameExistsAsync uzerinden ayni istisnayi firlatabilen tum
    /// uclar (oyun detay, review olusturma, listeye/wishlist'e ekleme) tek noktadan kapsanir.
    /// 404, "RAWG kesin olarak yok dedi" durumuna ayrilmistir.
    /// </summary>
    public class ExternalCatalogUnavailableExceptionFilter : IExceptionFilter
    {
        private readonly ILogger<ExternalCatalogUnavailableExceptionFilter> _logger;

        public ExternalCatalogUnavailableExceptionFilter(ILogger<ExternalCatalogUnavailableExceptionFilter> logger)
        {
            _logger = logger;
        }

        public void OnException(ExceptionContext context)
        {
            if (context.Exception is not ExternalCatalogUnavailableException ex) return;

            _logger.LogWarning(ex,
                "[Catalog] Dis katalog erisilemez; 503 donuluyor. Path={Path}",
                context.HttpContext.Request.Path);

            context.Result = new ObjectResult(new
            {
                code = "catalog_unavailable",
                message = "Oyun bilgisi şu anda getirilemiyor. Lütfen birazdan tekrar deneyin."
            })
            {
                StatusCode = StatusCodes.Status503ServiceUnavailable
            };
            context.ExceptionHandled = true;
        }
    }
}
