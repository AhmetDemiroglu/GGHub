export type SiteSegment = "all" | "anonymous" | "registered";

export interface SiteAnalyticsFilter {
    startDate?: string;
    endDate?: string;
    segment?: SiteSegment;
    deviceType?: string;
    platform?: string;
    countryCode?: string;
    section?: string;
    includeBots?: boolean;
    includeInternal?: boolean;
    page?: number;
    pageSize?: number;
}

export interface SiteAnalyticsSummary {
    pageViews: number;
    sessions: number;
    uniqueVisitors: number;
    registeredSessions: number;
    anonymousSessions: number;
    registeredUsers: number;
    avgSessionSeconds: number;
    avgPagesPerSession: number;
    avgScrollDepth: number;
    bounceRate: number;
    actions: number;
    actionRate: number;
    countries: number;
    activeNow: number;
    botHits: number;
    internalHits: number;
}

export interface SiteTimePoint {
    date: string;
    pageViews: number;
    sessions: number;
    uniqueVisitors: number;
    registeredSessions: number;
    actions: number;
}

export interface SiteHeatmapCell {
    weekday: number;
    hour: number;
    pageViews: number;
    sessions: number;
}

export interface SiteSectionStat {
    section: string;
    pageViews: number;
    sessions: number;
    registeredUsers: number;
    avgDwellSeconds: number;
    avgScrollDepth: number;
    exitRate: number;
    share: number;
    actions: number;
}

export interface SiteRouteStat {
    route: string;
    section: string;
    pageViews: number;
    sessions: number;
    registeredUsers: number;
    avgDwellSeconds: number;
    avgScrollDepth: number;
    entries: number;
    exits: number;
    actions: number;
}

export interface SiteTransition {
    from: string;
    to: string;
    count: number;
    share: number;
}

export interface SiteContentStat {
    section: string;
    key: string;
    pageViews: number;
    sessions: number;
    registeredUsers: number;
    avgDwellSeconds: number;
}

export interface SiteActionStat {
    action: string;
    count: number;
    sessions: number;
    registeredUsers: number;
    anonymousCount: number;
}

export interface SiteSegmentStat {
    segment: "anonymous" | "registered";
    sessions: number;
    pageViews: number;
    avgPagesPerSession: number;
    avgSessionSeconds: number;
    avgScrollDepth: number;
    actions: number;
    actionRate: number;
    bounceRate: number;
}

export interface SiteTopUser {
    userId: number;
    username: string;
    profileImageUrl: string | null;
    sessions: number;
    pageViews: number;
    actions: number;
    totalMinutes: number;
    lastSeenAt: string;
    topSection: string | null;
}

export interface SiteEntryExit {
    route: string;
    sessions: number;
    bounceRate: number;
    share: number;
}

export interface SiteBreakdown {
    key: string;
    sessions: number;
    pageViews: number;
    uniqueVisitors: number;
    avgSessionSeconds: number;
    bounceRate: number;
    registeredShare: number;
}

export interface SiteSession {
    sessionId: string;
    startedAt: string;
    lastSeenAt: string;
    durationSeconds: number;
    pageViews: number;
    actions: number;
    userId: number | null;
    username: string | null;
    profileImageUrl: string | null;
    channel: string | null;
    countryCode: string | null;
    deviceType: string | null;
    browser: string | null;
    platform: string | null;
    entryRoute: string | null;
    exitRoute: string | null;
    avgScrollDepth: number | null;
    isBot: boolean;
    isInternal: boolean;
}

export interface SiteSessionStep {
    occurredAt: string;
    eventType: string;
    route: string;
    pathKey: string | null;
    actionName: string | null;
    dwellMs: number | null;
    scrollDepth: number | null;
}

export type SiteBreakdownDimension = "channel" | "country" | "device" | "browser" | "platform" | "language" | "locale" | "referrer";
export type SiteContentSection = "games" | "profiles" | "lists" | "posts" | "reviews";
