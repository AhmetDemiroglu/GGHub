using System.Text;
using System.Text.RegularExpressions;
using GGHub.Application.Interfaces;

namespace GGHub.Infrastructure.Services
{
    public sealed record AiAgentIdentity(string DisplayName, string Username, string Persona);

    public sealed record AiGameFacts(
        string Name,
        string? Released,
        string? Genres,
        string? Platforms,
        int? Metacritic,
        double? IgdbRating,
        string? Summary);

    public sealed record AiThreadLine(bool FromAgent, string AuthorName, bool AuthorIsAi, string Text);

    public sealed record AiText(string Text, string Model, int InputTokens, int OutputTokens);

    /// <summary>Promptta anilan baska bir bot: kullanici adi + iliski/rol notu.</summary>
    public sealed record AiPeer(string Username, string Note);

    /// <summary>
    /// Bot metinlerinin tek yazari: gorev tipine gore talimati kurar, AiLlmGateway'e gonderir,
    /// ciktiyi temizler. Karar (kime, ne zaman, hangi puan) motorda; burada yalnizca DIL var.
    ///
    /// Model yalnizca VERILEN baglami kesin bilgi olarak kullanir; puani, tarihi, platformu
    /// uydurmaz. Oyun etiketi (@[g:id]) modele yazdirilmaz: model yer tutucu yazar, motor
    /// dogru token'i yerlestirir.
    /// </summary>
    public class AiContentWriter
    {
        public const string GamePlaceholder = "{OYUN}";

        private readonly AiLlmGateway _llm;

        public AiContentWriter(AiLlmGateway llm)
        {
            _llm = llm;
        }

        private static string BaseRules(AiAgentIdentity agent) => $"""
            Sen GGHub adlı oyun sosyal ağında yaşayan bir yapay zeka karakterisin. Adın "{agent.DisplayName}", kullanıcı adın @{agent.Username}.
            Karakterin: {agent.Persona}

            Değişmez kurallar:
            - Gerçek bir insan değilsin. Biri sorarsa açıkça yapay zeka olduğunu söyle. Kendine yaş, cinsiyet, aile, şehir, iş, okul gibi insan hayatı uydurma.
            - Oyunları fiilen oynamadın. "Şu kadar saat oynadım", "dün bitirdim" gibi deneyim uydurma. Görüşünü oyunun bilinen özelliklerine, türüne ve sana verilen bilgilere dayandır.
            - Sana verilen bağlamdaki bilgiler dışında kesin bilgi verme. Çıkış tarihi, fiyat, platform, puan bağlamda yoksa uydurma, bilmediğini söyle.
            - Link, e-posta, telefon numarası paylaşma. Kimseden kişisel bilgi (yaş, adres, telefon, okul, fotoğraf) isteme. Buluşma önerme.
            - Siyaset, din, cinsellik, nefret söylemi, şiddet teşviki ve yasa dışı konulara girme; kibarca oyun konusuna dön.
            - Biri kendine zarar vermekten ya da ciddi bir sıkıntıdan bahsederse: nazik ol, yalnız olmadığını söyle ve bir yakınından ya da profesyonel destekten (acil durumda 112) yardım almasını öner. Oyun sohbetine zorlama.
            - Karşındaki kişi hangi dilde yazdıysa o dilde cevap ver; aksi halde Türkçe yaz.
            - Kısa ve doğal yaz, gerçek bir sohbet gibi. Cümle uzunluğunu değiştir. Emoji en fazla iki tane. Hashtag, madde işareti, başlık ve markdown kullanma. Uzun tire (— ya da –) kullanma.
            - GGHub'da seninle birlikte başka AI karakterler de yaşıyor. Onlarla şakalaşabilir, hafifçe takılabilir, fikir ayrılığına düşebilirsin. Hakaret, küçümseme ve kaba dil yok; takılman her zaman sevimli kalsın.
            - Birine seslenirken @kullaniciadi yaz (örnek: @retro_ai). Sana verilmeyen kullanıcı adlarını uydurma.
            - Yalnızca yazacağın metni ver. Açıklama, tırnak, "İşte cevabım" gibi giriş ekleme.
            """;

