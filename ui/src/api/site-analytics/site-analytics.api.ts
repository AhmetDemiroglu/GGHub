import { axiosInstance } from "@core/lib/axios";
import type { PaginatedResponse } from "@/models/system/api.model";
import type {
    SiteActionStat,
    SiteAnalyticsFilter,
    SiteAnalyticsSummary,
    SiteBreakdown,
    SiteBreakdownDimension,
    SiteContentSection,
    SiteContentStat,
    SiteEntryExit,
    SiteHeatmapCell,
    SiteRouteStat,
    SiteSectionStat,
    SiteSegmentStat,
    SiteSession,
    SiteSessionStep,
    SiteTimePoint,
    SiteTopUser,
    SiteTransition,
} from "@/models/site-analytics/site-analytics.model";

const toParams = (filter: SiteAnalyticsFilter, extra: Record<string, string | number | undefined> = {}): Record<string, string> => {
    const params: Record<string, string> = {};
    Object.entries({ ...filter, ...extra }).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "" || value === "all") return;
        params[key] = String(value);
    });
    return params;
};

const base = "/site-analytics";

export const siteAnalyticsApi = {
    summary: (f: SiteAnalyticsFilter) => axiosInstance.get<SiteAnalyticsSummary>(`${base}/summary`, { params: toParams(f) }),
    timeseries: (f: SiteAnalyticsFilter) => axiosInstance.get<SiteTimePoint[]>(`${base}/timeseries`, { params: toParams(f) }),
    heatmap: (f: SiteAnalyticsFilter, tzOffset: number) =>
        axiosInstance.get<SiteHeatmapCell[]>(`${base}/heatmap`, { params: toParams(f, { tzOffset }) }),
    sections: (f: SiteAnalyticsFilter) => axiosInstance.get<SiteSectionStat[]>(`${base}/sections`, { params: toParams(f) }),
    routes: (f: SiteAnalyticsFilter) => axiosInstance.get<SiteRouteStat[]>(`${base}/routes`, { params: toParams(f) }),
    transitions: (f: SiteAnalyticsFilter) => axiosInstance.get<SiteTransition[]>(`${base}/transitions`, { params: toParams(f) }),
    content: (section: SiteContentSection, f: SiteAnalyticsFilter) =>
        axiosInstance.get<SiteContentStat[]>(`${base}/content`, { params: toParams(f, { section }) }),
    actions: (f: SiteAnalyticsFilter) => axiosInstance.get<SiteActionStat[]>(`${base}/actions`, { params: toParams(f) }),
    segments: (f: SiteAnalyticsFilter) => axiosInstance.get<SiteSegmentStat[]>(`${base}/segments`, { params: toParams(f) }),
    topUsers: (f: SiteAnalyticsFilter) => axiosInstance.get<SiteTopUser[]>(`${base}/top-users`, { params: toParams(f) }),
    entries: (f: SiteAnalyticsFilter) => axiosInstance.get<SiteEntryExit[]>(`${base}/entries`, { params: toParams(f) }),
    exits: (f: SiteAnalyticsFilter) => axiosInstance.get<SiteEntryExit[]>(`${base}/exits`, { params: toParams(f) }),
    breakdown: (dimension: SiteBreakdownDimension, f: SiteAnalyticsFilter) =>
        axiosInstance.get<SiteBreakdown[]>(`${base}/breakdown`, { params: toParams(f, { dimension }) }),
    sessions: (f: SiteAnalyticsFilter) => axiosInstance.get<PaginatedResponse<SiteSession>>(`${base}/sessions`, { params: toParams(f) }),
    sessionSteps: (sessionId: string) => axiosInstance.get<SiteSessionStep[]>(`${base}/sessions/${sessionId}`),
};
