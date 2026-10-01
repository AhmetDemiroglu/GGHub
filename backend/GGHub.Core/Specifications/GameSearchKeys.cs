using System.Text;

namespace GGHub.Core.Specifications
{
    /// <summary>
    /// Oyun aramasinin TEK normalizasyon kaynagi. Hem kaydedilen arama metnini (Game.SearchText)
    /// hem de kullanicinin sorgusunu ayni kurallarla kelimelere boler; iki taraf ayni fonksiyondan
    /// gectigi icin "GTA-6", "gta 6", "Gta VI" ayni kelimelere iner.
    ///
    /// Neden var (1 Ekim 2026): arama adin ICINDE harf dizisi ariyordu. "gta VI" yazan
    /// "GTA: Soviet Russia"yi buluyordu ("vi" -> "Soviet"), "gta 6" ise "Ragtag Crew"i
    /// ("gta" -> "Ragtag"). Grand Theft Auto VI ancak tam adi yazilinca cikiyordu: adinda ne
    /// "gta" ne "6" geciyor. Insanlar oyunlari kisaltmayla ve rakamla arar; bu sinif adin
    /// yanina o anahtarlari (kisaltma, rakam/Roma rakami karsiligi, bilinen takma adlar) uretir.
    ///
    /// Kayit bicimi: "s1| grand theft auto vi | 6 gta gta6 gtavi ".
    /// - Bas: surum isareti. Kurallar degisince surum artar, geri doldurma eski kayitlari yeniler.
    /// - Ilk bolum: adin kelimeleri (tam ad eslesmesi bununla olculur).
    /// - Ikinci bolum: uretilen anahtarlar.
    /// Her kelimenin onunde bosluk var: "% gta%" deseni KELIME BASI eslesmesidir, "Ragtag" eslesmez.
    /// </summary>
    public static class GameSearchKeys
    {
        public const string Version = "s1";

        /// <summary>Kayit bu onekle baslamiyorsa eski kurallarla uretilmistir, yenilenmeli.</summary>
        public const string VersionPrefix = Version + "|";

        /// <summary>
        /// Kisaltmayla turetilemeyen yaygin takma adlar. Anahtar adin normalize edilmis basi
        /// (kelime siniriyla). Liste bilerek kucuk: kisaltma ve rakam karsiliklari zaten otomatik.
        /// </summary>
        private static readonly (string NamePrefix, string[] Aliases)[] CuratedAliases =
        {
            ("playerunknowns battlegrounds", new[] { "pubg" }),
            ("pubg battlegrounds", new[] { "playerunknowns" }),
            ("tom clancys rainbow six", new[] { "r6", "r6s", "rainbow6" }),
            ("rainbow six", new[] { "r6", "r6s", "rainbow6" }),
            ("counter strike global offensive", new[] { "cs", "csgo", "cs go" }),
            ("counter strike 2", new[] { "cs", "cs2" }),
            ("minecraft", new[] { "mc" }),
            ("overwatch", new[] { "ow" }),
            ("valorant", new[] { "valo" }),
            ("the elder scrolls v skyrim", new[] { "skyrim", "tes5" }),
            ("the elder scrolls iv oblivion", new[] { "oblivion", "tes4" }),
            ("ea sports fc", new[] { "fifa", "fc" }),
            ("ea sports college football", new[] { "cfb" }),
            ("nba 2k", new[] { "2k" }),
            ("pro evolution soccer", new[] { "pes" }),
            ("efootball", new[] { "pes" }),
            ("marvels spider man", new[] { "spiderman" }),
            ("spider man", new[] { "spiderman" }),
            ("the legend of zelda", new[] { "zelda" }),
            ("dota 2", new[] { "dota" }),
            ("league of legends", new[] { "lol" }),
            ("apex legends", new[] { "apex" }),
            ("euro truck simulator 2", new[] { "ets2", "ets" }),
            ("american truck simulator", new[] { "ats" }),
            ("cyberpunk 2077", new[] { "cp2077", "cyberpunk" }),
        };

        /// <summary>Kisaltmada genelde atlanan dolgu kelimeleri.</summary>
        private static readonly HashSet<string> FillerWords = new(StringComparer.Ordinal)
        {
            "part", "chapter", "episode", "vol", "volume",
        };