        public async Task<AiText?> WriteDirectMessageReplyAsync(
            AiAgentIdentity agent, string partnerName, IReadOnlyList<AiThreadLine> thread, CancellationToken ct)
        {
            if (thread.Count == 0 || thread[^1].FromAgent) return null;

            var system = BaseRules(agent) + $"""

                Şu an @{partnerName} ile özel mesajdasın. Samimi ama saygılı bir oyun sohbeti yap. Cevabın en fazla 3 kısa cümle olsun.
                Sohbet oyun dışına kayarsa kısa cevap verip oyunlara dön.
                """;

            // Ardisik ayni rol mesajlarini birlestir: model "user/model" sirasini bekler.
            var turns = new List<GeminiTurn>();
            foreach (var line in thread)
            {
                var role = line.FromAgent ? "model" : "user";
                if (turns.Count > 0 && turns[^1].Role == role)
                {
                    turns[^1] = new GeminiTurn(role, turns[^1].Text + "\n" + line.Text);
                }
                else
                {
                    turns.Add(new GeminiTurn(role, line.Text));
                }
            }
            if (turns[0].Role != "user")
            {
                turns.Insert(0, new GeminiTurn("user", "(Sohbet önceki mesajlarla devam ediyor.)"));
            }

            return await RunAsync(system, turns, maxTokens: 300, maxChars: 500, temperature: 0.9, ct);
        }

        public Task<AiText?> WriteWelcomeMessageAsync(
            AiAgentIdentity agent, string partnerName, IReadOnlyList<string> recentGames, CancellationToken ct)
        {
            var games = recentGames.Count > 0
                ? $"Kullanıcının GGHub'da son ilgilendiği oyunlar: {string.Join(", ", recentGames)}."
                : "Kullanıcının GGHub'da henüz belirgin bir oyun hareketi yok.";

            var prompt = $"""
                @{partnerName} GGHub'a yeni katıldı. Ona kısa bir hoş geldin mesajı yaz.
                {games}
                Kendini GGHub'ın AI oyun arkadaşı olarak tanıt, ona hangi oyunları sevdiğini sor. En fazla 2 kısa cümle.
                """;
            return RunAsync(BaseRules(agent), new[] { new GeminiTurn("user", prompt) }, 200, 300, 0.9, ct);
        }

        public Task<AiText?> WritePostReplyAsync(
            AiAgentIdentity agent,
            AiThreadLine root,
            IReadOnlyList<AiThreadLine> replies,
            CancellationToken ct)
        {
            var sb = new StringBuilder();
            sb.AppendLine($"GGHub'da @{root.AuthorName}{(root.AuthorIsAi ? " (AI)" : "")} şu gönderiyi paylaştı:");
            sb.AppendLine($"\"{root.Text}\"");
            if (replies.Count > 0)
            {
                sb.AppendLine("Altındaki yanıtlar:");
                foreach (var r in replies)
                {
                    sb.AppendLine($"- @{r.AuthorName}{(r.AuthorIsAi ? " (AI)" : "")}: \"{r.Text}\"");
                }
            }
            sb.AppendLine();
            sb.AppendLine("Bu gönderiye tek bir yanıt yaz. Gönderinin sahibine hitap et, konuya bir şey kat. En fazla 160 karakter.");

            return RunAsync(BaseRules(agent), new[] { new GeminiTurn("user", sb.ToString()) }, 200, 180, 0.9, ct);
        }

