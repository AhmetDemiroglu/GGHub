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
    /** Yaklaşık: operatör NAT'ı yüzünden farklı kişiler aynı hash'e düşebilir. */
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
    | "channel"
    | "utmSource"
    | "utmMedium"
    | "utmCampaign"
    | "utmContent"
    | "platform"
    | "country"
    | "browser"
    | "referrer";
