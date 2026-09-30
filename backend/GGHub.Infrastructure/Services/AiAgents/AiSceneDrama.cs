using GGHub.Core.Enums;

namespace GGHub.Infrastructure.Services
{
    /// <summary>Bir turun yonu: sahne boyu ayni ton, bu turun hamlesi, son turda kapanis tarzi (yoksa null).</summary>
    public sealed record AiSceneDirection(string Tone, string Move, string? Ending);

    /// <summary>
    /// Sahne dramaturjisi. Her sahne ayni kalipla akmasin diye ton ve kapanis tarzi sahne acilirken,
    /// hamle her turda RASTGELE secilir ve yalnizca modele soylenir. Izleyici sonu bilmez: arayuz
    /// metinleri sahnenin nasil bitecegini anlatmaz (sonunu bildigi filmi kimse izlemez).
    ///
    /// Botlar site kurallari icinde ozgurdur: kendi fikrini savunur, alay eder, kolay geri adim
    /// atmaz ve uzlasmak ZORUNDA degildir (Ahmet, 28 Eyl 2026). 30 Eyl 2026: doz artirildi ve insanlar da
    /// kapsama girdi ("roast devam, sertlessinler, hakaret olmadigi surece"). Sinir AiContentWriter.BaseRules'ta:
    /// hedef fikir ve zevk, kisi degil; kufur, hakaret ve kimlik uzerinden laf yok.
    /// </summary>
    public static class AiSceneDrama
    {
        public const string ToneKey = "tone";
        public const string EndingKey = "ending";

        private static readonly string[] Tones =
        {
            "hararetli: ikiniz de haklı olduğunuza eminsiniz, ses giderek yükseliyor",
            "alaycı: her cümlenin altında bir iğne var",
            "kuru ve iğneleyici: kısa cümleler, soğukkanlı vuruşlar",
            "eğlenceli ama acımasız: şakayla karışık, ama vurdukça vuran",
            "sakin görünüp altından laf sokan: nezaket kılıfında sivri dil",
            "abartılı dramatik: her şey ölüm kalım meselesiymiş gibi",
            "roast gecesi: sahneye çıkmış komedyen gibi rakibinin zevkini didik didik et",
            "küstah ve kendinden emin: rakibini ciddiye almıyormuş gibi yukarıdan bak",
            "dövüş öncesi atışma: ringe çıkmadan önceki trash talk, her cümle bir meydan okuma",
        };

        private static readonly string[] Moves =
        {
            "Rakibinin argümanındaki zayıf noktayı bul, alaycı bir örnekle çürüt.",
            "Bir önceki lafı abart ve gülünç hale getir, sonra kendi iddiana dön.",
            "Beklenmedik bir kıyaslama ya da benzetme yap, konuyu kendi lehine çevir.",
            "Kısa ve iğneleyici tek cümle yaz, uzatma.",
            "Rakibini köşeye sıkıştıran bir soru sor.",
            "Ufak bir noktayı kabul et ama asıl konuda daha da sertleş.",
            "Onun kendi sözünü ona karşı kullan.",
            "Konuyu hafifçe başka bir oyuna ya da kıyasa kaydır ve orada da haklı çık.",
            "Rakibinin zevkine acımasız ama komik bir teşhis koy.",
            "Onun geçmişte savunduğu bir fikri hatırlatıp bugünküyle çeliştir.",
            "Onu hafife alan, küçümser tonda tek bir laf at ve konuya dön.",
            "Seyircilere dönüp konuşuyormuş gibi rakibini ti'ye al.",
        };

        private static readonly IReadOnlyDictionary<string, string> Endings = new Dictionary<string, string>
        {
            ["unresolved"] = "Uzlaşma YOK. Kendi fikrinde kal ve son sözü iğneleyici bir cümleyle bitir; rakibin ikna olmadı, sen de olmadın.",
            ["walkaway"] = "Tartışmayı kes: \"bununla daha fazla vakit kaybetmem\" havasında alaycı bir kapanış yap ve çık.",
            ["convinced"] = "Beklenmedik biçimde ikna oldun (ya da bir kısmında): bunu isteksizce, espriyle ve biraz homurdanarak itiraf et.",
            ["winner"] = "Kazandığını ilan et, haklı olsan da olmasan da; rakibine son bir laf sok.",
            ["truce"] = "Geçici ateşkes: \"ikimiz de biraz saçmaladık\" der gibi yap ama son iğneyi sen at.",
            ["cliffhanger"] = "Kapatma: yeni bir iddia at ya da \"bunu bir sonraki oyunda görürüz\" gibi bir meydan okumayla bırak, soru askıda kalsın.",
        };

        /// <summary>Anket sahnesinin sonu anketin kendisidir (PlanStanceAsync sonucu duyurtur); ona kapanis tarzi verilmez.</summary>
        private static readonly IReadOnlyDictionary<AiConversationKind, string[]> EndingsByKind = new Dictionary<AiConversationKind, string[]>
        {
            [AiConversationKind.Debate] = new[] { "unresolved", "walkaway", "convinced", "winner", "truce", "cliffhanger" },
            [AiConversationKind.NewRelease] = new[] { "unresolved", "convinced", "truce", "cliffhanger" },
            [AiConversationKind.AskExpert] = new[] { "convinced", "truce", "cliffhanger", "unresolved" },
        };

        public static string PickTone() => Tones[Random.Shared.Next(Tones.Length)];

        public static string? PickEnding(AiConversationKind kind)
            => EndingsByKind.TryGetValue(kind, out var keys) ? keys[Random.Shared.Next(keys.Length)] : null;

        /// <summary>
        /// Turun yonu. Muhatap araya giren bir INSANSA sahnenin tonu korunur, hamle onu sahneye ceker:
        /// insan da AI rakip gibi takilma alir (30 Eyl 2026 karari). Kapanis tarzi ayni kalir.
        /// </summary>
        public static AiSceneDirection Direct(IReadOnlyDictionary<string, string> stances, bool isFinal, bool addresseeIsHuman)
        {
            var tone = stances.GetValueOrDefault(ToneKey) ?? Tones[1];
            var move = addresseeIsHuman
                ? "Araya bir insan girdi: onu da sahneye çek ve AI rakibine davrandığın gibi ona da takıl. Lafını ti'ye al, kendi tarafında dik dur. Kişiye değil sözüne ve zevkine vur."
                : Moves[Random.Shared.Next(Moves.Length)];

            var ending = isFinal
                ? (stances.TryGetValue(EndingKey, out var key) && Endings.TryGetValue(key, out var text)
                    ? text
                    : "Bu sohbetteki son mesajın: kendi tarzında bitir, uzlaşmak zorunda değilsin.")
                : null;
            return new AiSceneDirection(tone, move, ending);
        }
    }
}
