using System.Text;

namespace GGHub.Core.Utilities
{
    /// <summary>
    /// Metin kisaltmanin TEK kaynagi. Duz s[..max] bir emojiyi (UTF-16'da iki karakter, surrogate cifti)
    /// ortasindan bolebilir; yarim kalan karakter UTF-8'e cevrilemez ve Npgsql yazarken
    /// EncoderFallbackException firlatir.
    ///
    /// Gercek olay (30 Eyl 2026, ilk hata kaydi): bot sahne turunun ozeti text[..277] ile kesildi,
    /// emoji ikiye bolundu, gorev sonucu DB'ye yazilamadi. Gonderi yayinlanmisti ama gorev Running
    /// kaldi ve ayni tikteki diger gorevler islenmedi.
    ///
    /// Kural: veritabanina, loga ya da istemciye giden her kisaltma buradan gecer.
    /// </summary>
    public static class SafeText
    {
        /// <summary>En fazla max karakter; kesim noktasi bir surrogate ciftini bolmez.</summary>
        public static string Truncate(string value, int max)
        {
            if (max <= 0) return string.Empty;
            if (value.Length <= max) return value;

            var end = max;
            // Kesimden sonraki ilk karakter cifte ait ikinci yariysa, ilk yari da disarida kalir.
            if (char.IsLowSurrogate(value[end]) && char.IsHighSurrogate(value[end - 1])) end--;
            return value[..end];
        }

        /// <summary>Null'u korur.</summary>
        public static string? TruncateOrNull(string? value, int max) => value is null ? null : Truncate(value, max);

        /// <summary>Uzunsa max karaktere sigacak sekilde keser ve sonuna "..." ekler (toplam en fazla max).</summary>
        public static string Ellipsis(string value, int max)
        {
            if (value.Length <= max) return value;
            return Truncate(value, Math.Max(0, max - 3)).TrimEnd() + "...";
        }

        /// <summary>
        /// Eslesmemis (yarim) surrogate karakterlerini atar. Kisaltma disindaki kaynaklar icin son savunma:
        /// dis sistemden gelen metin ya da eski kodun kestigi deger DB'ye yazilmadan once.
        /// </summary>
        public static string? RemoveLoneSurrogates(string? value)
        {
            if (string.IsNullOrEmpty(value)) return value;

            StringBuilder? builder = null;
            for (var i = 0; i < value.Length; i++)
            {
                var c = value[i];
                var valid = !char.IsSurrogate(c) ||
                            (char.IsHighSurrogate(c) && i + 1 < value.Length && char.IsLowSurrogate(value[i + 1])) ||
                            (char.IsLowSurrogate(c) && i > 0 && char.IsHighSurrogate(value[i - 1]));

                if (valid)
                {
                    builder?.Append(c);
                    continue;
                }

                builder ??= new StringBuilder(value, 0, i, value.Length);
            }
            return builder?.ToString() ?? value;
        }
    }
}