        /// <summary>Ad icin aranabilir metni uretir. Bos ad icin null (aramaya girmez).</summary>
        public static string? Build(string? name)
        {
            var words = Tokenize(name);
            if (words.Count == 0) return null;

            var normalizedName = string.Join(' ', words);
            var nameWords = new HashSet<string>(words, StringComparer.Ordinal);
            var keys = new List<string>();
            var seen = new HashSet<string>(StringComparer.Ordinal);

            void Add(string key)
            {
                if (key.Length < 2 && !IsAllDigits(key)) return;
                if (nameWords.Contains(key)) return;
                if (seen.Add(key)) keys.Add(key);
            }

            // 1) Rakam <-> Roma rakami: "VI" icin "6", "2" icin "ii". "gta 6" yazan GTA VI'yi bulur.
            foreach (var word in words)
            {
                foreach (var alt in NumeralAlternatives(word)) Add(alt);
            }

            // 2) Kelime + sayi birlesik: "fifa 23" -> "fifa23", "gta vi" -> "gta6" ve "gtavi".
            for (var i = 0; i + 1 < words.Count; i++)
            {
                if (TryNumeral(words[i], out _)) continue;
                if (!TryNumeral(words[i + 1], out var value) && !IsAllDigits(words[i + 1])) continue;
                Add(words[i] + words[i + 1]);
                foreach (var alt in NumeralAlternatives(words[i + 1])) Add(words[i] + alt);
                if (value > 0) Add(words[i] + value);
            }

            // 3) Bas harf kisaltmalari: tum ad ve ":" / " - " ile ayrilan her parca ayri.
            //    "Call of Duty: Black Ops 6" -> cod, codbo6, bo, bo6 ...
            foreach (var segment in Segments(name!))
            {
                foreach (var acronym in Acronyms(segment)) Add(acronym);

                // "The Last of Us Part II" -> "tlou2": dolgu kelimeleri ("part", "chapter") atilmis hali.
                var trimmed = segment.Where(w => !FillerWords.Contains(w)).ToList();
                if (trimmed.Count != segment.Count)
                {
                    foreach (var acronym in Acronyms(trimmed)) Add(acronym);
                }
            }

            // 4) Bilinen takma adlar.
            foreach (var (prefix, aliases) in CuratedAliases)
            {
                if (normalizedName == prefix || normalizedName.StartsWith(prefix + " ", StringComparison.Ordinal))
                {
                    foreach (var alias in aliases)
                    {
                        foreach (var part in alias.Split(' ', StringSplitOptions.RemoveEmptyEntries)) Add(part);
                    }
                }
            }

            var builder = new StringBuilder(normalizedName.Length * 2 + 8);
            builder.Append(VersionPrefix).Append(' ').Append(normalizedName).Append(" |");
            foreach (var key in keys) builder.Append(' ').Append(key);
            builder.Append(' ');
            return builder.ToString();
        }

        /// <summary>
        /// Metni arama kelimelerine boler: kucuk harf, diakritik katlama (UsernameNormalizer),
        /// kesme isareti ve nokta kelimeyi bolmez ("Assassin's" -> "assassins",
        /// "S.T.A.L.K.E.R." -> "stalker"), "&amp;" "and" olur, diger her isaret bosluktur.
        /// </summary>
        public static List<string> Tokenize(string? text)
        {
            var result = new List<string>();
            if (string.IsNullOrWhiteSpace(text)) return result;

            var builder = new StringBuilder(text.Length + 8);
            foreach (var ch in text)
            {
                if (ch is '\'' or '’' or '‘' or '`' or '´' or '.' or '™' or '®' or '©') continue;
                if (ch == '&') { builder.Append(" and "); continue; }
                builder.Append(char.IsLetterOrDigit(ch) ? ch : ' ');
            }

            foreach (var raw in builder.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries))
            {
                var word = UsernameNormalizer.Normalize(raw).Replace("_", string.Empty).Replace(".", string.Empty);
                if (word.Length > 0) result.Add(word);
            }

            return result;
        }

        /// <summary>Normalize edilmis tam ad (kayit bicimindeki ilk bolum).</summary>
        public static string NormalizeName(string? name) => string.Join(' ', Tokenize(name));

