namespace GGHub.Infrastructure.Logging
{
    /// <summary>
    /// "ErrorLog" ayar bolumu. Enabled ayarda yazili degilse Program.cs onu ortama gore doldurur:
    /// yalnizca Production'da acik. Localdeki backend canli DB'ye bagli; gelistirme sirasindaki
    /// hatalar canli hata tablosunu kirletmesin ve adminlere bildirim gitmesin.
    /// (appsettings.Production.json git'te yok, Railway'e gitmez; o yuzden varsayilan kodda.)
    /// </summary>
    public class ErrorLogOptions
    {
        public bool? Enabled { get; set; }

        /// <summary>Tekil olaylar (ErrorEvents) kac gun saklanir. Gruplar silinmez.</summary>
        public int RetentionDays { get; set; } = 30;

        /// <summary>Yazilmayi bekleyen olay kuyrugu. Dolunca YENI olay dusurulur, istek bekletilmez.</summary>
        public int QueueCapacity { get; set; } = 500;

        /// <summary>Bir grubun saatte en fazla kac olayinin ayrintisi saklanir (sayac her zaman artar).</summary>
        public int MaxEventsPerGroupPerHour { get; set; } = 30;

        /// <summary>Ayni grup icin iki bildirim arasindaki en kisa sure.</summary>
        public int NotifyCooldownHours { get; set; } = 6;

        /// <summary>Tum gruplar toplami, saatte en fazla kac bildirim.</summary>
        public int MaxNotificationsPerHour { get; set; } = 10;
    }
}
