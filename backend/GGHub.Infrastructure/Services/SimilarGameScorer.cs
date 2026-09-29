using System.Text.Json;
using System.Text.RegularExpressions;

namespace GGHub.Infrastructure.Services
{
    /// <summary>Benzerlik hesabinin ihtiyac duydugu oyun ozeti (DB satirindan bir kez cikarilir).</summary>
    public sealed class SimilarGameProfile
    {
        public int Id { get; init; }
        public int RawgId { get; init; }
        public string Name { get; init; } = string.Empty;
        public string Slug { get; init; } = string.Empty;
        public string? Released { get; init; }
        public string? BackgroundImage { get; init; }
        public double? Rating { get; init; }
        public int? Metacritic { get; init; }
        public double AverageRating { get; init; }
        public int RatingCount { get; init; }
        public double? IgdbRating { get; init; }
        public int? IgdbRatingCount { get; init; }
        public int? IgdbId { get; init; }
        public int? RawgAdded { get; init; }
        public string? EsrbRating { get; init; }

        public HashSet<string> Genres { get; init; } = new();
        public HashSet<string> Platforms { get; init; } = new();
        public HashSet<string> Developers { get; init; } = new();
        public HashSet<string> Tags { get; init; } = new();
        public HashSet<int> IgdbSimilar { get; init; } = new();
        /// <summary>Sirali ve tekil baslik kelimeleri; ilk kelime seri tespitinde ozel (bkz. SimilarGameScorer.IsSameSeries).</summary>
        public List<string> TitleTokens { get; init; } = new();
        public string TitleKey { get; init; } = string.Empty;
        public int? Year { get; init; }

