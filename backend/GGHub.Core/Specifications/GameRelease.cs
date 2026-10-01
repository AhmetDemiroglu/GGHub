using System.Globalization;

namespace GGHub.Core.Specifications
{
    /// <summary>
    /// "Oyun cikti mi?" sorusunun tek cevabi. Cikmamis oyuna inceleme yazilamaz: puan ve
    /// metin oynanmamis bir oyun hakkinda olur, oyunun GGHub puanini ve vitrini kirletir
    /// (1 Ekim 2026: GTA VI'ya cikisindan once inceleme yazilabiliyordu).
    /// </summary>
    public static class GameRelease
    {
        /// <summary>
        /// Cikis tarihi gelecekteyse true. Tarih yoksa false: katalogda tarihi hic girilmemis
        /// eski oyunlar var, onlari kilitlemek yanlis olur.
        /// Gun sinirinda en erken saat dilimi (UTC+14) esas: oyun dunyanin herhangi bir yerinde
        /// ciktigi an inceleme acilir.
        /// </summary>
        public static bool IsUnreleased(string? released, DateTime utcNow)
        {
            if (string.IsNullOrWhiteSpace(released) || released.Length < 10) return false;
            if (!DateOnly.TryParseExact(released[..10], "yyyy-MM-dd", CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var date))
            {
                return false;
            }

            return date > DateOnly.FromDateTime(utcNow.AddHours(14));
        }
    }
}
