namespace GGHub.Core.Entities
{
    /// <summary>
    /// Bir kullaniciya bir YIL icinde gonderilen dogum gunu kutlamasinin damgasi.
    ///
    /// NEDEN ayri tablo, User uzerinde tek bir "LastBirthdayGreetingYear" kolonu degil:
    /// (1) Mail gece yarisi, bildirim sabah gidiyor; tek bir int "mail atildi ama bildirim
    ///     bekliyor" durumunu ifade edemez, kanal basina damga sart.
    /// (2) Bir kanal patlarsa yalnizca o kanal ayni gun icinde tekrar denenmeli; yil bayragi
    ///     ya hepsini kilitler ya da zaten basarili olan kanali tekrar gonderir.
    /// (3) Railway rolling deploy'da eski ve yeni container bir sure BIRLIKTE kosar.
    ///     (UserId, GreetingYear) uzerindeki unique index gercek bir atomik kilit verir;
    ///     kolon guncellemesi elle yazilmis kosullu UPDATE olmadan bunu vermez.
    /// </summary>
    public class BirthdayGreeting
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public User User { get; set; } = null!;

        /// <summary>Kutlamanin ait oldugu yil (Istanbul yerel takvimi). Benzersizlik anahtari.</summary>
        public int GreetingYear { get; set; }

        /// <summary>
        /// O yil kutlamanin denk geldigi YEREL tarih. 29 Subat dogumlular artik OLMAYAN
        /// yillarda 28 Subat'ta kutlanir; kutlama sayfasi da AYNI tarihi gosterir
        /// (bkz. BirthdayCalendar.OccurrenceInYear).
        /// </summary>
        public DateOnly CelebratedOn { get; set; }

        /// <summary>Mail gonderildiginde damgalanir. Null ise o gun tekrar denenir.</summary>
        public DateTime? EmailSentAt { get; set; }

        /// <summary>Uygulama ici bildirim + push gonderildiginde damgalanir.</summary>
        public DateTime? NotificationSentAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
