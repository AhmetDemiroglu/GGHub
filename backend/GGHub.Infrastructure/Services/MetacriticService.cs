using GGHub.Application.Interfaces;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace GGHub.Infrastructure.Services
{
    public class MetacriticService : IMetacriticService
    {
        public const string StatusSuccess = "success";
        public const string StatusNoResults = "no_results";
        public const string StatusNoScore = "no_score";
        public const string StatusTimeout = "timeout";
        public const string StatusHttpError = "http_error";
        public const string StatusParseError = "parse_error";
        public const string StatusException = "exception";

        private readonly HttpClient _httpClient;
        private readonly ILogger<MetacriticService> _logger;
        private static readonly object _rateLimitLock = new();
        private static DateTime _lastRequestTime = DateTime.MinValue;
        private const int RequestDelayMs = 3000;

        public MetacriticService(IHttpClientFactory httpClientFactory, ILogger<MetacriticService> logger)
        {
            _httpClient = httpClientFactory.CreateClient("Metacritic");
            _httpClient.Timeout = TimeSpan.FromSeconds(30);
            _logger = logger;
        }

        public async Task<MetacriticResult?> GetMetacriticScoreAsync(string gameName, string? releaseDate)
        {
            await ApplyRateLimitAsync();

            try
            {
                var searchQuery = Uri.EscapeDataString(gameName);
                var searchUrl = $"https://backend.metacritic.com/finder/metacritic/search/{searchQuery}/web?offset=0&limit=30&mcoTypeId=13&sortBy=&sortDirection=DESC&componentName=search&componentDisplayName=Search&componentType=SearchResults";

                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));

                try
                {
                    using var response = await _httpClient.GetAsync(searchUrl, cts.Token);

                    _logger.LogDebug("[Metacritic] Status: {StatusCode} for {Url}", response.StatusCode, searchUrl);

                    if (!response.IsSuccessStatusCode)
                    {
                        _logger.LogWarning("[Metacritic] Failed: {StatusCode} for '{GameName}'", response.StatusCode, gameName);
                        return new MetacriticResult { DebugInfo = StatusHttpError };
                    }

                    var json = await response.Content.ReadAsStringAsync(cts.Token);
                    var parsedResults = ParseSearchResults(json);

                    if (!parsedResults.Any())
                    {
                        _logger.LogWarning("[Metacritic] Search returned no results for '{GameName}'. Len: {Len}", gameName, json.Length);
                        return new MetacriticResult { DebugInfo = StatusNoResults };
                    }

                    var bestMatch = FindBestMatch(parsedResults, releaseDate);

                    if (bestMatch == null)
                    {
                        _logger.LogWarning("[Metacritic] Could not choose a match for '{GameName}'.", gameName);
                        return new MetacriticResult { DebugInfo = StatusParseError };
                    }

                    if (bestMatch.Score.HasValue)
                    {
                        _logger.LogInformation("[Metacritic] Found '{GameName}': {Score}", gameName, bestMatch.Score.Value);
                        bestMatch.DebugInfo = StatusSuccess;
                    }
                    else
                    {
                        _logger.LogInformation("[Metacritic] Found result but no metascore for '{GameName}'.", gameName);
                        bestMatch.DebugInfo = StatusNoScore;
                    }

                    return bestMatch;
                }
                catch (OperationCanceledException)
                {
                    _logger.LogError("[Metacritic] TIMEOUT (30s limit) for '{GameName}'. Server did not respond in time.", gameName);
                    return new MetacriticResult { DebugInfo = StatusTimeout };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Metacritic] General Error for '{GameName}'", gameName);
                return new MetacriticResult { DebugInfo = StatusException };
            }
        }

        private async Task ApplyRateLimitAsync()
        {
            int delayNeeded = 0;

            lock (_rateLimitLock)
            {
                var elapsed = DateTime.UtcNow - _lastRequestTime;
                if (elapsed.TotalMilliseconds < RequestDelayMs)
                {
                    delayNeeded = RequestDelayMs - (int)elapsed.TotalMilliseconds;
                }
                _lastRequestTime = DateTime.UtcNow.AddMilliseconds(delayNeeded);
            }

            if (delayNeeded > 0)
            {
                await Task.Delay(delayNeeded);
            }
        }

        private List<MetacriticResult> ParseSearchResults(string json)
        {
            var results = new List<MetacriticResult>();

            try
            {
                using var document = JsonDocument.Parse(json);
                if (!document.RootElement.TryGetProperty("data", out var dataElement) ||
                    !dataElement.TryGetProperty("items", out var itemsElement) ||
                    itemsElement.ValueKind != JsonValueKind.Array)
                {
                    return results;
                }

                foreach (var item in itemsElement.EnumerateArray())
                {
                    var relativeUrl = string.Empty;
                    int? score = null;

                    if (item.TryGetProperty("criticScoreSummary", out var scoreSummaryElement) &&
                        scoreSummaryElement.ValueKind == JsonValueKind.Object)
                    {
                        if (scoreSummaryElement.TryGetProperty("url", out var urlElement))
                        {
                            relativeUrl = urlElement.GetString() ?? string.Empty;
                        }

                        if (scoreSummaryElement.TryGetProperty("score", out var scoreElement) &&
                            scoreElement.ValueKind == JsonValueKind.Number &&
                            scoreElement.TryGetInt32(out var parsedScore))
                        {
                            score = parsedScore;
                        }
                    }

                    if (string.IsNullOrWhiteSpace(relativeUrl))
                    {
                        continue;
                    }

                    var parsedReleaseDate = item.TryGetProperty("releaseDate", out var releaseDateElement)
                        ? releaseDateElement.GetString()
                        : null;

                    results.Add(new MetacriticResult
                    {
                        Score = score,
                        Url = $"https://www.metacritic.com{relativeUrl}",
                        ReleaseDate = parsedReleaseDate
                    });
                }
            }
            catch (JsonException)
            {
                return results;
            }

            return results;
        }

        private MetacriticResult? FindBestMatch(List<MetacriticResult> results, string? releaseDate)
        {
            if (!results.Any())
            {
                return null;
            }

            if (string.IsNullOrEmpty(releaseDate) || !DateTime.TryParse(releaseDate, out var targetDate))
            {
                return results.First();
            }

            MetacriticResult? bestMatch = null;
            var bestDaysDiff = int.MaxValue;

            foreach (var result in results)
            {
                if (TryParseMetacriticDate(result.ReleaseDate, out var resultDate))
                {
                    var daysDiff = Math.Abs((resultDate - targetDate).Days);
                    if (daysDiff < bestDaysDiff)
                    {
                        bestDaysDiff = daysDiff;
                        bestMatch = result;
                    }
                }
            }

            return (bestMatch != null && bestDaysDiff <= 365) ? bestMatch : results.First();
        }

        private bool TryParseMetacriticDate(string? dateStr, out DateTime result)
        {
            result = DateTime.MinValue;
            if (string.IsNullOrEmpty(dateStr))
            {
                return false;
            }

            var formats = new[] { "yyyy-MM-dd", "MMM d, yyyy", "MMMM d, yyyy", "MMM dd, yyyy", "MMMM dd, yyyy" };
            return DateTime.TryParseExact(
                dateStr.Trim(),
                formats,
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None,
                out result);
        }
    }
}
