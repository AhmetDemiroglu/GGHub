namespace GGHub.Core.Utilities
{
    /// <summary>
    /// Dogum gunu tarih matematiginin TEK kaynagi. Hem gonderim job'i hem de kutlama
    /// endpoint'i buradan gecer.
    ///
    /// NEDEN paylasik: job "bugun senin dogum gunun" kararini Istanbul saatiyle ve 29 Subat
    /// kuraliyla veriyor. Sayfa bunu bagimsiz hesaplasaydi, kullanicinin bildirime dokundugu
    /// ANDA mail ile sayfa farkli tarih soyleyebilirdi.
    /// </summary>
    public static class BirthdayCalendar
    {
        /// <summary>
        /// Turkiye Eylul 2016'dan beri KALICI UTC+03, yaz saati uygulamasi YOK.
        /// Container imajinda tzdata bulunmazsa sabit offset matematiksel olarak AYNI
        /// sonucu verir; bu bir tahmin degil, mevzuatin sonucu.
        /// </summary>
        public static TimeZoneInfo Istanbul { get; } = ResolveIstanbul();

        private static TimeZoneInfo ResolveIstanbul()
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul");
            }
            catch (TimeZoneNotFoundException) { }
            catch (InvalidTimeZoneException) { }

            return TimeZoneInfo.CreateCustomTimeZone(
                "GGHub-Istanbul", TimeSpan.FromHours(3), "Istanbul (+03)", "Istanbul (+03)");
        }

        /// <summary>Istanbul yerel takviminde bugun.</summary>
        public static DateOnly TodayInIstanbul()
            => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, Istanbul).Date);

        /// <summary>
        /// Dogum tarihinin ay/gun bileseni. Kolon timestamptz oldugu icin okuma DAIMA
        /// UTC'den yapilir: web profil formu tarihi offset duzeltmesiyle tam 00:00 UTC'ye
        /// oturtarak gonderiyor (profile-edit-form onSubmit).
        /// </summary>
        public static (int Month, int Day) MonthDay(DateTime dateOfBirth)
        {
            var utc = dateOfBirth.Kind == DateTimeKind.Utc
                ? dateOfBirth
                : dateOfBirth.ToUniversalTime();
            return (utc.Month, utc.Day);
        }

        /// <summary>
        /// Verilen yildaki kutlama tarihi. 29 Subat dogumlular artik OLMAYAN yillarda
        /// 28 Subat'ta kutlanir; 1 Mart bilerek secilmedi, o baskasinin gercek dogum gunu
        /// ve CelebratedOn denetimini belirsizlestirirdi.
        /// </summary>
        public static DateOnly OccurrenceInYear(DateTime dateOfBirth, int year)
        {
            var (month, day) = MonthDay(dateOfBirth);
            if (month == 2 && day == 29 && !DateTime.IsLeapYear(year)) day = 28;
            return new DateOnly(year, month, day);
        }

        /// <summary>
        /// Bugune gore EN SON gerceklesmis dogum gunu. Bugun dogum gunuyse bugunu doner.
        /// Kutlama sayfasi bunu gosterir: 18 Temmuz dogumlu biri 18 Tem 2026'dan
        /// 17 Tem 2027'ye kadar "18 Temmuz 2026", 18 Tem 2027'de "18 Temmuz 2027" gorur.
        /// </summary>
        public static DateOnly MostRecentOccurrence(DateTime dateOfBirth, DateOnly today)
        {
            var thisYear = OccurrenceInYear(dateOfBirth, today.Year);
            return thisYear <= today ? thisYear : OccurrenceInYear(dateOfBirth, today.Year - 1);
        }

        /// <summary>
        /// Bugun 29 Subat dogumlulari icin yedek kutlama gunu mu (28 Subat, artik OLMAYAN yil).
        /// Artik yilda FALSE olmali: aksi halde 29 Subat dogumlular 28'inde kutlanir ve
        /// gercek gunlerinde bir daha kutlanirdi.
        /// </summary>
        public static bool IsLeapDayFallback(DateOnly today)
            => today.Month == 2 && today.Day == 28 && !DateTime.IsLeapYear(today.Year);
    }
}
