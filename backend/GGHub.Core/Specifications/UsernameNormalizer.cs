using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace GGHub.Core.Specifications
{
    /// <summary>
    /// Kullanici adi normalizasyonu icin TEK dogruluk kaynagi.
    /// Baska hicbir yerde katlama (folding) mantigi yeniden yazilmaz; herkes buraya cagirir.
    ///
    /// Neden var: "ahmetdemiroglu" ile "ahmetdemiroğlu" gorsel olarak neredeyse ayni ama
    /// byte duzeyinde farkli iki string. Username ayni zamanda bir KIMLIK DOGRULAMA
    /// tanimlayicisi oldugu icin (kullanici adi VEYA e-posta ile giris yapilabiliyor)
    /// bu carpisma kozmetik degil, guvenlik problemidir.
    ///
    /// Bu sinifin System disinda bagimliligi YOKTUR; boylece her katmandan cagrilabilir.
    /// </summary>
    public static class UsernameNormalizer
    {
        // NFD'nin ayristiramadigi karakterler. Bunlar "taban harf + birlesen isaret"
        // seklinde kurulmadigi icin decomposition ile cozulmez; elle eslemek sarttir.
        private static readonly Dictionary<char, string> ExplicitMap = new()
        {
            // --- Latin: NFD ile ayrisMAYAN harfler ---
            ['ı'] = "i",  // ı  Turkce noktasiz i (tekil kod noktasi, birlesen isaret yok)
            ['İ'] = "i",  // İ  Turkce noktali buyuk I. ToLowerInvariant'in ICU/NLS'e gore
                               //    davranisi degisebildiginden (kimi ortamda "i"+U+0307, kimi
                               //    ortamda oldugu gibi kalir) burada garantiye aliyoruz.
            ['ø'] = "o",
            ['đ'] = "d",
            ['ł'] = "l",
            ['ß'] = "ss",
            ['æ'] = "ae",
            ['œ'] = "oe",
            ['þ'] = "th",
            ['ð'] = "d",

            // --- Kiril homoglifleri: Latin harflerle GORSEL olarak ayirt edilemez ---
            ['а'] = "a", // а
            ['е'] = "e", // е
            ['о'] = "o", // о
            ['р'] = "p", // р
            ['с'] = "c", // с
            ['у'] = "y", // у
            ['х'] = "x", // х
            ['к'] = "k", // к
            ['м'] = "m", // м
            ['т'] = "t", // т
            ['в'] = "b", // в
            ['н'] = "h", // н
            ['і'] = "i", // і
            ['ј'] = "j", // ј
            ['ѕ'] = "s", // ѕ
            ['г'] = "r", // г

            // --- Yunan homoglifleri ---
            ['ο'] = "o", // ο
            ['α'] = "a", // α
            ['ε'] = "e", // ε
            ['ρ'] = "p", // ρ
            ['ν'] = "v", // ν
            ['τ'] = "t", // τ
            ['κ'] = "k", // κ
            ['ι'] = "i", // ι
        };

        // Karsilastirma anahtarinda izin verilen son alfabe.
        private static readonly Regex AllowedKeyChars = new("[^a-z0-9_.]", RegexOptions.Compiled);

        // GORUNEN kullanici adi icin izin verilen alfabe: Unicode harf/rakam BILEREK serbest.
        // "ömer" gecerli bir goruntuleme adidir; benzersizligi normalize edilmis anahtar saglar.
        private static readonly Regex DisplayFormat = new(@"^[\p{L}\p{N}_.]+$", RegexOptions.Compiled);

        /// <summary>
        /// Ham kullanici adindan karsilastirma anahtarini uretir.
        /// Asla null donmez; kullanilamaz girdi icin "" doner.
        /// </summary>
        public static string Normalize(string? raw)
        {
            // 1) Trim; bos/null ise anahtar yok.
            var value = raw?.Trim();
            if (string.IsNullOrEmpty(value))
            {
                return string.Empty;
            }

            try
            {
                // 2) NFKC: uyumluluk formlarini katlar. Tam genislikli "ａ" -> "a",
                //    "ﬁ" baglaci -> "fi" gibi. Boylece gorsel ikizler tek forma iner.
                value = value.Normalize(NormalizationForm.FormKC);

                // 3) ToLowerInvariant: ASLA ToLower() DEGIL. tr-TR kulturunde "I".ToLower()
                //    "ı" uretir; bu da anahtari sunucunun kulturune bagimli hale getirirdi.
                //    Istek kulturu Accept-Language ile degistigi icin bu gercek bir risk.
                value = value.ToLowerInvariant();

                // 4) NFD'nin cozemedigi karakterleri, AYRISTIRMADAN ONCE elle esle.
                var mapped = new StringBuilder(value.Length);
                foreach (var ch in value)
                {
                    if (ExplicitMap.TryGetValue(ch, out var replacement))
                    {
                        mapped.Append(replacement);
                    }
                    else
                    {
                        mapped.Append(ch);
                    }
                }
                value = mapped.ToString();

                // 5) ISIN OZU BURASI. NFD, "ğ" gibi harfleri "g" + U+0306 (birlesen breve)
                //    seklinde taban harf + birlesen isaret ciftine ayirir. Ardindan
                //    NonSpacingMark kategorisindeki her karakteri atinca geriye sadece taban
                //    harf kalir. Diakritik katlamasini yapan sey budur ve hic asikar degildir:
                //      ğ -> g,  ü -> u,  ş -> s,  ö -> o,  ç -> c,  é -> e
                //    Yani "ahmetdemiroğlu" ile "ahmetdemiroglu" ayni anahtara iner.
                value = value.Normalize(NormalizationForm.FormD);
                var stripped = new StringBuilder(value.Length);
                foreach (var ch in value)
                {
                    if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                    {
                        stripped.Append(ch);
                    }
                }
                value = stripped.ToString();

                // 6) Kalan her seyi at; yalnizca [a-z0-9_.] kalsin.
                value = AllowedKeyChars.Replace(value, string.Empty);

                // 7) Anahtar hazir.
                return value;
            }
            catch (ArgumentException)
            {
                // Gecersiz Unicode (ornegin eslesmemis surrogate) Normalize() icinde patlar.
                // Bu sinif kimlik dogrulama yolunda calistigi icin ASLA exception firlatmamali.
                return string.Empty;
            }
        }

        /// <summary>
        /// Kullanicinin girdigi GORUNEN kullanici adinin kabul edilebilir olup olmadigini soyler.
        /// </summary>
        public static bool IsValidFormat(string? raw)
        {
            var trimmed = raw?.Trim();
            if (string.IsNullOrEmpty(trimmed))
            {
                return false;
            }

            if (trimmed.Length < 3 || trimmed.Length > 20)
            {
                return false;
            }

            if (!DisplayFormat.IsMatch(trimmed))
            {
                return false;
            }

            // Katlandiktan sonra geriye anlamli bir anahtar kalmali. Tamami noktalama olan
            // ("...") girdiler bu kontrolde elenir; aksi halde bos anahtarla kayit olurdu.
            return Normalize(trimmed).Length >= 3;
        }
    }
}
