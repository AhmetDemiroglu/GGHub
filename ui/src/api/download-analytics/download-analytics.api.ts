import { axiosInstance } from "@core/lib/axios";
import type { PaginatedResponse } from "@/models/system/api.model";
import {
    BreakdownDimension,
    DownloadAnalyticsBreakdown,
    DownloadAnalyticsFilter,
    DownloadAnalyticsFunnel,
    DownloadAnalyticsSummary,
    DownloadAnalyticsTimePoint,
    DownloadPageEvent,
} from "@/models/download-analytics/download-analytics.model";

/** undefined/bos alanlari atarak query string kurar. */
const toParams = (filter: DownloadAnalyticsFilter): Record<string, string> => {
    const params: Record<string, string> = {};
    Object.entries(filter).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        params[key] = String(value);
    });
    return params;
};

export const getDownloadSummary = (filter: DownloadAnalyticsFilter) =>
    axiosInstance.get<DownloadAnalyticsSummary>("/download-analytics/summary", { params: toParams(filter) });

export const getDownloadTimeSeries = (filter: DownloadAnalyticsFilter) =>
    axiosInstance.get<DownloadAnalyticsTimePoint[]>("/download-analytics/timeseries", { params: toParams(filter) });

export const getDownloadBreakdown = (dimension: BreakdownDimension, filter: DownloadAnalyticsFilter) =>
    axiosInstance.get<DownloadAnalyticsBreakdown[]>("/download-analytics/breakdown", {
        params: { ...toParams(filter), dimension },
    });

export const getDownloadFunnel = (filter: DownloadAnalyticsFilter) =>
    axiosInstance.get<DownloadAnalyticsFunnel>("/download-analytics/funnel", { params: toParams(filter) });

export const getDownloadEvents = (filter: DownloadAnalyticsFilter) =>
    axiosInstance.get<PaginatedResponse<DownloadPageEvent>>("/download-analytics/events", { params: toParams(filter) });
