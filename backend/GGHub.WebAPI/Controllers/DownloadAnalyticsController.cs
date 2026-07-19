using System.Text.Json;
using GGHub.Application.Dtos.DownloadAnalytics;
using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace GGHub.WebAPI.Controllers
{
    /// <summary>
    /// /download-app kampanya telemetrisi. Yazma ucu anonimdir ama yalnızca
    /// Next.js ingest proxy'sinden gelir (paylaşımlı sır); raporlama uçları
    /// yalnızca Admin'e açıktır.
    /// </summary>
    [Route("api/download-analytics")]
    [ApiController]
    public class DownloadAnalyticsController : ControllerBase
    {
        private readonly IDownloadAnalyticsService _service;
        private readonly IConfiguration _configuration;
        private readonly ILogger<DownloadAnalyticsController> _logger;

        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

        /// <summary>Gövde bundan büyükse hiç okunmaz.</summary>
        private const int MaxBodyBytes = 4096;

        public DownloadAnalyticsController(
            IDownloadAnalyticsService service,
            IConfiguration configuration,
            ILogger<DownloadAnalyticsController> logger)
        {
            _service = service;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Ham olay girişi. Yanıt her zaman 204'tür (bozuk gövde hariç): beacon
        /// yanıtı okumaz ve anonim bir uca doğrulama detayı sızdırmak istemeyiz.
        /// </summary>
        [HttpPost("collect")]
        [AllowAnonymous]
        [EnableRateLimiting("DownloadTrackPolicy")]
        [ApiExplorerSettings(IgnoreApi = true)]
        public async Task<IActionResult> Collect()
        {
            var expectedKey = _configuration["DownloadAnalytics:IngestKey"];
            if (!string.IsNullOrWhiteSpace(expectedKey))
            {
                var providedKey = Request.Headers["X-Ingest-Key"].ToString();
                if (!string.Equals(providedKey, expectedKey, StringComparison.Ordinal))
                {
                    _logger.LogDebug("download-analytics: gecersiz ingest anahtari");
                    return NoContent();
                }
            }

            if (Request.ContentLength > MaxBodyBytes) return BadRequest();

            // Gövde text/plain gelir (sendBeacon'da preflight'tan kaçınmak için),
            // bu yüzden model binder devreye girmez; ham okunup elle çözülür.
            using var reader = new StreamReader(Request.Body);
            var json = await reader.ReadToEndAsync();
            if (string.IsNullOrWhiteSpace(json) || json.Length > MaxBodyBytes) return BadRequest();

            DownloadEventForCreationDto? dto;
            try
            {
                dto = JsonSerializer.Deserialize<DownloadEventForCreationDto>(json, JsonOptions);
            }
            catch (JsonException)
            {
                return BadRequest();
            }

            if (dto is null) return BadRequest();

            var context = new DownloadEventContext
            {
                UserAgent = Request.Headers["X-Visitor-UA"].ToString() is { Length: > 0 } ua
                    ? ua
                    : Request.Headers.UserAgent.ToString(),
                CountryCode = Request.Headers["X-Visitor-Country"].ToString(),
                VisitorHash = Request.Headers["X-Visitor-Hash"].ToString(),
            };

            try
            {
                await _service.CollectAsync(dto, context);
            }
            catch (Exception ex)
            {
                // Ölçüm hatası kullanıcı akışını ASLA bozmamalı; yut ve logla.
                _logger.LogWarning(ex, "download-analytics: olay yazilamadi");
            }

            return NoContent();
        }

        [HttpGet("summary")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetSummary([FromQuery] DownloadAnalyticsFilterParams filter)
            => Ok(await _service.GetSummaryAsync(filter));

        [HttpGet("timeseries")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetTimeSeries([FromQuery] DownloadAnalyticsFilterParams filter)
            => Ok(await _service.GetTimeSeriesAsync(filter));

        [HttpGet("breakdown")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetBreakdown([FromQuery] string dimension, [FromQuery] DownloadAnalyticsFilterParams filter)
            => Ok(await _service.GetBreakdownAsync(dimension ?? "channel", filter));

        [HttpGet("funnel")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetFunnel([FromQuery] DownloadAnalyticsFilterParams filter)
            => Ok(await _service.GetFunnelAsync(filter));

        [HttpGet("events")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetEvents([FromQuery] DownloadAnalyticsFilterParams filter)
            => Ok(await _service.GetEventsAsync(filter));
    }
}
