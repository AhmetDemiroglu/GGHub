using GGHub.Application.Interfaces;
using Microsoft.Extensions.Logging;
using System.Text.RegularExpressions;
using System.Web;

namespace GGHub.Infrastructure.Services
{
    public class MetacriticService : IMetacriticService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<MetacriticService> _logger;
        // Kilit mekanizması ve rate limit
        private static readonly object _lock = new();
        private static DateTime _lastRequestTime = DateTime.MinValue;
        private const int REQUEST_DELAY_MS = 3000; // 3 saniye bekleme yeterli

        // Metacritic'i kandırmak için tarayıcı kimlikleri havuzu
        private readonly string[] _userAgents = new[]
        {
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/122.0.0.0 Safari/537.36"
        };

        public MetacriticService(IHttpClientFactory httpClientFactory, ILogger<MetacriticService> logger)
        {
            _httpClient = httpClientFactory.CreateClient("Metacritic");
            _logger = logger;
            // Constructor'da Timeout vermek yerine Request anında Token kullanacağız.
        }

        public async Task<MetacriticResult?> GetMetacriticScoreAsync(string gameName, string? releaseDate)
        {
            await ApplyRateLimitAsync();

            try
            {
                var searchQuery = HttpUtility.UrlEncode(gameName);
                var searchUrl = $"https://www.metacritic.com/search/{searchQuery}/?page=1&category=13";

                // HER İSTEKTE YENİ REQUEST MESAJI (Headerları değiştirebilmek için)
                using var request = new HttpRequestMessage(HttpMethod.Get, searchUrl);

                // Rastgele User-Agent seç
                var randomAgent = _userAgents[Random.Shared.Next(_userAgents.Length)];
                request.Headers.TryAddWithoutValidation("User-Agent", randomAgent);
                request.Headers.TryAddWithoutValidation("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
                request.Headers.TryAddWithoutValidation("Accept-Language", "en-US,en;q=0.9");
                request.Headers.TryAddWithoutValidation("Referer", "https://www.google.com/");

                // --- İŞTE ÇÖZÜM: CANCELLATION TOKEN SOURCE ---
                // 30 saniye sonra bu token "İptal" sinyali gönderir.
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));

                try
                {
                    // SendAsync metoduna bu token'ı veriyoruz. 30sn dolarsa istisna fırlatır.
                    using var response = await _httpClient.SendAsync(request, cts.Token);

                    _logger.LogDebug("[Metacritic] Status: {StatusCode} for {Url}", response.StatusCode, searchUrl);

                    if (!response.IsSuccessStatusCode)
                    {
                        _logger.LogWarning("[Metacritic] Failed: {StatusCode} for '{GameName}'", response.StatusCode, gameName);
                        return null;
                    }

                    var html = await response.Content.ReadAsStringAsync(cts.Token);
                    var results = ParseSearchResults(html);

                    if (!results.Any())
                    {
                        // HTML dönmesine rağmen regex tutmadıysa yapı değişmiş veya captcha olabilir
                        _logger.LogWarning("[Metacritic] HTML received but Regex found nothing for '{GameName}'. Len: {Len}", gameName, html.Length);
                        return null;
                    }

                    var bestMatch = FindBestMatch(results, gameName, releaseDate);

                    if (bestMatch != null)
                        _logger.LogInformation("[Metacritic] Found '{GameName}': {Score}", gameName, bestMatch.Score);

                    return bestMatch;
                }
                catch (OperationCanceledException)
                {
                    // Timeout olduğunda burası çalışır
                    _logger.LogError("[Metacritic] TIMEOUT (30s limit) for '{GameName}'. Server did not respond in time.", gameName);
                    return null;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Metacritic] General Error for '{GameName}'", gameName);
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
            if (delayNeeded > 0) await Task.Delay(delayNeeded);
        }

        private List<MetacriticResult> ParseSearchResults(string html)
        {
            var results = new List<MetacriticResult>();
            // Regex değişmedi, aynen koruyoruz
            var itemPattern = new Regex(
                @"<a\s+href=""(/game/[^""]+)""\s+data-testid=""search-result-item""[^>]*>.*?" +
                @"data-testid=""product-release-date""[^>]*>\s*([^<]+)\s*</span>.*?" +
                @"data-testid=""product-metascore""[^>]*>.*?<span[^>]*>(\d+)</span>",
                RegexOptions.Singleline | RegexOptions.IgnoreCase
            );

            var matches = itemPattern.Matches(html);
            foreach (Match match in matches)
            {
                if (match.Groups.Count >= 4 && int.TryParse(match.Groups[3].Value.Trim(), out int score))
                {
                    results.Add(new MetacriticResult
                    {
                        Score = score,
                        Url = $"https://www.metacritic.com{match.Groups[1].Value.Trim()}",
                        ReleaseDate = match.Groups[2].Value.Trim()
                    });
                }
            }
            return results;
        }

        private MetacriticResult? FindBestMatch(List<MetacriticResult> results, string gameName, string? releaseDate)
        {
            if (!results.Any()) return null;
            if (string.IsNullOrEmpty(releaseDate) || !DateTime.TryParse(releaseDate, out DateTime targetDate))
                return results.First();

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
            return (bestMatch != null && bestDaysDiff <= 365) ? bestMatch : results.First();
        }

        private bool TryParseMetacriticDate(string? dateStr, out DateTime result)
        {
            result = DateTime.MinValue;
            if (string.IsNullOrEmpty(dateStr)) return false;
            var formats = new[] { "MMM d, yyyy", "MMMM d, yyyy", "MMM dd, yyyy", "MMMM dd, yyyy" };
            return DateTime.TryParseExact(dateStr.Trim(), formats, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out result);
        }
    }
}