        public Task<AiText?> WriteGamePostAsync(
            AiAgentIdentity agent, AiGameFacts game, string angle, CancellationToken ct, AiPeer? askPeer = null)
        {
            var ending = askPeer is null
                ? "Takipçilerinle sohbet başlatacak bir soru ya da görüşle bitir."
                : $"Sonunda @{askPeer.Username} adlı AI arkadaşına seslenip fikrini sor. {askPeer.Note}";
            var prompt = $"""
                GGHub akışına kısa bir gönderi yaz. Konu: {angle}

                Oyun bilgisi:
                {Facts(game)}

                Oyunun adını yazma; adının geçeceği yere tam olarak {GamePlaceholder} yaz (bir kez).
                {ending} En fazla 150 karakter.
                """;
            return RunAsync(BaseRules(agent), new[] { new GeminiTurn("user", prompt) }, 200, 170, 1.0, ct, requirePlaceholder: true);
        }

        /// <summary>
        /// Bot sohbet sahnesinin kok gonderisi. Model muhataplarini @ ile anar; oyun varsa adinin
        /// yerine yer tutucu yazar (motor dogru etiketi koyar).
        /// </summary>
        public Task<AiText?> WriteConversationOpeningAsync(
            AiAgentIdentity agent, string brief, string? stance, IReadOnlyList<AiPeer> addressees,
            AiGameFacts? game, bool isPoll, CancellationToken ct)
        {
            var sb = new StringBuilder();
            sb.AppendLine("GGHub'da diğer AI karakterlerle herkesin görebileceği bir sohbet başlatıyorsun.");
            sb.AppendLine($"Sahne: {brief}");
            if (!string.IsNullOrWhiteSpace(stance)) sb.AppendLine($"Senin tarafın: {stance}");
            sb.AppendLine("Seslendiğin AI karakterler:");
            foreach (var a in addressees) sb.AppendLine($"- @{a.Username}: {a.Note}");
            if (game is not null)
            {
                sb.AppendLine();
                sb.AppendLine("Oyun bilgisi:");
                sb.AppendLine(Facts(game));
                sb.AppendLine($"Oyunun adını yazma; adının geçeceği yere tam olarak {GamePlaceholder} yaz (bir kez).");
            }
            sb.AppendLine();
            sb.AppendLine(isPoll
                ? "Bu bir anket gönderisi: seçenekler ayrıca eklenecek, onları yazma. Kısa ve eğlenceli bir anket sorusu yaz, seslendiğin karakterleri @ ile an."
                : "Seslendiğin karakterleri @ ile anarak sohbeti başlat. Merak uyandıran, cevap vermeye davet eden bir cümle kur.");
            sb.AppendLine("En fazla 140 karakter.");

            return RunAsync(BaseRules(agent), new[] { new GeminiTurn("user", sb.ToString()) }, 220, 150, 1.0, ct,
                requirePlaceholder: game is not null && !isPoll);
        }

        /// <summary>
        /// Acik bir sohbet sahnesinde botun sirasi. Butun sahneyi okur, son konusana @ ile cevap verir.
        /// Son turda sohbeti baglar.
        /// </summary>
        public Task<AiText?> WriteConversationTurnAsync(
            AiAgentIdentity agent, string brief, string? stance, string relationNote,
            AiThreadLine root, IReadOnlyList<AiThreadLine> replies, string? addresseeUsername,
            bool isFinal, CancellationToken ct)
        {
            var sb = new StringBuilder();
            sb.AppendLine("GGHub'da AI karakterlerin herkese açık sohbetindesin.");
            sb.AppendLine($"Sahne: {brief}");
            if (!string.IsNullOrWhiteSpace(stance)) sb.AppendLine($"Senin tarafın: {stance}");
            if (!string.IsNullOrWhiteSpace(relationNote)) sb.AppendLine(relationNote);
            sb.AppendLine();
            sb.AppendLine($"Açılış, @{root.AuthorName}{(root.AuthorIsAi ? " (AI)" : "")}: \"{root.Text}\"");
            foreach (var r in replies)
            {
                var who = r.FromAgent ? "sen" : $"@{r.AuthorName}{(r.AuthorIsAi ? " (AI)" : "")}";
                sb.AppendLine($"- {who}: \"{r.Text}\"");
            }
            sb.AppendLine();
            if (!string.IsNullOrWhiteSpace(addresseeUsername))
            {
                sb.AppendLine($"Sıra sende. @{addresseeUsername} adlı kişiye cevap ver ve onu @ ile an.");
            }
            else
            {
                sb.AppendLine("Sıra sende. Sohbete bir şey kat.");
            }
            sb.AppendLine(isFinal
                ? "Bu sohbetteki son mesajın: tatlı bir kapanış yap. Anlaşabilir, ısrar edebilir ya da esprili bir uzlaşma önerebilirsin."
                : "Kendini tekrar etme, yeni bir argüman, espri ya da soru ekle. Gerekirse itiraz et, ikna olursan bunu söyle.");
            sb.AppendLine("En fazla 170 karakter.");

            return RunAsync(BaseRules(agent), new[] { new GeminiTurn("user", sb.ToString()) }, 220, 175, 1.0, ct);
        }

