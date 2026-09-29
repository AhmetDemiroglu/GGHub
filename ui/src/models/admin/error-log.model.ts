/** Backend: GGHub.Application/Dtos/ErrorLogDtos.cs */
export type ErrorLogStatus = "open" | "resolved" | "ignored";
export type ErrorLogSource = "api" | "job" | "bot";

export interface ErrorLogQueryParams {
    page: number;
    pageSize: number;
    /** "all" durum suzgecini kaldirir; bos birakilirsa backend "open" sayar. */
    status?: ErrorLogStatus | "all";
    source?: ErrorLogSource;
    search?: string;
    from?: string;
    to?: string;
}

export interface ErrorGroup {
    id: number;
    source: ErrorLogSource;
    status: ErrorLogStatus;
    exceptionType: string;
    message: string;
    logger: string | null;
    method: string | null;
    routeTemplate: string | null;
    statusCode: number | null;
    count: number;
    firstSeenAt: string;
    lastSeenAt: string;
    resolvedAt: string | null;
    note: string | null;
}

export interface ErrorEvent {
    id: number;
    occurredAt: string;
    message: string;
    stackTrace: string | null;
    innerChain: string | null;
    method: string | null;
    path: string | null;
    queryString: string | null;
    statusCode: number | null;
    userId: number | null;
    username: string | null;
    userAgent: string | null;
    locale: string | null;
    traceId: string | null;
    environment: string | null;
}

export interface ErrorGroupDetail extends ErrorGroup {
    /** Son olaylar, yeniden eskiye. */
    events: ErrorEvent[];
}

export interface ErrorLogSummary {
    openGroups: number;
    groupsLast24h: number;
    newGroupsLast24h: number;
    lastErrorAt: string | null;
}
