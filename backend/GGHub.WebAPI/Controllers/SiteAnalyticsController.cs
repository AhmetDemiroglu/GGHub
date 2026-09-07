using System.Security.Claims;
using System.Text.Json;
using GGHub.Application.Dtos.SiteAnalytics;
using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace GGHub.WebAPI.Controllers
{
    /// <summary>
    /// Site geneli davranis/trafik telemetrisi. Yazma ucu anonimdir ama yalnizca Next.js ingest
    /// proxy'sinden gelir (DownloadAnalytics ile AYNI paylasimli sir, yeni bir ortam degiskeni
    /// gerekmez); raporlama uclari yalnizca Admin'e aciktir.
    /// </summary>
    [Route("api/site-analytics")]
    [ApiController]
    public class SiteAnalyticsController : ControllerBase
    {
        private readonly ISiteAnalyticsService _service;
        private readonly IConfiguration _configuration;
        private readonly ILogger<SiteAnalyticsController> _logger;

        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
        private const int MaxBodyBytes = 4096;

        public SiteAnalyticsController(ISiteAnalyticsService service, IConfiguration configuration, ILogger<SiteAnalyticsController> logger)
        {
            _service = service;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Ham olay girisi. [AllowAnonymous] ama JWT gecerliyse kimlik yine cozulur: proxy,
        /// tarayicinin Authorization basligini aynen iletir. Boylece kayitli kullanicinin
        /// gezintisi kimligiyle baglanir, anonim ziyaret ise anonim kalir. Suresi dolmus token
        /// 401 URETMEZ, istek anonim olarak devam eder.
        /// </summary>
        [HttpPost("collect")]
        [AllowAnonymous]
        [EnableRateLimiting("SiteTrackPolicy")]
        [ApiExplorerSettings(IgnoreApi = true)]
        public async Task<IActionResult> Collect()
        {
            var expectedKey = _configuration["DownloadAnalytics:IngestKey"];
            if (!string.IsNullOrWhiteSpace(expectedKey))
            {
                var providedKey = Request.Headers["X-Ingest-Key"].ToString();
                if (!string.Equals(providedKey, expectedKey, StringComparison.Ordinal))
                {
                    _logger.LogDebug("site-analytics: gecersiz ingest anahtari");
                    return NoContent();
                }
            }

            if (Request.ContentLength > MaxBodyBytes) return BadRequest();

            using var reader = new StreamReader(Request.Body);
            var json = await reader.ReadToEndAsync();
            if (string.IsNullOrWhiteSpace(json) || json.Length > MaxBodyBytes) return BadRequest();

            SiteEventForCreationDto? dto;
            try
            {
                dto = JsonSerializer.Deserialize<SiteEventForCreationDto>(json, JsonOptions);
            }
            catch (JsonException)
            {
                return BadRequest();
            }
            if (dto is null) return BadRequest();

            int? userId = null;
            var isAdmin = false;
            if (User.Identity?.IsAuthenticated == true)
            {
                if (int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var parsed)) userId = parsed;
                isAdmin = User.IsInRole("Admin");
            }

            var context = new SiteEventContext
            {
                UserAgent = Request.Headers["X-Visitor-UA"].ToString() is { Length: > 0 } ua ? ua : Request.Headers.UserAgent.ToString(),
                CountryCode = Request.Headers["X-Visitor-Country"].ToString(),
                VisitorHash = Request.Headers["X-Visitor-Hash"].ToString(),
                UserId = userId,
                IsAdmin = isAdmin,
            };

            try
            {
                await _service.CollectAsync(dto, context);
            }
            catch (Exception ex)
            {
                // Olcum hatasi kullanici akisini ASLA bozmamali.
                _logger.LogWarning(ex, "site-analytics: olay yazilamadi");
            }

            return NoContent();
        }

        [HttpGet("summary")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetSummary([FromQuery] SiteAnalyticsFilterParams filter)
            => Ok(await _service.GetSummaryAsync(filter));

        [HttpGet("timeseries")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetTimeSeries([FromQuery] SiteAnalyticsFilterParams filter)
            => Ok(await _service.GetTimeSeriesAsync(filter));

        [HttpGet("heatmap")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetHeatmap([FromQuery] SiteAnalyticsFilterParams filter, [FromQuery] int tzOffset = 0)
            => Ok(await _service.GetHeatmapAsync(filter, Math.Clamp(tzOffset, -840, 840)));

        [HttpGet("sections")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetSections([FromQuery] SiteAnalyticsFilterParams filter)
            => Ok(await _service.GetSectionsAsync(filter));

        [HttpGet("routes")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetRoutes([FromQuery] SiteAnalyticsFilterParams filter)
            => Ok(await _service.GetRoutesAsync(filter));

        [HttpGet("transitions")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetTransitions([FromQuery] SiteAnalyticsFilterParams filter)
            => Ok(await _service.GetTransitionsAsync(filter));

        [HttpGet("content")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetTopContent([FromQuery] string section, [FromQuery] SiteAnalyticsFilterParams filter)
            => Ok(await _service.GetTopContentAsync(section ?? "games", filter));

        [HttpGet("actions")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetActions([FromQuery] SiteAnalyticsFilterParams filter)
            => Ok(await _service.GetActionsAsync(filter));

        [HttpGet("segments")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetSegments([FromQuery] SiteAnalyticsFilterParams filter)
            => Ok(await _service.GetSegmentsAsync(filter));

        [HttpGet("top-users")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetTopUsers([FromQuery] SiteAnalyticsFilterParams filter)
            => Ok(await _service.GetTopUsersAsync(filter));

        [HttpGet("entries")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetEntries([FromQuery] SiteAnalyticsFilterParams filter)
            => Ok(await _service.GetEntryPagesAsync(filter));

        [HttpGet("exits")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetExits([FromQuery] SiteAnalyticsFilterParams filter)
            => Ok(await _service.GetExitPagesAsync(filter));

        [HttpGet("breakdown")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetBreakdown([FromQuery] string dimension, [FromQuery] SiteAnalyticsFilterParams filter)
            => Ok(await _service.GetBreakdownAsync(dimension ?? "channel", filter));

        [HttpGet("sessions")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetSessions([FromQuery] SiteAnalyticsFilterParams filter)
            => Ok(await _service.GetSessionsAsync(filter));

        [HttpGet("sessions/{sessionId:guid}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetSessionSteps(Guid sessionId)
            => Ok(await _service.GetSessionStepsAsync(sessionId));
    }
}
