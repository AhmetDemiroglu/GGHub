namespace GGHub.Core.Entities
{
    /// <summary>
    /// Sitenin TAMAMI icin ham davranis olayi (web). DownloadPageEvent yalnizca /download-app
    /// inis sayfasini olcuyordu; bu tablo "kullanicilar sitede ne yapiyor, nereden giriyor,
    /// ne kadar geziyor, nerede cikiyor" sorularina cevap verir.
    ///
    /// Tasarim ilkeleri DownloadPageEvent ile ayni:
    ///  - Ham IP yok (gunluk donen tuzla hash), tam User-Agent yok (kovalara ayrilir),
    ///    tam URL yok: ROTA SABLONU saklanir ("/games/[id]"), tam yol degil. Dinamik
    ///    segmentin degeri (oyun slug'i, kullanici adi) ayri ve kirpilmis olarak
    ///    <see cref="PathKey"/>'de durur; boylece "hangi oyun cok geziliyor" cevaplanir
    ///    ama arama sorgusu/token gibi seyler asla tabloya girmez.
    ///  - Kullanici kimligi ISTEMCIDEN ALINMAZ; proxy'nin ilettigi JWT'den sunucuda cozulur.
    ///  - Yonetici trafigi silinmez, <see cref="IsInternal"/> ile isaretlenir; raporlar
    ///    varsayilan olarak disarida tutar. Bot trafigi icin ayni kural (<see cref="IsBot"/>).
    /// </summary>
    public class SiteEvent
    {
        public long Id { get; set; }

        /// <summary>page_view | page_leave | action</summary>
        public string EventType { get; set; } = string.Empty;

        /// <summary>
        /// Oturum kimligi. Istemcide sessionStorage'da tutulur (sekme omru + 30 dk hareketsizlik
        /// zaman asimi); "kac sayfa gezdi, ne kadar kaldi, nereden girdi nereden cikti"
        /// hesaplarinin tamami bunun uzerinden yapilir. Cihazlar/gunler arasi baglanmaz.
        /// </summary>
        public Guid SessionId { get; set; }

        /// <summary>Sunucu saati. Istemci saatine guvenilmez.</summary>
        public DateTime OccurredAt { get; set; } = DateTime.UtcNow;

        /// <summary>Giris yapmis kullanici; anonim ziyaretlerde null. JWT'den cozulur.</summary>
        public int? UserId { get; set; }

        /// <summary>Admin rolundeki kullanicinin kendi gezintisi. Raporlar varsayilan olarak filtreler.</summary>
        public bool IsInternal { get; set; }

        /// <summary>Rota sablonu: "/discover", "/games/[id]", "/profiles/[username]". Locale oneki yok.</summary>
        public string Route { get; set; } = string.Empty;

        /// <summary>Dinamik segmentin degeri (slug / kullanici adi / id). Kirpilir, sablonsuz rotada null.</summary>
        public string? PathKey { get; set; }

        /// <summary>action olaylarinda: search | review_create | wishlist_add | favorite_add | list_add | post_create | login | register ...</summary>
        public string? ActionName { get; set; }

        /// <summary>tr | en-US (URL onekinden).</summary>
        public string? Locale { get; set; }

        public string? Platform { get; set; }      // ios | android | other
        public string? DeviceType { get; set; }    // mobile | tablet | desktop
        public string? Browser { get; set; }
        public bool IsBot { get; set; }

        /// <summary>Oturumun GIRIS kanali. Her olaya yazilir (ucuz), raporlar oturumun ilk olayini kullanir.</summary>
        public string? UtmSource { get; set; }
        public string? UtmMedium { get; set; }
        public string? UtmCampaign { get; set; }
        public string? ClickIdSource { get; set; }
        /// <summary>Yalnizca dis host; kendi alan adimizdan gelen gecisler kanal sayilmaz.</summary>
        public string? ReferrerHost { get; set; }

        public string? CountryCode { get; set; }
        public string? Language { get; set; }

        /// <summary>Gunluk donen tuzla hash (bkz. DownloadPageEvent.VisitorHash). Anonim tekil ziyaretci sayimi icin.</summary>
        public string? VisitorHash { get; set; }

        /// <summary>
        /// Tarayicinin localStorage'inda duran rastgele kimlik (kisisel veri tasimaz). Gunler ve
        /// sekmeler arasi gercek tekil ziyaretci sayimi ve "bu cihaz yoneticinin" ayiklamasi bununla
        /// yapilir. 1 Eki 2026 oncesi olaylarda bos; onlarda VisitorHash'e dusulur.
        /// </summary>
        public Guid? VisitorId { get; set; }

        /// <summary>page_leave: sayfada kalinan sure (ms).</summary>
        public int? DwellMs { get; set; }

        /// <summary>page_leave: ulasilan en derin kaydirma yuzdesi (0-100). "Okudu mu, bakip cikti mi" sinyali.</summary>
        public int? ScrollDepth { get; set; }
    }
}
