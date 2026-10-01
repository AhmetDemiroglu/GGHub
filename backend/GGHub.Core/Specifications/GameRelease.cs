using System.Globalization;
using GGHub.Core.Entities;

namespace GGHub.Core.Specifications
{
    /// <summary>
    /// "Oyun cikti mi?" sorusunun tek cevabi. Cikmamis oyuna inceleme yazilamaz: puan ve
    /// metin oynanmamis bir oyun hakkinda olur, oyunun GGHub puanini ve vitrini kirletir
    /// (1 Ekim 2026: GTA VI'ya cikisindan once inceleme yazilabiliyordu).
    ///
    /// Iki kanit:
    /// 1) Tam cikis tarihi varsa o belirler (gelecekte = cikmadi).
    /// 2) Tarih yoksa kaynaklarin "henuz cikmadi" isareti (Game.UpcomingSeenAt): Steam
    ///    coming_soon, RAWG tba, IGDB tarihsiz + bekleyen kullanici. Isaret de yoksa oyun CIKMIS
    ///    sayilir: katalogda tarihi hic girilmemis eski oyunlar var, onlari kilitlemek yanlis olur.
    /// </summary>
    public static class GameRelease
    {
        /// <summary>
        /// "Cikmadi" isaretinin gecerlilik suresi. Kaynak oyunu bir daha tazelemezse isaret
        /// kendiliginden duser; cikmis bir oyun sonsuza dek kilitli kalmaz.
        /// </summary>
        public static readonly TimeSpan UpcomingSignalLifetime = TimeSpan.FromDays(180);

        private const int TurkeyUtcOffsetHours = 3;

        public static bool IsUnreleased(Game game, DateTime utcNow) =>
            IsUnreleased(game.Released, game.UpcomingSeenAt, utcNow);

        /// <summary>
        /// Gun siniri Turkiye saati (UTC+3, yaz saati yok): kullanicilarin cogu orada ve istemciler
        /// de cihazin yerel tarihine bakiyor. Ilk surum UTC+14 kullaniyordu; Turkiye'de ertesi gun
        /// cikacak oyun ("Infinite Museum", 2 Ekim) 1 Ekim ogleden sonra "cikti" sayiliyordu.
        /// </summary>
        public static bool IsUnreleased(string? released, DateTime? upcomingSeenAt, DateTime utcNow)
        {
            if (TryParseFullDate(released, out var date))
            {
                return date > DateOnly.FromDateTime(utcNow.AddHours(TurkeyUtcOffsetHours));
            }

            return upcomingSeenAt.HasValue && upcomingSeenAt.Value > utcNow - UpcomingSignalLifetime;
        }

        /// <summary>
        /// Kaynaktan gelen sinyali isler. true: kaynak "cikmadi, tarih yok" diyor. false: kaynak
        /// "cikti" diyor. null: kaynak bu konuda bir sey soylemiyor (dokunma). Degisiklik olduysa true.
        /// </summary>
        public static bool ApplyUpcomingSignal(Game game, bool? upcoming, DateTime utcNow)
        {
            if (upcoming == true)
            {
                // Her senkronda yazip satiri kirletmemek icin gunde bir tazelenir.
                if (game.UpcomingSeenAt is { } seen && utcNow - seen < TimeSpan.FromDays(1)) return false;
                game.UpcomingSeenAt = utcNow;
                return true;
            }

            if (upcoming == false && game.UpcomingSeenAt != null)
            {
                game.UpcomingSeenAt = null;
                return true;
            }

            return false;
        }

        /// <summary>
        /// RAWG: tba = true "cikmadi, tarih yok". tba = false tek basina "cikti" demek DEGIL
        /// (RAWG eski tarihsiz kayitlarda da false doner); yalniz tarih geldiyse "cikti" sayilir.
        /// Tarih gelecekteyse de isaret temizlenir: o durumda tarih zaten belirler.
        /// </summary>
        public static bool? RawgSignal(bool? tba, string? released) =>
            tba == true ? true : released != null ? false : null;

        /// <summary>
        /// IGDB: tarih yok ve oyunu bekleyen kullanici var (hypes yalniz cikis oncesi birikir)
        /// = cikmadi. Tarih varsa "cikti" isareti (tarih kurali belirler). Ikisi de yoksa bilgi yok:
        /// tarihi girilmemis eski bir oyunu kilitlememek icin dokunulmaz.
        /// </summary>
        public static bool? IgdbSignal(long? firstReleaseDate, int? hypes) =>
            firstReleaseDate is > 0 ? false : hypes is > 0 ? true : null;

        private static bool TryParseFullDate(string? released, out DateOnly date)
        {
            date = default;
            if (string.IsNullOrWhiteSpace(released) || released.Length < 10) return false;
            return DateOnly.TryParseExact(released[..10], "yyyy-MM-dd", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out date);
        }
    }
}
