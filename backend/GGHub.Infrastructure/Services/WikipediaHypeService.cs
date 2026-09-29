using GGHub.Application.Interfaces;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;

namespace GGHub.Infrastructure.Services
{
    public class WikipediaHypeService : IWikipediaHypeService
    {
        private const string ApiUrl = "https://en.wikipedia.org/w/api.php";
        private const string PageviewsUrl =
            "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user";

        private readonly HttpClient _httpClient;
        private readonly ILogger<WikipediaHypeService> _logger;

        public WikipediaHypeService(IHttpClientFactory httpClientFactory, ILogger<WikipediaHypeService> logger)
        {
            _httpClient = httpClientFactory.CreateClient("Wikipedia");
            _logger = logger;
        }

        public async Task<IReadOnlyList<WikipediaGameArticle>> GetGameArticlesAsync(IEnumerable<int> years, CancellationToken ct = default)
        {
            var articles = new List<WikipediaGameArticle>();
            var yearList = years.Distinct().OrderBy(y => y).ToList();

            foreach (var year in yearList)
            {
                foreach (var title in await GetCategoryMembersAsync($"{year} video games", ct))
                    articles.Add(new WikipediaGameArticle(title, year, false));

                foreach (var title in await GetCategoryMembersAsync($"Upcoming video games scheduled for {year}", ct))
                    articles.Add(new WikipediaGameArticle(title, year, true));
            }

            // Yili henuz belli olmayan beklenenler (tarihi aciklanmamis buyuk yapimlar burada).
            foreach (var title in await GetCategoryMembersAsync("Upcoming video games", ct))
                articles.Add(new WikipediaGameArticle(title, null, true));

            return articles;
        }

        public async Task<int?> GetViews30dAsync(string title, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(title)) return 0;

            // Bugunun verisi henuz olusmamis olur; pencere dun biten 30 tam gundur.
            var end = DateTime.UtcNow.Date.AddDays(-1);
            var start = end.AddDays(-29);
            var encoded = Uri.EscapeDataString(title.Replace(' ', '_'));
            var url = $"{PageviewsUrl}/{encoded}/daily/{start:yyyyMMdd}/{end:yyyyMMdd}";

            for (var attempt = 0; attempt < 3; attempt++)
            {
                ct.ThrowIfCancellationRequested();
                try
                {
                    using var response = await _httpClient.GetAsync(url, ct);

                    // 404 = makale var ama bu aralikta hic okunmamis ya da baslik degismis.
                    if (response.StatusCode == HttpStatusCode.NotFound) return 0;

                    if (response.StatusCode == HttpStatusCode.TooManyRequests)
                    {
                        await Task.Delay(TimeSpan.FromSeconds(2 * (attempt + 1)), ct);
                        continue;
                    }

                    if (!response.IsSuccessStatusCode) return null;

                    await using var stream = await response.Content.ReadAsStreamAsync(ct);
                    using var document = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
                    if (!document.RootElement.TryGetProperty("items", out var items)) return 0;

                    long total = 0;
                    foreach (var item in items.EnumerateArray())
                    {
                        if (item.TryGetProperty("views", out var views)) total += views.GetInt64();
                    }

                    return (int)Math.Min(total, int.MaxValue);
                }
                catch (OperationCanceledException) when (ct.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("[Wikipedia] '{Title}' okunma sayisi alinamadi: {Error}", title, ex.Message);
                    await Task.Delay(TimeSpan.FromSeconds(1 + attempt), ct);
                }
            }

            return null;
        }

        private async Task<List<string>> GetCategoryMembersAsync(string category, CancellationToken ct)
        {
            var titles = new List<string>();
            string? continuation = null;

            // Guvenlik siniri: bir kategori 500'luk sayfalarla gelir; 20 sayfa = 10 bin makale.
            for (var page = 0; page < 20; page++)
            {
                ct.ThrowIfCancellationRequested();

                var url = $"{ApiUrl}?action=query&format=json&list=categorymembers&cmnamespace=0&cmlimit=500" +
                          $"&cmtitle={Uri.EscapeDataString("Category:" + category)}";
                if (continuation != null) url += $"&cmcontinue={Uri.EscapeDataString(continuation)}";

                try
                {
                    using var response = await _httpClient.GetAsync(url, ct);
                    if (!response.IsSuccessStatusCode)
                    {
                        _logger.LogWarning("[Wikipedia] '{Category}' kategorisi okunamadi: {Status}", category, (int)response.StatusCode);
                        break;
                    }

                    await using var stream = await response.Content.ReadAsStreamAsync(ct);
                    using var document = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
                    var root = document.RootElement;

                    if (root.TryGetProperty("query", out var query)
                        && query.TryGetProperty("categorymembers", out var members))
                    {
                        foreach (var member in members.EnumerateArray())
                        {
                            var title = member.TryGetProperty("title", out var t) ? t.GetString() : null;
                            // "List of video games released in 2026" gibi liste sayfalari da ayni
                            // kategoride duruyor ve cok okunuyor; oyun degiller.
                            if (string.IsNullOrWhiteSpace(title) || title.StartsWith("List of ", StringComparison.OrdinalIgnoreCase))
                                continue;
                            titles.Add(title);
                        }
                    }

                    continuation = root.TryGetProperty("continue", out var cont)
                        && cont.TryGetProperty("cmcontinue", out var token)
                        ? token.GetString()
                        : null;

                    if (continuation == null) break;
                    await Task.Delay(200, ct);
                }
                catch (OperationCanceledException) when (ct.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("[Wikipedia] '{Category}' kategorisi okunamadi: {Error}", category, ex.Message);
                    break;
                }
            }

            return titles;
        }
    }
}
