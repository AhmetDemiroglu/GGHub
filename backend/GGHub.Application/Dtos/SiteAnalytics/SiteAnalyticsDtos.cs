namespace GGHub.Application.Dtos.SiteAnalytics
{
    /// <summary>Next.js proxy'sinden gelen ham olay. Hicbir alana guvenilmez; sunucuda dogrulanir/kirpilir.</summary>
    public class SiteEventForCreationDto
    {
        public string? EventType { get; set; }
        public string? SessionId { get; set; }
        public string? Route { get; set; }
        public string? PathKey { get; set; }
        public string? ActionName { get; set; }
        public string? Locale { get; set; }
        public string? UtmSource { get; set; }
        public string? UtmMedium { get; set; }
        public string? UtmCampaign { get; set; }
        public string? ClickIdSource { get; set; }
        public string? ReferrerHost { get; set; }
        public string? Language { get; set; }
        public int? DwellMs { get; set; }
        public int? ScrollDepth { get; set; }
        public string? VisitorId { get; set; }
        /// <summary>navigator.webdriver: tarayici otomasyonla (Puppeteer, Playwright, Selenium) suruluyor.</summary>
        public bool? Automation { get; set; }
    }

    /// <summary>Proxy + JWT'den turetilen, istemcinin uyduramayacagi sunucu tarafi baglam.</summary>
    public class SiteEventContext
    {
        public string? UserAgent { get; set; }
        public string? CountryCode { get; set; }
        public string? VisitorHash { get; set; }
        public int? UserId { get; set; }
        public bool IsAdmin { get; set; }
    }

    public class SiteAnalyticsFilterParams
    {
        private const int MaxPageSize = 100;
        private int _pageSize = 25;

        public int Page { get; set; } = 1;
        public int PageSize
        {
            get => _pageSize;
            set => _pageSize = value > MaxPageSize ? MaxPageSize : (value < 1 ? 1 : value);
        }

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        /// <summary>all | anonymous | registered</summary>
        public string? Segment { get; set; }
        public string? DeviceType { get; set; }
        public string? Platform { get; set; }
        public string? CountryCode { get; set; }
        /// <summary>Bolum filtresi (discover, games, profiles...). Rota tablosunu daraltir.</summary>
        public string? Section { get; set; }

        /// <summary>Varsayilan false: crawler trafigi raporlari sisirmesin.</summary>
        public bool IncludeBots { get; set; }
        /// <summary>Varsayilan false: yoneticinin kendi gezintisi "kullanici davranisi" degildir.</summary>
        public bool IncludeInternal { get; set; }
    }

    public class SiteAnalyticsSummaryDto
    {
        public int PageViews { get; set; }
        public int Sessions { get; set; }
        /// <summary>Gunluk donen hash uzerinden; yaklasik.</summary>
        public int UniqueVisitors { get; set; }
        public int RegisteredSessions { get; set; }
        public int AnonymousSessions { get; set; }
        /// <summary>Donemde en az bir olay uretmis FARKLI kayitli kullanici.</summary>
        public int RegisteredUsers { get; set; }
        public double AvgSessionSeconds { get; set; }
        public double AvgPagesPerSession { get; set; }
        public double AvgScrollDepth { get; set; }
        /// <summary>Tek sayfa goruntuleyip cikan oturum orani, yuzde.</summary>
        public double BounceRate { get; set; }
        public int Actions { get; set; }
        /// <summary>En az bir etkilesim (arama, inceleme, istek listesi...) yapan oturum orani, yuzde.</summary>
        public double ActionRate { get; set; }
        public int Countries { get; set; }
        /// <summary>Son 5 dakikada olay ureten oturum.</summary>
        public int ActiveNow { get; set; }
        public int BotHits { get; set; }
        public int InternalHits { get; set; }
    }

    public class SiteTimePointDto
    {
        public DateTime Date { get; set; }
        public int PageViews { get; set; }
        public int Sessions { get; set; }
        public int UniqueVisitors { get; set; }
        public int RegisteredSessions { get; set; }
        public int Actions { get; set; }
    }

    /// <summary>Haftanin gunu x saat isi haritasi hucresi. Weekday: 0 = Pazartesi ... 6 = Pazar.</summary>
    public class SiteHeatmapCellDto
    {
        public int Weekday { get; set; }
        public int Hour { get; set; }
        public int PageViews { get; set; }
        public int Sessions { get; set; }
    }

    public class SiteSectionStatDto
    {
        public string Section { get; set; } = string.Empty;
        public int PageViews { get; set; }
        public int Sessions { get; set; }
        public int RegisteredUsers { get; set; }
        public double AvgDwellSeconds { get; set; }
        public double AvgScrollDepth { get; set; }
        /// <summary>Bu bolumde biten oturum / bu boluma ugrayan oturum, yuzde.</summary>
        public double ExitRate { get; set; }
        /// <summary>Toplam goruntulemedeki payi, yuzde.</summary>
        public double Share { get; set; }
        public int Actions { get; set; }
    }

    public class SiteRouteStatDto
    {
        public string Route { get; set; } = string.Empty;
        public string Section { get; set; } = string.Empty;
        public int PageViews { get; set; }
        public int Sessions { get; set; }
        public int RegisteredUsers { get; set; }
        public double AvgDwellSeconds { get; set; }
        public double AvgScrollDepth { get; set; }
        public int Entries { get; set; }
        public int Exits { get; set; }
        public int Actions { get; set; }
    }

    public class SiteTransitionDto
    {
        public string From { get; set; } = string.Empty;
        public string To { get; set; } = string.Empty;
        public int Count { get; set; }
        /// <summary>From rotasindan yapilan tum gecisler icindeki pay, yuzde.</summary>
        public double Share { get; set; }
    }

    public class SiteContentStatDto
    {
        public string Section { get; set; } = string.Empty;
        public string Key { get; set; } = string.Empty;
        public int PageViews { get; set; }
        public int Sessions { get; set; }
        public int RegisteredUsers { get; set; }
        public double AvgDwellSeconds { get; set; }
    }

    public class SiteActionStatDto
    {
        public string Action { get; set; } = string.Empty;
        public int Count { get; set; }
        public int Sessions { get; set; }
        public int RegisteredUsers { get; set; }
        public int AnonymousCount { get; set; }
    }

    public class SiteSegmentStatDto
    {
        /// <summary>anonymous | registered</summary>
        public string Segment { get; set; } = string.Empty;
        public int Sessions { get; set; }
        public int PageViews { get; set; }
        public double AvgPagesPerSession { get; set; }
        public double AvgSessionSeconds { get; set; }
        public double AvgScrollDepth { get; set; }
        public int Actions { get; set; }
        public double ActionRate { get; set; }
        public double BounceRate { get; set; }
    }

    public class SiteTopUserDto
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? ProfileImageUrl { get; set; }
        public int Sessions { get; set; }
        public int PageViews { get; set; }
        public int Actions { get; set; }
        public double TotalMinutes { get; set; }
        public DateTime LastSeenAt { get; set; }
        public string? TopSection { get; set; }
    }

    public class SiteEntryExitDto
    {
        public string Route { get; set; } = string.Empty;
        public int Sessions { get; set; }
        /// <summary>Girisler icin: bu sayfadan girip tek sayfayla cikan oturum orani.</summary>
        public double BounceRate { get; set; }
        public double Share { get; set; }
    }

    public class SiteBreakdownDto
    {
        public string Key { get; set; } = string.Empty;
        public int Sessions { get; set; }
        public int PageViews { get; set; }
        public int UniqueVisitors { get; set; }
        public double AvgSessionSeconds { get; set; }
        public double BounceRate { get; set; }
        /// <summary>Giris yapmis oturumlarin payi, yuzde.</summary>
        public double RegisteredShare { get; set; }
    }

    public class SiteSessionDto
    {
        public Guid SessionId { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime LastSeenAt { get; set; }
        public int DurationSeconds { get; set; }
        public int PageViews { get; set; }
        public int Actions { get; set; }
        public int? UserId { get; set; }
        public string? Username { get; set; }
        public string? ProfileImageUrl { get; set; }
        public string? Channel { get; set; }
        public string? CountryCode { get; set; }
        public string? DeviceType { get; set; }
        public string? Browser { get; set; }
        public string? Platform { get; set; }
        public string? EntryRoute { get; set; }
        public string? ExitRoute { get; set; }
        public double? AvgScrollDepth { get; set; }
        public bool IsBot { get; set; }
        public bool IsInternal { get; set; }
    }

    /// <summary>Tek bir oturumun sayfa sayfa yolculugu (canli oturum tablosundan acilir).</summary>
    public class SiteSessionStepDto
    {
        public DateTime OccurredAt { get; set; }
        public string EventType { get; set; } = string.Empty;
        public string Route { get; set; } = string.Empty;
        public string? PathKey { get; set; }
        public string? ActionName { get; set; }
        public int? DwellMs { get; set; }
        public int? ScrollDepth { get; set; }
    }
}
