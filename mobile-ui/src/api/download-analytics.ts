import { axiosInstance } from '@/src/api/client';
import type { PaginatedResponse } from '@/src/models/api';

/**
 * /download-app kampanya telemetrisinin okuma uclari (yalnizca Admin).
 * Sekiller backend DTO'lariyla ve web istemcisiyle birebir
 * (bkz. ui/src/models/download-analytics/download-analytics.model.ts).
 */
export interface DownloadAnalyticsFilter {
  startDate?: string;
  endDate?: string;
  utmSource?: string;
  utmCampaign?: string;
  platform?: string;
  countryCode?: string;
  includeBots?: boolean;
  page?: number;
  pageSize?: number;
}

export interface DownloadAnalyticsSummary {
  pageViews: number;
  uniqueVisits: number;
  /** Yaklasik: operator NAT'i yuzunden farkli kisiler ayni hash'e dusebilir. */
  uniqueVisitors: number;
  autoRedirects: number;
  storeClicks: number;
  appStoreTotal: number;
  googlePlayTotal: number;
  webClicks: number;
  cancels: number;
  storeReachRate: number;
  botHits: number;
}

export interface DownloadAnalyticsTimePoint {
  date: string;
  pageViews: number;
  uniqueVisits: number;
  storeReach: number;
}

export interface DownloadAnalyticsBreakdown {
  key: string;
  pageViews: number;
  uniqueVisits: number;
  storeReach: number;
  conversionRate: number;
}

export interface DownloadAnalyticsFunnel {
  visits: number;
  autoRedirectEligible: number;
  reachedStore: number;
  cancelled: number;
  manualStoreClick: number;
  webVersion: number;
  noAction: number;
}

export interface DownloadPageEvent {
  id: number;
  eventType: string;
  visitId: string;
  occurredAt: string;
  channel?: string | null;
  platform?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  countryCode?: string | null;
  utmSource?: string | null;
  utmCampaign?: string | null;
  referrerHost?: string | null;
  target?: string | null;
  isBot: boolean;
}

export type BreakdownDimension =
  | 'channel'
  | 'utmSource'
  | 'utmMedium'
  | 'utmCampaign'
  | 'utmContent'
  | 'platform'
  | 'country'
  | 'browser'
  | 'referrer';

/** undefined/bos alanlari atarak sorgu dizesi kurar. */
const toParams = (filter: DownloadAnalyticsFilter): Record<string, string> => {
  const params: Record<string, string> = {};
  Object.entries(filter).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params[key] = String(value);
  });
  return params;
};

export const downloadAnalyticsApi = {
  getSummary: (filter: DownloadAnalyticsFilter) =>
    axiosInstance
      .get<DownloadAnalyticsSummary>('/download-analytics/summary', { params: toParams(filter) })
      .then((res) => res.data),

  getTimeSeries: (filter: DownloadAnalyticsFilter) =>
    axiosInstance
      .get<DownloadAnalyticsTimePoint[]>('/download-analytics/timeseries', { params: toParams(filter) })
      .then((res) => res.data),

  getBreakdown: (dimension: BreakdownDimension, filter: DownloadAnalyticsFilter) =>
    axiosInstance
      .get<DownloadAnalyticsBreakdown[]>('/download-analytics/breakdown', {
        params: { ...toParams(filter), dimension },
      })
      .then((res) => res.data),

  getFunnel: (filter: DownloadAnalyticsFilter) =>
    axiosInstance
      .get<DownloadAnalyticsFunnel>('/download-analytics/funnel', { params: toParams(filter) })
      .then((res) => res.data),

  getEvents: (filter: DownloadAnalyticsFilter) =>
    axiosInstance
      .get<PaginatedResponse<DownloadPageEvent>>('/download-analytics/events', { params: toParams(filter) })
      .then((res) => res.data),
};
