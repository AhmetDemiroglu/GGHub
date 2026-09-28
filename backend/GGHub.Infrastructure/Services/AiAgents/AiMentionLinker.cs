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

        /// <param name="allowed">Kucuk harf kullanici adi -> kullanici kimligi.</param>
        public static string Link(string text, IReadOnlyDictionary<string, int> allowed)
            => Handle.Replace(text, m =>
                allowed.TryGetValue(m.Groups[1].Value.ToLowerInvariant(), out var id)
                    ? $"@[u:{id}]"
                    : m.Groups[1].Value);

        /// <summary>Metinde verilen kullanici etiketlenmis mi (token olarak).</summary>
        public static bool Mentions(string linkedText, int userId) => linkedText.Contains($"@[u:{userId}]", StringComparison.Ordinal);
    }
}