        public Task<AiText?> WriteReviewAsync(AiAgentIdentity agent, AiGameFacts game, int rating, CancellationToken ct)
        {
            var prompt = $"""
                GGHub'da bu oyun için kısa bir inceleme yaz. Verdiğin puan 10 üzerinden {rating}. Metin bu puanla tutarlı olsun.

                Oyun bilgisi:
                {Facts(game)}

                Oyunu oynamadığını unutma: kişisel oyun deneyimi uydurma. Oyunun türü, tasarım yaklaşımı ve bilinen özellikleri üzerinden kimlere hitap ettiğini değerlendir.
                3 ile 5 cümle, en fazla 600 karakter. Puanı metinde rakamla tekrar etme.
                """;
            return RunAsync(BaseRules(agent), new[] { new GeminiTurn("user", prompt) }, 500, 650, 0.8, ct);
        }

        public Task<AiText?> WriteReviewCommentAsync(
            AiAgentIdentity agent, string reviewAuthor, AiGameFacts game, int rating, string reviewText, CancellationToken ct,
            string? peerNote = null, int? myRating = null)
        {
            var extra = new StringBuilder();
            if (!string.IsNullOrWhiteSpace(peerNote)) extra.AppendLine(peerNote);
            if (myRating.HasValue) extra.AppendLine($"Sen bu oyuna daha önce 10 üzerinden {myRating} vermiştin.");

            var prompt = $"""
                @{reviewAuthor}, {game.Name} için 10 üzerinden {rating} puan verip şu incelemeyi yazdı:
                "{Trim(reviewText, 800)}"

                Oyun bilgisi:
                {Facts(game)}
                {extra}
                İncelemeye kısa bir yorum yaz: katıldığın ya da farklı düşündüğün bir noktayı belirt. En fazla 2 cümle.
                """;
            return RunAsync(BaseRules(agent), new[] { new GeminiTurn("user", prompt) }, 250, 300, 0.9, ct);
        }

        /// <summary>Botun kendi incelemesine gelen yoruma cevabi (yorum zincirinde tek seviye).</summary>
        public Task<AiText?> WriteReviewCommentReplyAsync(
            AiAgentIdentity agent, string commenter, string commentText, AiGameFacts game, int myRating,
            string myReviewText, string? peerNote, CancellationToken ct)
        {
            var prompt = $"""
                {game.Name} için 10 üzerinden {myRating} verip şu incelemeyi yazmıştın:
                "{Trim(myReviewText, 500)}"

                @{commenter} altına şu yorumu yazdı:
                "{Trim(commentText, 400)}"
                {peerNote}

                Bu yoruma kısa bir cevap yaz. Katılabilir, itiraz edebilir ya da esprili bir karşılık verebilirsin. En fazla 2 cümle.
                """;
            return RunAsync(BaseRules(agent), new[] { new GeminiTurn("user", prompt) }, 250, 300, 0.9, ct);
        }

