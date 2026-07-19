using GGHub.Application.DTOs.Common;
using GGHub.Application.Dtos.DownloadAnalytics;

namespace GGHub.Application.Interfaces
{
    /// <summary>
    /// /download-app iniş sayfasının kendi telemetrisi. Google Analytics'ten
    /// bağımsızdır; amaç reklam kampanyalarının gerçekten mağazaya trafik
    /// getirip getirmediğini kendi verimizle görebilmek.
    /// </summary>
    public interface IDownloadAnalyticsService
    {
        /// <summary>
        /// Anonim olay yazar. Geçersiz olayı ATMAZ, sessizce yok sayar: beacon
        /// yanıtı okumaz ve bir ölçüm hatası kullanıcı akışını asla bozmamalı.
        /// </summary>
        Task CollectAsync(DownloadEventForCreationDto dto, DownloadEventContext context);

        Task<DownloadAnalyticsSummaryDto> GetSummaryAsync(DownloadAnalyticsFilterParams filter);
        Task<List<DownloadAnalyticsTimePointDto>> GetTimeSeriesAsync(DownloadAnalyticsFilterParams filter);

        /// <summary>
        /// dimension: channel | utmSource | utmMedium | utmCampaign | utmContent
        /// | platform | country | browser | referrer. Değer sunucuda whitelist'ten
        /// geçer, ASLA sorguya string olarak gömülmez.
        /// </summary>
        Task<List<DownloadAnalyticsBreakdownDto>> GetBreakdownAsync(string dimension, DownloadAnalyticsFilterParams filter);

        Task<DownloadAnalyticsFunnelDto> GetFunnelAsync(DownloadAnalyticsFilterParams filter);
        Task<PaginatedResult<DownloadPageEventDto>> GetEventsAsync(DownloadAnalyticsFilterParams filter);

        /// <summary>Saklama süresini aşan satırları partiler hâlinde siler.</summary>
        Task<int> PurgeOlderThanAsync(DateTime cutoffUtc, int batchSize, CancellationToken cancellationToken);
    }
}
