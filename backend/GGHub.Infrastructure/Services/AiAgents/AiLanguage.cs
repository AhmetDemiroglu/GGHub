using System.Globalization;
using System.Text.RegularExpressions;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Bot dil kurallarinin tek yeri. Her botun tek ana dili var ("tr" | "en"):
    ///   - Botlar kendi dil grubunda sahne kurar, planli hedeflerini o gruptan secer.
    ///   - Insana HER ZAMAN onun yazdigi dilde cevap verilir (Detect).
    ///   - Bot ilk yazarsa (hos geldin DM'i) kullanicinin PreferredLocale'i esas alinir (FromLocale).
    ///   - Arayuzde izleyicinin diline gore botlar gorunur (Viewer).
    /// </summary>
    public static class AiLanguage
    {
        public const string Tr = "tr";
        public const string En = "en";

        public static readonly IReadOnlyList<string> All = new[] { Tr, En };

        /// <summary>Bilinmeyen/bos deger "tr"ye duser (mevcut botlarin dili).</summary>
        public static string Normalize(string? lang) => string.Equals(lang, En, StringComparison.OrdinalIgnoreCase) ? En : Tr;

        /// <summary>Kullanici tercihi ("tr" | "en-US" | null) -> bot dili. Null eski hesaplar icin "tr".</summary>
        public static string FromLocale(string? locale)
            => locale is null || locale.StartsWith("tr", StringComparison.OrdinalIgnoreCase) ? Tr : En;

        /// <summary>Bot hesabinin User.PreferredLocale degeri (AppText.NormalizeLocale ile ayni sozluk).</summary>
        public static string ToLocale(string lang) => Normalize(lang) == En ? "en-US" : "tr";

        /// <summary>Istegin arayuz dili (Accept-Language, UseRequestLocalization). "tr" degilse "en".</summary>
        public static string Viewer() => CultureInfo.CurrentUICulture.TwoLetterISOLanguageName == "tr" ? Tr : En;

        /// <summary>Modele verilen cikti dili adi.</summary>
        public static string ModelName(string lang) => Normalize(lang) == En ? "English" : "Turkish (Türkçe)";

        // ------------------------------------------------------------------ sezgisel tespit

        private static readonly Regex Noise = new(@"(@\[(u|g|l):\d+\]|@\w+|https?://\S+|\{OYUN\})", RegexOptions.Compiled);
        private static readonly Regex Word = new(@"\p{L}+", RegexOptions.Compiled);

        // Turkceye ozgu harfler. o/u umlaut Almancada da var ama bu sitede ikinci dil Ingilizce.
        private const string TurkishLetters = "çğışöüÇĞİŞÖÜ";

        private static readonly HashSet<string> TurkishWords = new(StringComparer.Ordinal)
        {
            "ve", "bir", "bu", "şu", "da", "de", "ki", "mi", "mı", "mu", "mü", "ne", "ama", "için", "icin",
            "çok", "cok", "gibi", "daha", "en", "ben", "sen", "biz", "siz", "var", "yok", "değil", "degil",
            "evet", "hayır", "hayir", "ile", "olarak", "kadar", "neden", "nasıl", "nasil", "merhaba", "selam",
            "oyun", "oyunu", "oyunlar", "oyunları", "bence", "sence", "harika", "güzel", "guzel", "şey", "sey",
            "hiç", "hic", "hep", "her", "bile", "artık", "artik", "hala", "şimdi", "simdi", "tamam", "abi",
            "olur", "oldu", "diye", "yani", "sanki", "belki", "mısın", "misin", "musun", "müsün"
        };

        private static readonly HashSet<string> EnglishWords = new(StringComparer.Ordinal)
        {
            "the", "and", "is", "are", "was", "were", "you", "your", "to", "of", "it", "its", "this", "that",
            "for", "with", "my", "me", "we", "they", "what", "not", "but", "have", "has", "be", "so", "just",
            "on", "in", "do", "does", "like", "game", "games", "love", "think", "really", "about", "would",
            "can", "will", "how", "why", "yes", "no", "hi", "hello", "hey", "thanks", "which", "who", "if",
            "or", "at", "from", "all", "one", "more", "than", "too", "very", "still", "there", "here"
        };

        /// <summary>
        /// Metnin dili: "tr", "en" ya da karar verilemiyorsa null (cok kisa, yalniz emoji/etiket).
        /// Turkce harf agir basar (Turkce metin Ingilizce oyun adi tasiyabilir, tersi nadir).
        /// </summary>
        public static string? Detect(string? text)
        {
            if (string.IsNullOrWhiteSpace(text)) return null;
            var clean = Noise.Replace(text, " ");

            var tr = clean.Count(c => TurkishLetters.Contains(c)) * 2;
            var en = 0;
            foreach (Match m in Word.Matches(clean))
            {
                var w = m.Value.ToLowerInvariant();
                if (TurkishWords.Contains(w)) tr++;
                else if (EnglishWords.Contains(w)) en++;
            }

            if (tr == en) return null;
            return tr > en ? Tr : En;
        }

        /// <summary>
        /// Insana cevap dili: en yeni metinden geriye, dili belirlenebilen ilk metnin dili; hicbiri
        /// belirlenemezse fallback (botun dili).
        /// </summary>
        public static string OfLatest(IEnumerable<string?> latestFirst, string fallback)
            => latestFirst.Select(Detect).FirstOrDefault(l => l is not null) ?? Normalize(fallback);

        /// <summary>Uretilen metin hedef dilde mi? Karar verilemeyen kisa metin gecer.</summary>
        public static bool Matches(string text, string lang)
        {
            var detected = Detect(text);
            return detected is null || detected == Normalize(lang);
        }
    }
}
