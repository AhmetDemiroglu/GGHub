using GGHub.Core.Entities;
using GGHub.Core.Specifications;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Oyun aramasinin ortak eslesme ve siralama kurallari. Ust cubuk aramasi, @etiket onerileri,
    /// "listeye ekle" aramasi (GetGamesAsync) ve gundem aramasi ayni kelime eslesmesini kullanir;
    /// bir yerde "gta 6" GTA VI'yi bulup digerinde bulamamasi olmasin.
    ///
    /// Eslesme KELIME BASI uzerinden: sorgunun her kelimesi arama metninde bir kelimenin basi
    /// olmali ("auto" -> "Auto", "vi" -> "VI" ve "Vice", ama "vi" -> "Soviet" DEGIL).
    /// Arama metni (Game.SearchText) henuz uretilmemis eski satirlarda ada ILIKE ile bakilir.
    /// </summary>
    public static class GameSearch
    {
        // 4 haneli yil (1970-2039). Yil ZORUNLU kelime degildir: "witcher 3 2015" oyunu yine bulur,
        // cikis yili tutan aday one gecer. "Cyberpunk 2077"deki 2077 yil sayilmaz, ad kelimesidir.
        private static readonly Regex YearPattern = new(@"^(19[7-9]\d|20[0-3]\d)$", RegexOptions.Compiled);

        public sealed record ParsedQuery(
            IReadOnlyList<string> Tokens,
            IReadOnlyList<int> Years,
            string NormalizedQuery)
        {
            public bool IsEmpty => Tokens.Count == 0;
        }

        public static ParsedQuery Parse(string? raw)
        {
            var words = GameSearchKeys.Tokenize(raw);
            var tokens = new List<string>();
            var years = new List<int>();
            foreach (var word in words.Take(8))
            {
                if (YearPattern.IsMatch(word) && words.Count > 1) years.Add(int.Parse(word));
                else tokens.Add(word);
            }
            return new ParsedQuery(tokens, years, string.Join(' ', tokens));
        }

        /// <summary>Her kelime arama metninde bir kelimenin basi olmali (AND).</summary>
        public static IQueryable<Game> WhereMatches(IQueryable<Game> query, IReadOnlyList<string> tokens)
        {
            foreach (var token in tokens)
            {
                // Tokenize yalniz [a-z0-9] birakir; LIKE kacisi gerekmez.
                var wordPrefix = $"% {token}%";
                var substring = $"%{token}%";
                query = query.Where(g =>
                    (g.SearchText != null && EF.Functions.Like(g.SearchText, wordPrefix))
                    || (g.SearchText == null && EF.Functions.ILike(g.Name, substring)));
            }
            return query;
        }

        /// <summary>Kayit bicimindeki "tam ad" oneki: ad tam olarak sorguya esitse bununla baslar.</summary>
        public static string ExactNamePrefix(ParsedQuery parsed) =>
            $"{GameSearchKeys.VersionPrefix} {parsed.NormalizedQuery} |";

        public sealed class Candidate
        {
            public int Id { get; init; }
            public int RawgId { get; init; }
            public string Slug { get; init; } = string.Empty;
            public string Name { get; init; } = string.Empty;
            public string? Released { get; init; }
            public string? CoverImage { get; init; }
            public string? BackgroundImage { get; init; }
            public string? SearchText { get; init; }
            public double HypeScore { get; init; }
            public int? RawgAdded { get; init; }
            public int RatingCount { get; init; }
            public int? Metacritic { get; init; }
            public bool HasWikipedia { get; init; }

            public string? Year => Released != null && Released.Length >= 4 ? Released[..4] : null;
        }

        public static IQueryable<Candidate> Project(IQueryable<Game> query) =>
            query.Select(g => new Candidate
            {
                Id = g.Id,
                RawgId = g.RawgId,
                Slug = g.Slug,
                Name = g.Name,
                Released = g.Released,
                CoverImage = g.CoverImage,
                BackgroundImage = g.BackgroundImage,
                SearchText = g.SearchText,
                HypeScore = g.HypeScore,
                RawgAdded = g.RawgAdded,
                RatingCount = g.RatingCount,
                Metacritic = g.Metacritic,
                HasWikipedia = g.WikipediaTitle != null,
            });

        /// <summary>
        /// Arama motoru gibi siralama: once sorguya ne kadar iyi uydugu, esitlikte ne kadar bilinen
        /// bir oyun oldugu. Populerlik bilerek guclu: "gta 6" yazana "GTA 6 (CosmoBars1k)" adli
        /// hayran yapimi degil, Grand Theft Auto VI gosterilmeli; ikisi de iki kelimeye tam uyuyor.
        /// </summary>
        public static double Score(Candidate candidate, ParsedQuery parsed)
        {
            var text = candidate.SearchText ?? GameSearchKeys.Build(candidate.Name) ?? string.Empty;
            var (nameWords, keyWords, aliasWords) = SplitSearchText(text);
            var normalizedName = string.Join(' ', nameWords);

            double score = 0;
            var allExact = true;
            for (var i = 0; i < parsed.Tokens.Count; i++)
            {
                var token = parsed.Tokens[i];
                var isLast = i == parsed.Tokens.Count - 1;

                if (aliasWords.Contains(token)) score += 40;
                else if (nameWords.Contains(token)) score += 12;
                else if (keyWords.Contains(token)) score += 11;
                else
                {
                    allExact = false;
                    // Onek puani kelimenin ne kadarini kapladigina gore: "v" -> "vi" yarim puan,
                    // "witch" -> "witcher" neredeyse tam. Tek harf GTA VI'yi GTA V'nin onune koymasin.
                    var prefixWord = nameWords.Where(w => w.StartsWith(token, StringComparison.Ordinal))
                        .Concat(keyWords.Where(w => w.StartsWith(token, StringComparison.Ordinal)))
                        .Concat(aliasWords.Where(w => w.StartsWith(token, StringComparison.Ordinal)))
                        .OrderBy(w => w.Length)
                        .FirstOrDefault();
                    if (prefixWord != null)
                    {
                        var coverage = (double)token.Length / prefixWord.Length;
                        score += (isLast ? 8 : 5) * coverage;
                    }
                    else if (normalizedName.Contains(token, StringComparison.Ordinal)) score += 2;
                }
            }

            // Her kelime tam oturuyorsa guclu bonus: "gta v" GTA V'yi, "vi" ile baslayan GTA VI'nin onune koyar.
            if (allExact && parsed.Tokens.Count > 0) score += 30;
            if (normalizedName == parsed.NormalizedQuery) score += 30;
            else if (normalizedName.StartsWith(parsed.NormalizedQuery + " ", StringComparison.Ordinal)) score += 6;

            foreach (var year in parsed.Years)
            {
                var yearText = year.ToString();
                if (candidate.Year == yearText || nameWords.Contains(yearText)) score += 10;
                else score -= 4;
            }

            return score + Popularity(candidate);
        }

        /// <summary>
        /// 0..~110. Hype (Wikipedia okunma omurgali) + katalogda kac kisinin ekledigi + GGHub
        /// incelemeleri. Logaritmik: 22 bin ekleme 43 puan, 50 ekleme 17 puan.
        /// </summary>
        public static double Popularity(Candidate candidate) =>
            candidate.HypeScore * 0.5
            + 10 * Math.Log10(1 + Math.Max(0, candidate.RawgAdded ?? 0))
            + 4 * Math.Log10(1 + candidate.RatingCount)
            + (candidate.HasWikipedia ? 6 : 0)
            + (candidate.Metacritic.HasValue ? 4 : 0);

        private static (HashSet<string> NameWords, HashSet<string> KeyWords, HashSet<string> AliasWords) SplitSearchText(string text)
        {
            var nameWords = new HashSet<string>(StringComparer.Ordinal);
            var keyWords = new HashSet<string>(StringComparer.Ordinal);
            var aliasWords = new HashSet<string>(StringComparer.Ordinal);
            var parts = text.Split('|');
            // parts[0] surum, parts[1] ad, parts[2] anahtarlar, parts[3] takma adlar.
            if (parts.Length >= 2)
            {
                foreach (var w in parts[1].Split(' ', StringSplitOptions.RemoveEmptyEntries)) nameWords.Add(w);
            }
            if (parts.Length >= 3)
            {
                foreach (var w in parts[2].Split(' ', StringSplitOptions.RemoveEmptyEntries)) keyWords.Add(w);
            }
            if (parts.Length >= 4)
            {
                foreach (var w in parts[3].Split(' ', StringSplitOptions.RemoveEmptyEntries)) aliasWords.Add(w);
            }
            return (nameWords, keyWords, aliasWords);
        }
    }
}
