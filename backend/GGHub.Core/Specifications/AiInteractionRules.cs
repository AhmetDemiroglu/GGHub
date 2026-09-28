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
            if (!allowAiInteraction) return AiInteractionBlockReasons.ConsentRequired;
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
        /// <summary>Riza metni onaylanmamis (varsayilan) ya da onay geri alinmis.</summary>
        public const string ConsentRequired = "consentRequired";
    }

    /// <summary>
    /// AI etkilesimi acik riza metninin surumu. Metin (web + mobil i18n "aiConsent" ve gizlilik
    /// politikasindaki riza bolumu) anlamca degisirse bu tarih guncellenir; eski onaylar gecerli
    /// kalir ama yeni onaylar yeni surumle kaydedilir.
    /// </summary>
    public static class AiConsentTexts
    {
        public const string CurrentVersion = "2026-09-29";

        /// <summary>
        /// Yayinlanmis metin surumleri. Istemcinin gonderdigi surum bunlardan biri degilse kayda
        /// CurrentVersion yazilir: riza gunlugune istemciden gelen rastgele bir deger girmez.
        /// Metin degisince yeni tarih BURAYA da eklenir (eski surumlu uygulamalar bir sure yasar).
        /// </summary>
        public static readonly IReadOnlySet<string> KnownVersions = new HashSet<string> { "2026-09-29" };

        public static readonly IReadOnlySet<string> Sources = new HashSet<string> { "web", "ios", "android", "unknown" };
    }
}
