namespace GGHub.Core.Entities
{
    /// <summary>
    /// Oyunun tur disindaki etiketleri: tema ("dark-fantasy"), mod ("co-op"), bakis acisi
    /// ("first-person"), anahtar kelime ("souls-like"). Benzer oyunlar algoritmasinin ana
    /// hammaddesi: iki oyunun "Action" turunu paylasmasi az sey soyler, "souls-like" +
    /// "open-world" + "dark-fantasy" paylasmasi cok sey soyler.
    ///
    /// GenresJson gibi JSON kolonu DEGIL, ayri tablo: etiketten oyuna gitmek (bu etiketi
    /// tasiyan oyunlar) ve etiket yayginligini olcmek (IDF) SQL'de ancak boyle mumkun.
    /// Kaynak basina yeniden yazilir (GameTagWriter); ayni slug iki kaynaktan gelirse tek satir.
    /// </summary>
    public class GameTag
    {
        public long Id { get; set; }
        public int GameId { get; set; }
        public Game Game { get; set; } = null!;

        /// <summary>Kaynaklar arasi ortak anahtar; kucuk harf, tireli ("open-world").</summary>
        public string Slug { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        /// <summary>"rawg" | "igdb" | "steam". Kaynak bazli yeniden yazim icin.</summary>
        public string Source { get; set; } = string.Empty;
    }
}
