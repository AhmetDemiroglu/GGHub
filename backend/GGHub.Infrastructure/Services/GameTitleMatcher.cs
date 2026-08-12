using GGHub.Core.Specifications;
using System.Text;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Farkli kataloglardan (RAWG, Steam, IGDB, Metacritic) gelen oyun adlarini ayni olcege
    /// ceken tek yer. Kaynaklar ayni oyunu farkli yaziyor:
    ///   RAWG   "God of War (2018)"        IGDB  "God of War"
    ///   Steam  "EA SPORTS FC(tm) 27"      IGDB  "EA Sports FC 27"
    /// Bu farklar yuzunden ayni oyun icin ikinci satir aciliyordu (duplicate) ve IGDB puani
    /// eslesemedigi icin bos kaliyordu.
    ///
    /// Diakritik katlamasi BILEREK yeniden yazilmiyor: UsernameNormalizer bu is icin yazilmis
    /// ve sinanmis tek dogru yer (MetacriticService.NormalizeTitle de onu kullaniyor).
    /// </summary>
    public static class GameTitleMatcher
    {
        /// <summary>Marka/surum gurultusu; ana oyunla ayni satira dusmeleri icin temizlenir.</summary>
        private static readonly string[] EditionSuffixes =
        {
            "digital deluxe edition", "ultimate plus edition", "ultimate edition", "deluxe edition",
            "gold edition", "premium edition", "standard edition", "complete edition",
            "definitive edition", "game of the year edition", "goty edition", "remastered edition",
            "digital edition", "special edition", "collectors edition", "anniversary edition",
        };

        /// <summary>
        /// "God of War (2018)" ve "God of War" ayni anahtari uretir. Parantez ici atilir
        /// (katlamadan ONCE: katlama parantezi silseydi "2018" ada yapisirdi), TM/(R) gibi
        /// isaretler ve surum ekleri dusurulur, sonra UsernameNormalizer katlar.
        /// </summary>
        public static string Normalize(string? title)
        {
            if (string.IsNullOrWhiteSpace(title)) return string.Empty;

            var builder = new StringBuilder(title.Length);
            var depth = 0;
            foreach (var ch in title)
            {
                if (ch == '(' || ch == '[') depth++;
                else if (ch == ')' || ch == ']') { if (depth > 0) depth--; }
                else if (depth == 0 && ch != '™' && ch != '®' && ch != '©') builder.Append(ch);
            }

            var cleaned = builder.ToString();

            // Surum eki varsa at: "EA Sports FC 27: Ultimate Edition" -> "EA Sports FC 27".
            var lowered = cleaned.ToLowerInvariant();
            foreach (var suffix in EditionSuffixes)
            {
                var index = lowered.IndexOf(suffix, StringComparison.Ordinal);
                if (index > 0)
                {
                    cleaned = cleaned[..index].TrimEnd(' ', '-', ':', '|');
                    break;
                }
            }

            return UsernameNormalizer.Normalize(cleaned);
        }

        /// <summary>
        /// Ad bir SURUM kaydi mi ("... Ultimate Edition", "... Digital Deluxe")? Bu kayitlar
        /// katalogda ana oyunun kopyasi olarak gorunuyordu; ingest sirasinda atlanir.
        /// </summary>
        public static bool IsEditionVariant(string? title)
        {
            if (string.IsNullOrWhiteSpace(title)) return false;
            var lowered = title.ToLowerInvariant();
            return EditionSuffixes.Any(s => lowered.Contains(s, StringComparison.Ordinal));
        }

        /// <summary>
        /// DB'de ILIKE ile aday cekmek icin desen. Tam ad ile arama "™" veya "(2018)" gibi
        /// farklarda bosa dusuyordu; ilk iki kelime yeterince dar, yeterince toleransli.
        /// </summary>
        public static string BuildLikePattern(string title)
        {
            var words = title
                .Replace('™', ' ').Replace('®', ' ').Replace(':', ' ')
                .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Take(2)
                .ToList();

            return words.Count == 0 ? "%" : $"%{string.Join("%", words)}%";
        }
    }
}
