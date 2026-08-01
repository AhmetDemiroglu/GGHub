using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using GGHub.Core.Enums;

namespace GGHub.Core.Specifications
{
    /// <summary>
    /// Gonderi metnindeki TIPLI etiket token'inin tek kaynagi.
    ///
    /// Bicim: "@[u:123]" (kisi), "@[g:456]" (oyun), "@[l:789]" (liste).
    ///
    /// Neden token, neden duz metin degil:
    /// Mevcut etiket sistemi (MentionService.MentionRegex) yalnizca
    /// "@kullaniciadi" yakaliyor ve karakter sinifi bosluk icermiyor. Oyun ve
    /// liste adlari bosluk iceriyor ("The Witcher 3: Wild Hunt"), dolayisiyla
    /// ayni desenle cozulemezler.
    ///
    /// Neden GORUNEN AD token'a gomulmuyor:
    /// NotificationService'te yerlesik olan kuralin aynisi. Orada da aktor adi
    /// messageArgs'a konmuyor, okuma aninda ActorUserId'den cozuluyor ki yeniden
    /// adlandirma geriye dogru yayilsin. Oyun adi ceviriyle degisiyor, liste adi
    /// duzenlenebiliyor, kullanici adi degistirilebiliyor: uçunde de gomulu ad
    /// eskimis olurdu.
    ///
    /// Eski "@kullaniciadi" duz etiketleri BOZULMUYOR: istemciler once bu
    /// token'lari, sonra kalan metinde eski deseni isliyor. Kullanici acilir
    /// listeden secmeden elle "@ahmet" yazarsa yine linkleniyor.
    /// </summary>
    public static class MentionTokens
    {
        /// <summary>
        /// Token deseni. Istemci kopyalari (web mention-text.tsx,
        /// mobil MentionText.tsx) bunun AYNISI olmali.
        /// </summary>
        public const string PatternSource = @"@\[(u|g|l):(\d{1,10})\]";

        private static readonly Regex TokenRegex = new(PatternSource, RegexOptions.Compiled);

        /// <summary>
        /// Tek gonderide islenecek azami tipli etiket sayisi.
        /// MentionService.MaxMentionsPerBody ile ayni felsefe: sinir yalnizca
        /// isi kirpar, gonderi ASLA reddedilmez.
        /// </summary>
        public const int MaxMentionsPerPost = 10;

        public readonly record struct ParsedMention(
            MentionTargetType Type,
            int TargetId,
            int Position,
            int Length);

        public static string Prefix(MentionTargetType type) => type switch
        {
            MentionTargetType.User => "u",
            MentionTargetType.Game => "g",
            _ => "l"
        };

        public static string Build(MentionTargetType type, int targetId)
            => $"@[{Prefix(type)}:{targetId}]";

        /// <summary>
        /// Metindeki token'lari sirayla cikarir. Ayni hedef birden fazla kez
        /// gecerse HEPSI donulur (her birinin kendi Position'i var, istemci
        /// hepsini ayri ayri cizmek zorunda); tekillestirme cagiran tarafta.
        /// </summary>
        public static IReadOnlyList<ParsedMention> Parse(string? content)
        {
            if (string.IsNullOrEmpty(content)) return Array.Empty<ParsedMention>();

            var result = new List<ParsedMention>();

            foreach (Match match in TokenRegex.Matches(content))
            {
                var type = match.Groups[1].Value switch
                {
                    "u" => MentionTargetType.User,
                    "g" => MentionTargetType.Game,
                    _ => MentionTargetType.List
                };

                // \d{1,10} int'i asabilir (ornegin 9999999999). TryParse ile
                // eleniyor; basarisiz token duz metin olarak kaliyor.
                if (!int.TryParse(match.Groups[2].Value, out var targetId) || targetId <= 0) continue;

                result.Add(new ParsedMention(type, targetId, match.Index, match.Length));

                if (result.Count >= MaxMentionsPerPost) break;
            }

            return result;
        }

        /// <summary>
        /// Token'lari yer tutucuyla degistirip KULLANICIYA GORUNEN uzunlugu
        /// hesaplar. 200 karakter siniri buna uygulanir, ham metne degil.
        ///
        /// Gorunen ad okuma aninda cozuldugu icin gercek uzunluk gonderi
        /// atildiktan sonra da degisebilir (oyun adi cevrilince vb.). Bu yuzden
        /// sinir sabit bir yer tutucu maliyetiyle olculuyor: kullanici composer'da
        /// gordugu sayacla sunucunun hesabi ayni olmali, yoksa "sayac 197
        /// diyordu ama gonderi gitmedi" durumu olusur.
        ///
        /// displayLengths: token sirasina karsilik gelen gorunen ad uzunluklari.
        /// Cozulemeyen token icin cagiran 0 gecebilir.
        /// </summary>
        public static int VisibleLength(string? content, IReadOnlyList<int> displayLengths)
        {
            if (string.IsNullOrEmpty(content)) return 0;

            var tokens = Parse(content);
            var rawTokenLength = 0;
            for (var i = 0; i < tokens.Count; i++) rawTokenLength += tokens[i].Length;

            var displayTotal = 0;
            for (var i = 0; i < tokens.Count; i++)
            {
                // "@" isareti gorunen metinde de duruyor.
                displayTotal += 1 + (i < displayLengths.Count ? displayLengths[i] : 0);
            }

            return content.Length - rawTokenLength + displayTotal;
        }
    }
}
