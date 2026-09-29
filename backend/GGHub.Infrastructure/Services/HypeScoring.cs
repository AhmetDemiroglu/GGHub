namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Hype skorunun TEK hesap yeri. Hem HypeScoreJob (yazar) hem teshis raporu (yalnizca
    /// okur) burayi cagirir; agirliklar iki yerde ayri yazilsaydi rapor ile canli skor
    /// birbirinden kayardi.
    ///
    /// Tasarim kurallari:
    ///  1. Taban primi yok. Hicbir kaynakta izi olmayan oyun 0 alir.
    ///  2. Kaynaklar TOPLANMAZ, en guclusu alinir. Toplama PC oyunlarini kayiriyordu: ayni
    ///     ilgi Steam satis sirasi + istek listesi + IGDB'nin Steam turevli sinyali olarak
    ///     uc kez sayiliyor, tek kaynagi olan konsol ozel yapimi geride kaliyordu.
    ///  3. Ikinci en guclu kaynak kucuk bir teyit payi ekler: iki ayri yerde gorunen oyun,
    ///     tek yerde gorunenin onune gecer.
    /// </summary>
    public static class HypeScoring
    {
        /// <summary>Vitrine girmek icin gereken en dusuk skor.</summary>
        public const double HighlightFloor = 25.0;

        public record Signals(
            int? WikipediaViews30d,
            int? SteamSellerRank,
            double IgdbPopularity,
            int? Metacritic,
            int? IgdbRatingCount,
            double GghubActivity);

        public record Breakdown(
            double Wikipedia,
            double SteamSeller,
            double Igdb,
            double Metacritic,
            double IgdbVotes,
            double Gghub,
            double Total);

        /// <summary>
        /// Wikipedia okunmasi logaritmik olcekte: 1.000 okunma 0, 1.000.000 okunma 100 puan.
        /// Olculen ornekler (Eylul 2026): Marvel's Wolverine 732 bin = 95, GTA VI 460 bin = 89,
        /// Control Resonant 234 bin = 79, NBA 2K27 28 bin = 48.
        /// </summary>
        public static double WikipediaPoints(int? views30d)
        {
            if (views30d == null || views30d < 1000) return 0;
            return Math.Clamp((Math.Log10(views30d.Value) - 3.0) / 3.0 * 100.0, 0, 100);
        }

        public static Breakdown Compute(Signals s)
        {
            var wikipedia = WikipediaPoints(s.WikipediaViews30d);

            // Steam "en cok satanlar" ilk 150: 1. sira 68, 150. sira 23. Tavan Wikipedia'nin
            // altinda cunku bu liste O HAFTANIN satisidir: ayin son gunlerinde cikan oyun
            // ust siralarda, ayin basinda cikan buyuk yapim coktan asagida olur (olculdu:
            // 29 Eylul'de cikan oyun 3. sirada, 3 Eylul'de cikan The Blood of Dawnwalker 53.).
            var steamSeller = s.SteamSellerRank is int rank && rank >= 0
                ? Math.Max(68 - rank * 0.3, 0)
                : 0;

            // IGDB Want to Play / Playing / Visits + Twitch. Deger 0..100 normalize gelir.
            var igdb = Math.Min(Math.Max(s.IgdbPopularity, 0), 100) * 0.8;

            // RawgAdded BILEREK kullanilmiyor. Alan dort ayri kaynaktan yaziliyor (RAWG
            // "added", Steam istek listesi sirasi, IGDB hypes, IGDB oy sayisi x 3) ve ayni
            // sayi her birinde baska anlama geliyor. Olculdu: Eylul 2026'nin 2.542 oyunundan
            // 1.451'i yalnizca bu alan yuzunden vitrin esigini geciyordu.

            // Metacritic puaninin VARLIGI kanittir (en az dort elestirmen incelemis), degeri
            // ise kalitedir. Bu yuzden taban 30, puan yalnizca kucuk bir fark yaratir.
            var metacritic = s.Metacritic is int mc && mc > 0
                ? 30 + Math.Clamp((mc - 60) * 0.5, 0, 15)
                : 0;

            var igdbVotes = Math.Min(s.IgdbRatingCount ?? 0, 200) / 200.0 * 50;
            // GGHub hareketi tek basina vitrine ancak ciddi bir ilgiyle (birkac taze inceleme
            // + liste eklemesi) tasir; topluluk kucukken iki uc eklemeyle esik asilmamali.
            var gghub = Math.Min(Math.Max(s.GghubActivity, 0), 300) / 300.0 * 40;

            var ordered = new[] { wikipedia, steamSeller, igdb, metacritic, igdbVotes, gghub }
                .OrderByDescending(x => x)
                .ToArray();

            // Ust sinir yok: 100'de kesmek en buyuk yapimlari ayni skora yigiyordu.
            var total = ordered[0] + ordered[1] * 0.2;

            return new Breakdown(wikipedia, steamSeller, igdb, metacritic, igdbVotes, gghub,
                Math.Round(total, 2));
        }
    }
}
