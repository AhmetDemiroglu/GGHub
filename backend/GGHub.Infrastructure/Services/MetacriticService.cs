using GGHub.Application.Interfaces;
using GGHub.Core.Specifications;
using Microsoft.Extensions.Logging;
using System.Text;
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

                    var bestMatch = FindBestMatch(parsedResults, gameName, releaseDate);

                    if (bestMatch == null)
                    {
                        // Sonuc geldi ama hicbiri bu oyun oldugundan emin olamadigimiz kadar zayif.
                        // Bilerek no_results donuyoruz: parse_error gecici sayilip 30 dakikada bir
                        // yeniden denenirdi ve guvenle esleyemedigimiz her oyun sonsuz dongude kalirdi.
                        _logger.LogInformation("[Metacritic] No confident match for '{GameName}' among {Count} result(s).", gameName, parsedResults.Count);
                        return new MetacriticResult { DebugInfo = StatusNoResults };
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

                        // Metacritic puansiz oyunlar icin 0 donuyor; gercek metascore araligi 1-100.
                        // 0'i gecerli puan sayarsak DB'ye "0 puan almis oyun" diye yaziyoruz.
                        if (scoreSummaryElement.TryGetProperty("score", out var scoreElement) &&
                            scoreElement.ValueKind == JsonValueKind.Number &&
                            scoreElement.TryGetInt32(out var parsedScore) &&
                            parsedScore >= 1 && parsedScore <= 100)
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

                    var parsedTitle = item.TryGetProperty("title", out var titleElement)
                        ? titleElement.GetString()
                        : null;

                    results.Add(new MetacriticResult
                    {
                        Score = score,
                        Url = $"https://www.metacritic.com{relativeUrl}",
                        ReleaseDate = parsedReleaseDate,
                        Title = parsedTitle
                    });
                }
            }
            catch (JsonException)
            {
                return results;
            }

            return results;
        }

        // Metacritic aramasi bulanik: "limbo" sorgusu LIMBO, LIMBO+ ve Depths of Limbo donduruyor.
        // Emin olamadigimizda puan yazmamak, yanlis oyunun puanini yazmaktan iyidir; DB'deki hatali
        // puani sonradan fark etmek neredeyse imkansiz, eksik puani ise her zaman sonra tamamlayabiliriz.
        private MetacriticResult? FindBestMatch(List<MetacriticResult> results, string gameName, string? releaseDate)
        {
            if (results.Count == 0)
            {
                return null;
            }

            var normalizedQuery = NormalizeTitle(gameName);
            var nameMatches = normalizedQuery.Length == 0
                ? new List<MetacriticResult>()
                : results.Where(r => NormalizeTitle(r.Title) == normalizedQuery).ToList();

            DateTime targetDate = default;
            var hasTargetDate = !string.IsNullOrEmpty(releaseDate)
                && DateTime.TryParse(
                    releaseDate,
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None,
                    out targetDate);

            // 1) Isim birebir tutuyor: en guvenilir sinyal. Ayni isimde birden fazla kayit varsa
            //    (LIMBO / LIMBO+ gibi) tarihe en yakini sec.
            if (nameMatches.Count > 0)
            {
                if (!hasTargetDate)
                {
                    return nameMatches[0];
                }

                return ClosestByDate(nameMatches, targetDate, out _) ?? nameMatches[0];
            }

            // 2) Isim tutmuyor -> REDDET.
            //
            // Burada bir zamanlar "isim tutmasa da cikis tarihi 365 gun icindeyse kabul et"
            // kademesi vardi. Prod verisinden 25 oyunluk rastgele orneklemle olculdu ve
            // guvenilir olmadigi gorulur: her yil yuzlerce oyun cikiyor, dolayisiyla tarih
            // yakinligi tek basina hicbir sey kanitlamiyor. Urettigi gercek hatalar:
            //   "Nina - Fighter"                -> Street Fighter 6'nin 92'si
            //   "GTA EL-VANDREAS: Fan-made game" -> gercek bir GTA kaydinin 92'si
            // Kademe kaldirilinca ayni orneklemde yanlis eslesme 0'a indi.
            //
            // Takas bilincli: isimlendirmesi farkli birkac gercek puani kaybediyoruz
            // (orn. ORION: Prelude). Yanlis puan sessizce yanlis veridir ve kimse fark etmez;
            // eksik puan gorunurdur ve sonradan her zaman tamamlanabilir. Zaten puanlarin
            // buyuk cogunlugu (7.974'un 6.240'i) RAWG'den geliyor, bu yoldan degil.
            return null;
        }

        private MetacriticResult? ClosestByDate(List<MetacriticResult> candidates, DateTime targetDate, out int bestDaysDiff)
        {
            MetacriticResult? best = null;
            bestDaysDiff = int.MaxValue;

            foreach (var candidate in candidates)
            {
                if (TryParseMetacriticDate(candidate.ReleaseDate, out var candidateDate))
                {
                    var daysDiff = Math.Abs((candidateDate - targetDate).Days);
                    if (daysDiff < bestDaysDiff)
                    {
                        bestDaysDiff = daysDiff;
                        best = candidate;
                    }
                }
            }

            return best;
        }

        /// <summary>
        /// "DOOM (2016)" -> "doom", "God of War: Ragnarök" -> "godofwarragnarok".
        /// RAWG ile Metacritic ayni oyunu farkli yaziyor: RAWG parantez icinde yil/platform
        /// ekliyor, noktalama iki tarafta tutarsiz ve en sinsisi, aksanlar farkli
        /// ("Ragnarök" vs "Ragnarok" — tek karakter yuzunden 94 puanli oyun kaciriliyordu).
        /// </summary>
        private static string NormalizeTitle(string? title)
        {
            if (string.IsNullOrWhiteSpace(title))
            {
                return string.Empty;
            }

            // Parantez icini at. Bu adim katlamadan ONCE olmali: katlama parantezleri de siliyor,
            // yani sonra yapsaydik "DOOM (2016)" -> "doom2016" olur ve "doom" ile hic eslesmezdi.
            var builder = new StringBuilder(title.Length);
            var depth = 0;

            foreach (var ch in title)
            {
                if (ch == '(' || ch == '[')
                {
                    depth++;
                }
                else if (ch == ')' || ch == ']')
                {
                    if (depth > 0)
                    {
                        depth--;
                    }
                }
                else if (depth == 0)
                {
                    builder.Append(ch);
                }
            }

            // Diakritik katlamasi BILEREK burada yeniden yazilmiyor. UsernameNormalizer,
            // "ahmetdemiroglu vs ahmetdemiroğlu" olayindan sonra tam bu is icin yazilmis ve
            // sinanmis tek dogru yer: NFKC + ToLowerInvariant + NFD'nin cozemedigi harfler icin
            // acik esleme + NFD ile ayirip NonSpacingMark atma. Sonucta ö->o, ğ->g, é->e.
            // Ayrica [a-z0-9_.] disini attigi icin bosluk ve noktalama da temizleniyor.
            return UsernameNormalizer.Normalize(builder.ToString());
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