        /// <summary>"vi" -> 6, "12" -> 12. Yalniz 2..39 arasi (tek basina "i" bir kelime olabilir: "I Am Bread").</summary>
        public static bool TryNumeral(string word, out int value)
        {
            value = 0;
            if (word.Length == 0) return false;

            if (IsAllDigits(word))
            {
                if (word.Length > 2 || word[0] == '0') return false;
                value = int.Parse(word);
                return value is >= 1 and <= 39;
            }

            if (word.Length > 6) return false;
            foreach (var ch in word)
            {
                if (ch is not ('i' or 'v' or 'x')) return false;
            }

            // Gecerli Roma rakami mi: geri cevirince ayni yazilmali ("iiii", "vx" gecersiz).
            var parsed = ParseRoman(word);
            if (parsed is < 2 or > 39) return false;
            if (ToRoman(parsed) != word) return false;
            value = parsed;
            return true;
        }

        public static bool IsAllDigits(string word)
        {
            if (word.Length == 0) return false;
            foreach (var ch in word)
            {
                if (ch is < '0' or > '9') return false;
            }
            return true;
        }

        private static IEnumerable<string> NumeralAlternatives(string word)
        {
            if (!TryNumeral(word, out var value)) yield break;
            if (IsAllDigits(word))
            {
                if (value >= 2) yield return ToRoman(value);
            }
            else
            {
                yield return value.ToString();
            }
        }

        private static IEnumerable<List<string>> Segments(string name)
        {
            yield return Tokenize(StripBrackets(name));

            var separators = new[] { ":", " - ", " – ", " — ", " | " };
            var parts = StripBrackets(name).Split(separators, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length < 2) yield break;
            foreach (var part in parts) yield return Tokenize(part);
        }

        private static IEnumerable<string> Acronyms(List<string> words)
        {
            var core = words.Where(w => !TryNumeral(w, out _) && !IsAllDigits(w)).ToList();
            if (core.Count < 2) yield break;

            yield return Initials(core);
            if (core[0] == "the" && core.Count >= 3) yield return Initials(core.Skip(1).ToList());

            // Sayilar yerinde kalir: "Final Fantasy VII Remake" -> ff7r, ffviir; "GTA VI" -> gta6, gtavi.
            var withArabic = new StringBuilder();
            var withRoman = new StringBuilder();
            var hasNumber = false;
            foreach (var word in words)
            {
                if (TryNumeral(word, out var value))
                {
                    hasNumber = true;
                    withArabic.Append(value);
                    withRoman.Append(value >= 2 ? ToRoman(value) : value.ToString());
                }
                else if (IsAllDigits(word))
                {
                    hasNumber = true;
                    withArabic.Append(word);
                    withRoman.Append(word);
                }
                else
                {
                    withArabic.Append(word[0]);
                    withRoman.Append(word[0]);
                }
            }

            if (hasNumber)
            {
                yield return withArabic.ToString();
                yield return withRoman.ToString();
            }
        }

        private static string Initials(List<string> words)
        {
            var builder = new StringBuilder(words.Count);
            foreach (var word in words) builder.Append(word[0]);
            return builder.ToString();
        }

        /// <summary>"GTA 6 (CosmoBars1k)" -> "GTA 6": parantez ici kisaltmaya girmez.</summary>
        private static string StripBrackets(string name)
        {
            var builder = new StringBuilder(name.Length);
            var depth = 0;
            foreach (var ch in name)
            {
                if (ch is '(' or '[') depth++;
                else if (ch is ')' or ']') { if (depth > 0) depth--; }
                else if (depth == 0) builder.Append(ch);
            }
            return builder.ToString();
        }

        private static int ParseRoman(string word)
        {
            var total = 0;
            for (var i = 0; i < word.Length; i++)
            {
                var current = RomanValue(word[i]);
                var next = i + 1 < word.Length ? RomanValue(word[i + 1]) : 0;
                total += current < next ? -current : current;
            }
            return total;
        }

        private static int RomanValue(char ch) => ch switch { 'i' => 1, 'v' => 5, 'x' => 10, _ => 0 };

        private static string ToRoman(int value)
        {
            var builder = new StringBuilder();
            foreach (var (number, symbol) in new[] { (10, "x"), (9, "ix"), (5, "v"), (4, "iv"), (1, "i") })
            {
                while (value >= number)
                {
                    builder.Append(symbol);
                    value -= number;
                }
            }
            return builder.ToString();
        }
    }
}
