using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using Microsoft.Extensions.Logging;
using System.Text.RegularExpressions;
using System.Web;

namespace GGHub.Infrastructure.Services
{
    public class MetacriticService : IMetacriticService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<MetacriticService> _logger;
        private static readonly object _lock = new();
        private static DateTime _lastRequestTime = DateTime.MinValue;
        private const int REQUEST_DELAY_MS = 5000;

        public MetacriticService(IHttpClientFactory httpClientFactory, ILogger<MetacriticService> logger)
        {
            _httpClient = httpClientFactory.CreateClient("Metacritic");
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            _httpClient.DefaultRequestHeaders.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
            _httpClient.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.5");
            _logger = logger;
        }

        public async Task<MetacriticResult?> GetMetacriticScoreAsync(string gameName, string? releaseDate)
        {
            await ApplyRateLimitAsync();

            try
            {
                var searchQuery = HttpUtility.UrlEncode(gameName);
                var searchUrl = $"https://www.metacritic.com/search/{searchQuery}/?page=1&category=13";

                var response = await _httpClient.GetAsync(searchUrl);

                _logger.LogDebug("[Metacritic] Request to {Url} - Status: {StatusCode}", searchUrl, response.StatusCode);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("[Metacritic] Search failed for '{GameName}': {StatusCode}", gameName, response.StatusCode);
                    return null;
                }

                var html = await response.Content.ReadAsStringAsync();
                var results = ParseSearchResults(html);

                if (!results.Any())
                {
                    _logger.LogWarning("[Metacritic] No results parsed for '{GameName}'. HTML length: {Length}", gameName, html.Length);
                    return null;
                }

                var bestMatch = FindBestMatch(results, gameName, releaseDate);

                if (bestMatch == null)
                {
                    _logger.LogInformation("[Metacritic] No matching game found for '{GameName}' ({ReleaseDate})", gameName, releaseDate);
                    return null;
                }

                _logger.LogInformation("[Metacritic] Found '{GameName}' with score {Score}", gameName, bestMatch.Score);

                return bestMatch;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Metacritic] Error fetching score for '{GameName}'", gameName);
                return null;
            }
        }
        private async Task ApplyRateLimitAsync()
        {
            int delayNeeded = 0;

            lock (_lock)
            {
                var elapsed = DateTime.UtcNow - _lastRequestTime;
                if (elapsed.TotalMilliseconds < REQUEST_DELAY_MS)
                {
                    delayNeeded = REQUEST_DELAY_MS - (int)elapsed.TotalMilliseconds;
                }
                _lastRequestTime = DateTime.UtcNow.AddMilliseconds(delayNeeded);
            }

            if (delayNeeded > 0)
            {
                await Task.Delay(delayNeeded);
            }
        }

        private List<MetacriticResult> ParseSearchResults(string html)
        {
            var results = new List<MetacriticResult>();

            var itemPattern = new Regex(
                @"<a\s+href=""(/game/[^""]+)""\s+data-testid=""search-result-item""[^>]*>.*?" +
                @"data-testid=""product-release-date""[^>]*>\s*([^<]+)\s*</span>.*?" +
                @"data-testid=""product-metascore""[^>]*>.*?<span[^>]*>(\d+)</span>",
                RegexOptions.Singleline | RegexOptions.IgnoreCase
            );

            var matches = itemPattern.Matches(html);

            foreach (Match match in matches)
            {
                if (match.Groups.Count >= 4)
                {
                    var url = match.Groups[1].Value.Trim();
                    var dateStr = match.Groups[2].Value.Trim();
                    var scoreStr = match.Groups[3].Value.Trim();

                    if (int.TryParse(scoreStr, out int score))
                    {
                        results.Add(new MetacriticResult
                        {
                            Score = score,
                            Url = $"https://www.metacritic.com{url}",
                            ReleaseDate = dateStr
                        });
                    }
                }
            }

            return results;
        }

        private MetacriticResult? FindBestMatch(List<MetacriticResult> results, string gameName, string? releaseDate)
        {
            if (!results.Any()) return null;

            if (string.IsNullOrEmpty(releaseDate))
            {
                return results.First();
            }

            if (!DateTime.TryParse(releaseDate, out DateTime targetDate))
            {
                return results.First();
            }

            MetacriticResult? bestMatch = null;
            int bestDaysDiff = int.MaxValue;

            foreach (var result in results)
            {
                if (TryParseMetacriticDate(result.ReleaseDate, out DateTime resultDate))
                {
                    var daysDiff = Math.Abs((resultDate - targetDate).Days);
                    if (daysDiff < bestDaysDiff)
                    {
                        bestDaysDiff = daysDiff;
                        bestMatch = result;
                    }
                }
            }

            if (bestMatch != null && bestDaysDiff <= 365)
            {
                return bestMatch;
            }

            return results.First();
        }

        private bool TryParseMetacriticDate(string? dateStr, out DateTime result)
        {
            result = DateTime.MinValue;
            if (string.IsNullOrEmpty(dateStr)) return false;

            var formats = new[] { "MMM d, yyyy", "MMMM d, yyyy", "MMM dd, yyyy", "MMMM dd, yyyy" };
            return DateTime.TryParseExact(
                dateStr.Trim(),
                formats,
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None,
                out result
            );
        }
    }
}