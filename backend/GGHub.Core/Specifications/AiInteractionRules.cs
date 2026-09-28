namespace GGHub.Core.Specifications
{
    /// <summary>
    /// Bir kullanicinin AI botlariyla etkilesime girip giremeyecegi.
    ///
    /// Neden 18: Gemini API sartlari (Gemma dahil) 18 yas altinin erisebilecegi hizmetlerde
    /// kullanimi yasakliyor. Uygulama 18+ DEGIL (Ahmet karari, 28 Eyl 2026); onun yerine botlar
    /// yalnizca dogum tarihini girmis ve 18 yasini doldurmus kullanicilarla etkilesir. Dogum
    /// tarihi girmeyen kullanici icin etkilesim anahtari pasif gorunur.
    ///
    /// EF sorgusu icinde kullanilamaz (DateOnly hesabi); sorgu tarafinda
    /// <see cref="AdultBirthCutoffUtc"/> ile esdeger filtre kurulur.
    /// </summary>
    public static class AiInteractionRules
    {
        public const int MinimumAge = 18;

        public static DateOnly BirthDate(DateTime dateOfBirth)
        {
            // Kolon timestamptz; web formu tarihi 00:00 UTC'ye oturtuyor (bkz. BirthdayCalendar.MonthDay).
            var utc = dateOfBirth.Kind == DateTimeKind.Utc ? dateOfBirth : dateOfBirth.ToUniversalTime();
            return DateOnly.FromDateTime(utc);
        }

        public static bool IsAdult(DateTime? dateOfBirth, DateOnly today)
            => dateOfBirth.HasValue && BirthDate(dateOfBirth.Value).AddYears(MinimumAge) <= today;

        /// <summary>
        /// Sorgu filtresi icin: DateOfBirth bu andan KUCUK ya da ESIT olan kullanici bugun itibariyla
        /// 18 yasini doldurmustur. (Bugunden 18 yil onceki gunun sonu, UTC.)
        /// </summary>
        public static DateTime AdultBirthCutoffUtc(DateOnly today)
            => DateTime.SpecifyKind(today.AddYears(-MinimumAge).ToDateTime(new TimeOnly(23, 59, 59)), DateTimeKind.Utc);

        /// <summary>Etkilesim engelinin sebebi; null ise etkilesim serbest.</summary>
        public static string? BlockReason(bool allowAiInteraction, DateTime? dateOfBirth, DateOnly today)
        {
            if (!dateOfBirth.HasValue) return AiInteractionBlockReasons.NeedsBirthDate;
            if (!IsAdult(dateOfBirth, today)) return AiInteractionBlockReasons.Underage;
            if (!allowAiInteraction) return AiInteractionBlockReasons.OptedOut;
            return null;
        }

        public static bool IsEligible(
            bool isAiAgent, bool isDeleted, bool isBanned, bool allowAiInteraction, DateTime? dateOfBirth, DateOnly today)
            => !isAiAgent && !isDeleted && !isBanned && BlockReason(allowAiInteraction, dateOfBirth, today) is null;
    }

    public static class AiInteractionBlockReasons
    {
        public const string NeedsBirthDate = "needsBirthDate";
        public const string Underage = "underage";
        public const string OptedOut = "optedOut";
    }
}