        /// <summary>JSON kolonundaki nesnelerin "Slug" alanlarini toplar (GenresJson, PlatformsJson, DevelopersJson).</summary>
        public static HashSet<string> SlugsOf(string? json)
        {
            var result = new HashSet<string>(StringComparer.Ordinal);
            if (string.IsNullOrEmpty(json)) return result;
            try
            {
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.ValueKind != JsonValueKind.Array) return result;
                foreach (var item in doc.RootElement.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.Object
                        && item.TryGetProperty("Slug", out var slug)
                        && slug.ValueKind == JsonValueKind.String
                        && !string.IsNullOrEmpty(slug.GetString()))
                        result.Add(slug.GetString()!);
                }
            }
            catch (JsonException) { }
            return result;
        }

        public static HashSet<int> IntsOf(string? json)
        {
            if (string.IsNullOrEmpty(json)) return new HashSet<int>();
            try { return JsonSerializer.Deserialize<HashSet<int>>(json) ?? new HashSet<int>(); }
            catch (JsonException) { return new HashSet<int>(); }
        }

        public static int? YearOf(string? released) =>
            released != null && released.Length >= 4 && int.TryParse(released[..4], out var y) ? y : null;

        // Seri tespiti icin anlamsiz kelimeler: "the", "of" ve surum/tur ekleri.
        private static readonly HashSet<string> StopWords = new(StringComparer.Ordinal)
        {
            "the", "of", "and", "a", "an", "in", "on", "to", "for", "vs", "at", "by", "de", "la", "le",
            "edition", "remastered", "remaster", "definitive", "complete", "deluxe", "ultimate", "goty",
            "game", "games", "year", "collection", "hd", "vr", "demo", "beta", "part", "chapter",
            "episode", "season", "volume", "vol", "new", "online", "world", "ii", "iii", "iv", "vi", "vii",
            "viii", "ix", "xi", "xii",
        };

        private static readonly Regex TokenSplit = new(@"[^a-z0-9]+", RegexOptions.Compiled);

        /// <summary>
        /// Baslik kelimeleri: kucuk harf, katlanmis, sayilar ve gecis kelimeleri atilmis.
        /// "The Witcher 3: Wild Hunt" -> {witcher, wild, hunt}. Seri eslestirmesinin girdisi.
        /// </summary>
        public static List<string> TokensOf(string? name)
        {
            var result = new List<string>();
            if (string.IsNullOrWhiteSpace(name)) return result;
            foreach (var token in TokenSplit.Split(Fold(name)))
            {
                if (token.Length < 3 || StopWords.Contains(token)) continue;
                if (token.All(char.IsDigit)) continue;
                if (!result.Contains(token)) result.Add(token);
            }
            return result;
        }

        /// <summary>Kucuk harf + diakritik katlama ("Ragnarök" -> "ragnarok"); ASCII disi kalan her sey ayirici olur.</summary>
        private static string Fold(string name)
        {
            var lowered = name.ToLowerInvariant().Normalize(System.Text.NormalizationForm.FormD);
            var sb = new System.Text.StringBuilder(lowered.Length);
            foreach (var ch in lowered)
            {
                var category = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(ch);
                if (category == System.Globalization.UnicodeCategory.NonSpacingMark) continue;
                sb.Append(ch < 128 ? ch : ' ');
            }
            return sb.ToString();
        }
    }

    /// <summary>Etiket yayginligi: slug -> IDF agirligi. Nadir etiket (souls-like) agir, yaygin etiket (singleplayer) hafif.</summary>
    public sealed class TagWeights
    {
        public Dictionary<string, double> Weight { get; init; } = new(StringComparer.Ordinal);
        public Dictionary<string, int> DocumentFrequency { get; init; } = new(StringComparer.Ordinal);

        public double Of(string slug) => Weight.TryGetValue(slug, out var w) ? w : 1.0;
    }

    /// <summary>
    /// Saf skorlama; DB ve cache bilmez. Kanitlar (agir olandan hafife):
    ///   etiket ortakligi (IDF agirlikli Jaccard), IGDB'nin kendi benzer listesi, ayni kullanicilarin
    ///   listelerinde/incelemelerinde birlikte gecme, tur ortakligi, ayni studyo, ayni seri,
    ///   donem/platform yakinligi; en sonda kalite ve populerlik yalnizca esitlik bozucu.
    /// Eski algoritma kaliteyi (Metacritic x 0.5) tur kadar agir tutuyordu; sonuc "turun en iyi
    /// puanli oyunlari" oluyordu, "benzer oyunlar" degil.
    /// </summary>
    public static class SimilarGameScorer
    {
        private const double TagWeight = 45;
        private const double IgdbSimilarWeight = 25;
        private const double CoEngagementCap = 20;
        private const double GenreWeight = 20;
        private const double DeveloperWeight = 12;
        private const double SeriesWeight = 10;
        private const double EraCap = 6;
        private const double PlatformWeight = 4;
        private const double QualityCap = 10;
        private const double PopularityCap = 5;
        private const double EsrbMismatchPenalty = 8;

        /// <summary>
        /// Bu esigin altinda kalan aday hic onerilmez. Kalite + populerlik + donem tek basina en
        /// fazla 21 eder; yani hicbir benzerlik kaniti olmayan "populer ve iyi" oyun listeye giremez.
        /// </summary>
        private const double MinScore = 20;

        public static double Score(SimilarGameProfile source, SimilarGameProfile candidate, TagWeights weights, int coEngagedUsers)
        {
            var score = 0.0;
            score += WeightedJaccard(source.Tags, candidate.Tags, weights) * TagWeight;
            score += Jaccard(source.Genres, candidate.Genres) * GenreWeight;
            if (IsIgdbSimilar(source, candidate)) score += IgdbSimilarWeight;
            if (coEngagedUsers > 0) score += Math.Min(CoEngagementCap, 6 * Math.Log2(1 + coEngagedUsers));
            if (source.Developers.Overlaps(candidate.Developers)) score += DeveloperWeight;
            if (IsSameSeries(source, candidate)) score += SeriesWeight;
            score += EraScore(source.Year, candidate.Year);
            score += Jaccard(source.Platforms, candidate.Platforms) * PlatformWeight;
            score += Quality(candidate) * QualityCap;
            score += Popularity(candidate.RawgAdded) * PopularityCap;
            if (EsrbMismatch(source.EsrbRating, candidate.EsrbRating)) score -= EsrbMismatchPenalty;
            return score;
        }

        /// <summary>
        /// Skorla, sirala, cesitlendir. Ayni seri en fazla 3, ayni studyo en fazla 4 oyunla girer;
        /// yoksa "Assassin's Creed" sayfasi 12 Assassin's Creed listeler.
        /// </summary>
        public static List<SimilarGameProfile> Rank(SimilarGameProfile source, IEnumerable<SimilarGameProfile> candidates,
            TagWeights weights, IReadOnlyDictionary<int, int> coEngaged, int take)
        {
            var ranked = candidates
                .Where(c => c.Id != source.Id && c.TitleKey != source.TitleKey && !GameTitleMatcher.IsEditionVariant(c.Name))
                .Select(c => (Game: c, Score: Score(source, c, weights, coEngaged.GetValueOrDefault(c.Id))))
                .Where(x => x.Score >= MinScore)
                .OrderByDescending(x => x.Score)
                .ThenByDescending(x => x.Game.RawgAdded ?? 0)
                .Select(x => x.Game)
                .ToList();

            var result = new List<SimilarGameProfile>(take);
            var sameSeries = 0;
            var sameDeveloper = 0;
            foreach (var game in ranked)
            {
                if (result.Count >= take) break;
                var series = IsSameSeries(source, game);
                var developer = source.Developers.Overlaps(game.Developers);
                if (series && sameSeries >= 3) continue;
                if (developer && !series && sameDeveloper >= 4) continue;
                if (series) sameSeries++;
                if (developer) sameDeveloper++;
                result.Add(game);
            }
            return result;
        }

        public static bool IsIgdbSimilar(SimilarGameProfile a, SimilarGameProfile b) =>
            (b.IgdbId != null && a.IgdbSimilar.Contains(b.IgdbId.Value))
            || (a.IgdbId != null && b.IgdbSimilar.Contains(a.IgdbId.Value));

        /// <summary>
        /// "Dark Souls" / "Dark Souls III" ayni seri; "Doom" / "Doom Eternal" ayni seri (kisa ad
        /// uzun adin BASINDA). "Dead Space" / "Dead Cells" degil (tek ortak kelime, alt kume degil);
        /// "Control" / "Remote Control Warfare" degil (tek kelime ama basta degil).
        /// </summary>
        public static bool IsSameSeries(SimilarGameProfile a, SimilarGameProfile b)
        {
            if (a.TitleTokens.Count == 0 || b.TitleTokens.Count == 0) return false;
            var shared = a.TitleTokens.Count(b.TitleTokens.Contains);
            if (shared == 0) return false;
            var smaller = Math.Min(a.TitleTokens.Count, b.TitleTokens.Count);
            if (shared == smaller)
                return smaller >= 2 || a.TitleTokens[0] == b.TitleTokens[0];
            var union = a.TitleTokens.Count + b.TitleTokens.Count - shared;
            return (double)shared / union >= 0.5;
        }

        public static double Jaccard(HashSet<string> a, HashSet<string> b)
        {
            if (a.Count == 0 || b.Count == 0) return 0;
            var shared = a.Count(b.Contains);
            return (double)shared / (a.Count + b.Count - shared);
        }

        public static double WeightedJaccard(HashSet<string> a, HashSet<string> b, TagWeights weights)
        {
            if (a.Count == 0 || b.Count == 0) return 0;
            double shared = 0, union = 0;
            foreach (var slug in a) { var w = weights.Of(slug); union += w; if (b.Contains(slug)) shared += w; }
            foreach (var slug in b) { if (!a.Contains(slug)) union += weights.Of(slug); }
            return union > 0 ? shared / union : 0;
        }

        private static double EraScore(int? a, int? b)
        {
            if (a == null || b == null) return EraCap / 2;
            return Math.Max(0, EraCap - Math.Abs(a.Value - b.Value) * 0.75);
        }

        /// <summary>0..1: uc puan kaynagindan en iyisi; hic puan yoksa notr 0.3.</summary>
        private static double Quality(SimilarGameProfile g)
        {
            var best = -1.0;
            if (g.Metacritic != null) best = Math.Max(best, g.Metacritic.Value / 100.0);
            if (g.IgdbRating != null) best = Math.Max(best, g.IgdbRating.Value / 100.0);
            if (g.Rating != null) best = Math.Max(best, g.Rating.Value / 5.0);
            if (g.RatingCount >= 3) best = Math.Max(best, g.AverageRating / 5.0);
            return best < 0 ? 0.3 : best;
        }

        /// <summary>0..1: log olcekli RAWG "added" (100 bin ~ 1).</summary>
        private static double Popularity(int? added) =>
            added is > 0 ? Math.Min(1.0, Math.Log10(added.Value + 1) / 5.0) : 0;

        private static bool EsrbMismatch(string? a, string? b)
        {
            if (string.IsNullOrEmpty(a) || string.IsNullOrEmpty(b)) return false;
            static bool Kids(string r) => r.StartsWith("Everyone", StringComparison.OrdinalIgnoreCase);
            static bool Adults(string r) => r.StartsWith("Mature", StringComparison.OrdinalIgnoreCase)
                                             || r.StartsWith("Adults", StringComparison.OrdinalIgnoreCase);
            return (Kids(a) && Adults(b)) || (Adults(a) && Kids(b));
        }
    }
}
