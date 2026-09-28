using System.Text.RegularExpressions;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Model ciktisindaki "@kullaniciadi" yazimlarini gercek etiket token'ina (@[u:id]) cevirir.
    /// YALNIZCA izinli kume (botlar ve AI etkilesimine riza vermis katilimcilar) etiketlenir;
    /// geri kalan @'ler duz metne iner. Boylece bot, riza vermemis birini asla etiketleyemez
    /// (etiket bildirim demek) ve modelin uydurdugu adlar tiklanir link olmaz.
    /// </summary>
    public static class AiMentionLinker
    {
        // Kullanici adindaki noktalar desteklenir ama sondaki nokta cumle noktasi sayilir.
        private static readonly Regex Handle = new(@"(?<![\w@\[])@([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)", RegexOptions.Compiled);

        // Inceleme ve yorumlardaki DUZ etiket: MentionService ile ayni harf kumesi (Unicode harf,
        // rakam, alt cizgi, nokta). Orada "@ad" token'a donmez, dogrudan bildirim uretir.
        private static readonly Regex PlainHandle = new(@"(?<![\p{L}\p{N}_.@\[])@([\p{L}\p{N}_.]{1,30})", RegexOptions.Compiled);

        /// <param name="allowed">Kucuk harf kullanici adi -> kullanici kimligi.</param>
        public static string Link(string text, IReadOnlyDictionary<string, int> allowed)
            => Handle.Replace(text, m =>
                allowed.TryGetValue(m.Groups[1].Value.ToLowerInvariant(), out var id)
                    ? $"@[u:{id}]"
                    : m.Groups[1].Value);

        /// <summary>Metinde verilen kullanici etiketlenmis mi (token olarak).</summary>
        public static bool Mentions(string linkedText, int userId) => linkedText.Contains($"@[u:{userId}]", StringComparison.Ordinal);

        /// <summary>Metindeki duz "@ad" yazimlari (token olmayanlar), sondaki cumle noktasi atilmis.</summary>
        public static IReadOnlyList<string> PlainHandles(string text)
            => PlainHandle.Matches(text)
                .Select(m => m.Groups[1].Value.TrimEnd('.'))
                .Where(h => h.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

        /// <summary>Duz "@ad" yazimlarini degistirir; replace sondaki noktasiz adi alir.</summary>
        public static string ReplacePlainHandles(string text, Func<string, string> replace)
            => PlainHandle.Replace(text, m =>
            {
                var raw = m.Groups[1].Value;
                var name = raw.TrimEnd('.');
                return name.Length == 0 ? m.Value : replace(name) + raw[name.Length..];
            });

        /// <summary>
        /// Bot incelemesi ve yorumu icin: bu metinlerde "@ad" dogrudan bildirim uretir (MentionService).
        /// Izinli kume (ayni dildeki botlar + riza vermis muhatap) disindaki her "@" duz metne iner.
        /// </summary>
        public static string KeepAllowedHandles(string text, IReadOnlySet<string> allowedLower)
            => ReplacePlainHandles(text, name => allowedLower.Contains(name.ToLowerInvariant()) ? "@" + name : name);
    }
}
