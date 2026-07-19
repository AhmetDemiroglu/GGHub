namespace GGHub.Core.Entities
{
    /// <summary>
    /// /download-app iniş sayfasında olan biteni ölçen tek ham olay tablosu.
    /// Amaç reklam kampanyalarının performansını görmek: hangi kanaldan gelen
    /// ziyaretçi mağazaya ulaşıyor, hangisi sayfada kalıyor.
    ///
    /// Kişisel veri BİLEREK tutulmaz: ham IP yok (yalnızca günlük dönen tuzla
    /// hash'lenmiş <see cref="VisitorHash"/>), tam User-Agent yok (kovalara
    /// ayrıştırılıp atılır), tam referrer yok (yalnızca host), şehir yok.
    /// Click id'lerin DEĞERİ değil, yalnızca hangi ağdan geldiği saklanır.
    /// </summary>
    public class DownloadPageEvent
    {
        /// <summary>
        /// Telemetri tablosunda int bir tavandır; long seçildi.
        /// </summary>
        public long Id { get; set; }

        /// <summary>page_view | auto_redirect | redirect_cancel | store_click | web_click</summary>
        public string EventType { get; set; } = string.Empty;

        /// <summary>
        /// Aynı ziyaretin olaylarını birbirine bağlar (huni hesabı bunun üzerinden).
        /// Sayfa yüklemesi başına üretilir, cihazda SAKLANMAZ; bu yüzden çerez/rıza
        /// gerektirmez.
        /// </summary>
        public Guid VisitId { get; set; }

        /// <summary>Sunucu saati. İstemci saatine asla güvenilmez.</summary>
        public DateTime OccurredAt { get; set; } = DateTime.UtcNow;

        public string? Platform { get; set; }      // ios | android | other
        public string? DeviceType { get; set; }    // mobile | tablet | desktop
        public string? Browser { get; set; }       // instagram | facebook | safari | chrome | ...

        public string? UtmSource { get; set; }
        public string? UtmMedium { get; set; }
        public string? UtmCampaign { get; set; }
        public string? UtmContent { get; set; }
        public string? UtmTerm { get; set; }

        /// <summary>
        /// fb | google | tiktok | instagram. Meta reklamları utm_* değil fbclid
        /// gönderdiği için bu olmadan tüm Instagram trafiği "direct" görünürdü.
        /// Click id'nin KENDİSİ saklanmaz, yalnızca hangi ağ olduğu.
        /// </summary>
        public string? ClickIdSource { get; set; }

        /// <summary>Yalnızca host. Tam URL arama sorgusu ya da token taşıyabilir.</summary>
        public string? ReferrerHost { get; set; }

        public string? CountryCode { get; set; }   // ISO-3166 alpha-2
        public string? Language { get; set; }

        /// <summary>app_store | google_play | web</summary>
        public string? Target { get; set; }

        /// <summary>page_view'dan bu olaya kadar geçen süre (ms).</summary>
        public int? DwellMs { get; set; }

        /// <summary>Geri sayımdan kalan saniye (iptal ve manuel tıklama için).</summary>
        public int? SecondsLeft { get; set; }

        /// <summary>
        /// SHA-256(gizli anahtar + gün + ip + ua) ilk 16 byte'ı, hex. Tuzun GÜNLÜK
        /// dönmesi kilit gizlilik özelliği: aynı kişi ertesi gün farklı hash üretir,
        /// dolayısıyla bu alan üzerinden boylamsal profil çıkarılamaz.
        /// </summary>
        public string? VisitorHash { get; set; }

        /// <summary>
        /// Crawler ise satır SİLİNMEZ, işaretlenir. Raporlar varsayılan olarak
        /// filtreler; böylece filtrenin gerçek trafiği yiyip yemediği denetlenebilir.
        /// </summary>
        public bool IsBot { get; set; }
    }
}
