using GGHub.Application.DTOs.Common;
using GGHub.Application.Dtos.SiteAnalytics;

namespace GGHub.Application.Interfaces
{
    /// <summary>
    /// Sitenin tamami icin davranis ve trafik analitigi (web). Google Analytics ve Clarity'den
    /// bagimsiz, kendi verimiz: "kim nereden geldi, ne kadar gezdi, nerede ne yapti, nereden
    /// cikti" sorularini kullanici kimligiyle (kayitli ise) birlestirerek cevaplar.
    /// </summary>
    public interface ISiteAnalyticsService
    {
        /// <summary>Olay yazar; gecersiz olayi sessizce yok sayar (olcum hatasi akisi bozmaz).</summary>
        Task CollectAsync(SiteEventForCreationDto dto, SiteEventContext context);

        Task<SiteAnalyticsSummaryDto> GetSummaryAsync(SiteAnalyticsFilterParams filter);
        Task<List<SiteTimePointDto>> GetTimeSeriesAsync(SiteAnalyticsFilterParams filter);

        /// <summary>Haftanin gunu x saat yogunluk haritasi. tzOffsetMinutes: yoneticinin tarayici saat dilimi.</summary>
        Task<List<SiteHeatmapCellDto>> GetHeatmapAsync(SiteAnalyticsFilterParams filter, int tzOffsetMinutes);

        Task<List<SiteSectionStatDto>> GetSectionsAsync(SiteAnalyticsFilterParams filter);
        Task<List<SiteRouteStatDto>> GetRoutesAsync(SiteAnalyticsFilterParams filter);
        Task<List<SiteTransitionDto>> GetTransitionsAsync(SiteAnalyticsFilterParams filter);

        /// <summary>section: games | profiles | lists | posts | reviews. En cok gezilen icerikler.</summary>
        Task<List<SiteContentStatDto>> GetTopContentAsync(string section, SiteAnalyticsFilterParams filter);

        Task<List<SiteActionStatDto>> GetActionsAsync(SiteAnalyticsFilterParams filter);
        Task<List<SiteSegmentStatDto>> GetSegmentsAsync(SiteAnalyticsFilterParams filter);
        Task<List<SiteTopUserDto>> GetTopUsersAsync(SiteAnalyticsFilterParams filter);

        Task<List<SiteEntryExitDto>> GetEntryPagesAsync(SiteAnalyticsFilterParams filter);
        Task<List<SiteEntryExitDto>> GetExitPagesAsync(SiteAnalyticsFilterParams filter);

        /// <summary>dimension: channel | country | device | browser | platform | language | locale | referrer</summary>
        Task<List<SiteBreakdownDto>> GetBreakdownAsync(string dimension, SiteAnalyticsFilterParams filter);

        Task<PaginatedResult<SiteSessionDto>> GetSessionsAsync(SiteAnalyticsFilterParams filter);
        Task<List<SiteSessionStepDto>> GetSessionStepsAsync(Guid sessionId);

        Task<int> PurgeOlderThanAsync(DateTime cutoffUtc, int batchSize, CancellationToken cancellationToken);
    }
}
