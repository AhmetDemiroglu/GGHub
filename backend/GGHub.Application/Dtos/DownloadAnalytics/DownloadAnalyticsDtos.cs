namespace GGHub.Application.Dtos.DownloadAnalytics
{
    /// <summary>
    /// Next.js ingest proxy'sinden gelen ham olay. İstemciden gelen HİÇBİR alana
    /// güvenilmez: tipler whitelist'e, metinler maxlength'e, sayılar aralığa
    /// sunucuda zorlanır (bkz. DownloadAnalyticsService.CollectAsync).
    /// </summary>
    public class DownloadEventForCreationDto
    {
        public string? EventType { get; set; }
        public string? VisitId { get; set; }
        public string? Platform { get; set; }
        public string? UtmSource { get; set; }
        public string? UtmMedium { get; set; }
        public string? UtmCampaign { get; set; }
        public string? UtmContent { get; set; }
        public string? UtmTerm { get; set; }
        public string? ClickIdSource { get; set; }
        public string? ReferrerHost { get; set; }
        public string? Language { get; set; }
        public string? Target { get; set; }
        public int? DwellMs { get; set; }
        public int? SecondsLeft { get; set; }
    }

    /// <summary>Proxy'nin ilettiği, istemcinin uyduramayacağı sunucu tarafı bağlam.</summary>
    public class DownloadEventContext
    {
        public string? UserAgent { get; set; }
        public string? CountryCode { get; set; }
        public string? VisitorHash { get; set; }
    }

    public class DownloadAnalyticsFilterParams
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
        public string? UtmSource { get; set; }
        public string? UtmCampaign { get; set; }
        public string? Platform { get; set; }
        public string? CountryCode { get; set; }
        /// <summary>Varsayılan false: crawler trafiği raporları şişirmesin.</summary>
        public bool IncludeBots { get; set; }
    }

    public class DownloadAnalyticsSummaryDto
    {
        public int PageViews { get; set; }
        public int UniqueVisits { get; set; }
        /// <summary>Yaklaşık: mobil operatör NAT'ı yüzünden farklı kişiler aynı hash'e düşebilir.</summary>
        public int UniqueVisitors { get; set; }
        public int AutoRedirects { get; set; }
        public int StoreClicks { get; set; }
        public int AppStoreTotal { get; set; }
        public int GooglePlayTotal { get; set; }
        public int WebClicks { get; set; }
        public int Cancels { get; set; }
        /// <summary>Mağazaya ulaşan ziyaret / toplam ziyaret, yüzde.</summary>
        public double StoreReachRate { get; set; }
        public int BotHits { get; set; }
    }

    public class DownloadAnalyticsTimePointDto
    {
        public DateTime Date { get; set; }
        public int PageViews { get; set; }
        public int UniqueVisits { get; set; }
        public int StoreReach { get; set; }
    }

    public class DownloadAnalyticsBreakdownDto
    {
        public string Key { get; set; } = string.Empty;
        public int PageViews { get; set; }
        public int UniqueVisits { get; set; }
        public int StoreReach { get; set; }
        public double ConversionRate { get; set; }
    }

    public class DownloadAnalyticsFunnelDto
    {
        public int Visits { get; set; }
        public int AutoRedirectEligible { get; set; }
        public int ReachedStore { get; set; }
        public int Cancelled { get; set; }
        public int ManualStoreClick { get; set; }
        public int WebVersion { get; set; }
        public int NoAction { get; set; }
    }

    public class DownloadPageEventDto
    {
        public long Id { get; set; }
        public string EventType { get; set; } = string.Empty;
        public Guid VisitId { get; set; }
        public DateTime OccurredAt { get; set; }
        public string? Channel { get; set; }
        public string? Platform { get; set; }
        public string? DeviceType { get; set; }
        public string? Browser { get; set; }
        public string? CountryCode { get; set; }
        public string? UtmSource { get; set; }
        public string? UtmCampaign { get; set; }
        public string? ReferrerHost { get; set; }
        public string? Target { get; set; }
        public bool IsBot { get; set; }
    }
}