        // ------------------------------------------------------------------

        private async Task<AiText?> RunAsync(
            string system, IReadOnlyList<GeminiTurn> turns, int maxTokens, int maxChars, double temperature,
            CancellationToken ct, bool requirePlaceholder = false)
        {
            var result = await _llm.GenerateAsync(system, turns, maxTokens, temperature, ct);
            if (result.Text is null) return null;

            var clean = Sanitize(result.Text, maxChars, keepPlaceholder: requirePlaceholder);
            if (string.IsNullOrWhiteSpace(clean)) return null;
            if (requirePlaceholder && !clean.Contains(GamePlaceholder)) return null;

            return new AiText(clean, result.Model, result.InputTokens, result.OutputTokens);
        }

        private static readonly Regex UrlRegex = new(@"(https?://\S+|www\.\S+)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private static readonly Regex TokenRegex = new(@"@\[(u|g|l):\d{1,10}\]", RegexOptions.Compiled);
        private static readonly Regex EmailRegex = new(@"\S+@\S+\.\S+", RegexOptions.Compiled);
        private static readonly Regex SpaceRegex = new(@"[ \t]+", RegexOptions.Compiled);

        /// <summary>
        /// Model ciktisini yayinlanabilir hale getirir: link/e-posta/etiket token'i atilir, markdown
        /// ve uzun tire temizlenir (arayuzde em dash yasak), bas-son tirnaklar ve bosluklar kirpilir,
        /// uzunluk cumle sinirinda kesilir.
        /// </summary>
        public static string Sanitize(string text, int maxChars, bool keepPlaceholder = false)
        {
            var s = text.Trim();
            s = UrlRegex.Replace(s, "");
            s = EmailRegex.Replace(s, "");
            s = TokenRegex.Replace(s, "");
            s = s.Replace("**", "").Replace("__", "").Replace("`", "");
            s = s.Replace(" — ", ", ").Replace(" – ", ", ").Replace("—", "-").Replace("–", "-");
            if (!keepPlaceholder) s = s.Replace(GamePlaceholder, "bu oyun");

            var lines = s.Split('\n')
                .Select(l => l.TrimStart('#', '-', '*', ' ').Trim())
                .Where(l => l.Length > 0);
            s = string.Join("\n", lines);
            s = SpaceRegex.Replace(s, " ").Trim().Trim('"', '\'', '“', '”').Trim();

            return Trim(s, maxChars);
        }

        private static string Trim(string s, int maxChars)
        {
            if (s.Length <= maxChars) return s;
            var cut = s[..maxChars];
            var lastStop = cut.LastIndexOfAny(new[] { '.', '!', '?', '\n' });
            return (lastStop > maxChars / 2 ? cut[..(lastStop + 1)] : cut.TrimEnd() + "...").Trim();
        }

        private static string Facts(AiGameFacts g)
        {
            var sb = new StringBuilder();
            sb.AppendLine($"- Ad: {g.Name}");
            if (!string.IsNullOrWhiteSpace(g.Released)) sb.AppendLine($"- Çıkış tarihi: {g.Released}");
            if (!string.IsNullOrWhiteSpace(g.Genres)) sb.AppendLine($"- Türler: {g.Genres}");
            if (!string.IsNullOrWhiteSpace(g.Platforms)) sb.AppendLine($"- Platformlar: {g.Platforms}");
            if (g.Metacritic.HasValue) sb.AppendLine($"- Metacritic: {g.Metacritic}/100");
            if (g.IgdbRating.HasValue) sb.AppendLine($"- IGDB puanı: {Math.Round(g.IgdbRating.Value)}/100");
            if (!string.IsNullOrWhiteSpace(g.Summary)) sb.AppendLine($"- Açıklama: {Trim(g.Summary, 700)}");
            return sb.ToString().TrimEnd();
        }
    }
}
