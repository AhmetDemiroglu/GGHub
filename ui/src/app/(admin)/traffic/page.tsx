"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Activity, Bot, Clock, Globe, Loader2, LogIn, LogOut, TrendingDown, UserCheck, Users } from "lucide-react";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { siteAnalyticsApi } from "@/api/site-analytics/site-analytics.api";
import type { SiteBreakdownDimension } from "@/models/site-analytics/site-analytics.model";
import { StatsCard } from "@/core/components/admin/stats-card";
import { SiteAnalyticsFilters, useSiteAnalyticsFilter } from "@/core/components/admin/site-analytics-filters";
import { SiteTimeSeriesChart } from "@/core/components/admin/site-timeseries-chart";
import { SiteSessionsTable } from "@/core/components/admin/site-sessions-table";
import { MetricBarTable, fmtDuration, fmtInt, fmtPct } from "@/core/components/admin/metric-bar-table";
import { Button } from "@/core/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/core/components/ui/tabs";

const DIMENSIONS: SiteBreakdownDimension[] = ["country", "device", "browser", "platform", "language", "locale", "referrer"];
const SESSIONS_PAGE_SIZE = 25;

/**
 * Trafik ve Ziyaretler: "kim gelmis, nereden, ne kadar gezmis, nereden cikmis" (anonim dahil,
 * bot haric). Davranis sayfasi icerideki hareketi okur; bu sayfa kapidan girip cikani sayar.
 */
export default function TrafficPage() {
    const t = useI18n();
    const locale = useCurrentLocale();
    const { state, setState, filter, key } = useSiteAnalyticsFilter({ days: "7" });
    const [dimension, setDimension] = useState<SiteBreakdownDimension>("country");
    const [page, setPage] = useState(1);

    const useSiteQuery = <T,>(name: string, fn: () => Promise<{ data: T }>, extra: unknown[] = [], refetchInterval?: number) =>
        useQuery({
            queryKey: ["site-analytics", name, ...key, ...extra],
            queryFn: async () => (await fn()).data,
            placeholderData: keepPreviousData,
            refetchInterval,
        });

    // Ozet 30 sn'de bir tazelenir: "su an aktif" sayaci canli hissettirsin.
    const summary = useSiteQuery("summary", () => siteAnalyticsApi.summary(filter), [], 30_000);
    const series = useSiteQuery("timeseries", () => siteAnalyticsApi.timeseries(filter));
    const channels = useSiteQuery("breakdown", () => siteAnalyticsApi.breakdown("channel", filter), ["channel"]);
    const breakdown = useSiteQuery("breakdown", () => siteAnalyticsApi.breakdown(dimension, filter), [dimension]);
    const entries = useSiteQuery("entries", () => siteAnalyticsApi.entries(filter));
    const exits = useSiteQuery("exits", () => siteAnalyticsApi.exits(filter));
    const sessions = useSiteQuery("sessions", () => siteAnalyticsApi.sessions({ ...filter, page, pageSize: SESSIONS_PAGE_SIZE }), [page], 30_000);

    const routeLabel = (route: string) => route;
    const empty = t("admin.siteAnalytics.empty");

    if (summary.isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (summary.isError) {
        return (
            <div className="container px-6 py-6 lg:px-8 lg:py-8">
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center">
                    <p className="text-sm font-medium">{t("admin.loadErrorTitle")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t("admin.siteAnalytics.loadError")}</p>
                </div>
            </div>
        );
    }

    const s = summary.data;
    const totalSessions = sessions.data?.totalCount ?? 0;
    const pageCount = Math.max(1, Math.ceil(totalSessions / SESSIONS_PAGE_SIZE));

    const breakdownColumns = [
        { key: "sessions", label: t("admin.siteAnalytics.colSessions"), render: (r: { sessions: number }) => fmtInt(r.sessions) },
        { key: "visitors", label: t("admin.siteAnalytics.colVisitors"), render: (r: { uniqueVisitors: number }) => fmtInt(r.uniqueVisitors), muted: true },
        { key: "duration", label: t("admin.siteAnalytics.colDuration"), render: (r: { avgSessionSeconds: number }) => fmtDuration(r.avgSessionSeconds), width: "5rem" },
        { key: "bounce", label: t("admin.siteAnalytics.colBounce"), render: (r: { bounceRate: number }) => fmtPct(r.bounceRate), muted: true, width: "3.5rem" },
        { key: "registered", label: t("admin.siteAnalytics.colRegistered"), render: (r: { registeredShare: number }) => fmtPct(r.registeredShare), muted: true, width: "3.5rem" },
    ];

    return (
        <div className="container flex flex-col gap-6 px-6 py-6 lg:px-8 lg:py-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t("admin.siteAnalytics.trafficTitle")}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t("admin.siteAnalytics.trafficDescription")}</p>
            </div>

            <SiteAnalyticsFilters state={state} onChange={(next) => { setState(next); setPage(1); }} showPlatform showBots />

            {s ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatsCard title={t("admin.siteAnalytics.activeNow")} value={fmtInt(s.activeNow)} icon={Activity} description={t("admin.siteAnalytics.activeNowNote")} />
                    <StatsCard title={t("admin.siteAnalytics.sessions")} value={fmtInt(s.sessions)} icon={LogIn} description={t("admin.siteAnalytics.pageViewsNote").replace("{count}", fmtInt(s.pageViews))} />
                    <StatsCard title={t("admin.siteAnalytics.uniqueVisitors")} value={fmtInt(s.uniqueVisitors)} icon={Users} description={t("admin.siteAnalytics.uniqueVisitorsNote")} />
                    <StatsCard title={t("admin.siteAnalytics.avgDuration")} value={fmtDuration(s.avgSessionSeconds)} icon={Clock} description={t("admin.siteAnalytics.avgPagesNoteShort").replace("{count}", s.avgPagesPerSession.toLocaleString())} />
                    <StatsCard title={t("admin.siteAnalytics.bounceRate")} value={fmtPct(s.bounceRate)} icon={TrendingDown} description={t("admin.siteAnalytics.bounceDefinition")} />
                    <StatsCard title={t("admin.siteAnalytics.registeredShare")} value={fmtPct(s.sessions === 0 ? 0 : (s.registeredSessions / s.sessions) * 100)} icon={UserCheck} description={t("admin.siteAnalytics.registeredUsersNote").replace("{count}", fmtInt(s.registeredUsers))} />
                    <StatsCard title={t("admin.siteAnalytics.countries")} value={fmtInt(s.countries)} icon={Globe} description={t("admin.siteAnalytics.countriesNote")} />
                    <StatsCard title={t("admin.siteAnalytics.botTraffic")} value={fmtInt(s.botHits)} icon={Bot} description={t("admin.siteAnalytics.botsFiltered").replace("{internal}", fmtInt(s.internalHits))} />
                </div>
            ) : null}

            <SiteTimeSeriesChart
                data={series.data ?? []}
                title={t("admin.siteAnalytics.timeSeriesTitle")}
                description={t("admin.siteAnalytics.timeSeriesDescription")}
                locale={locale}
                series={[
                    { key: "pageViews", label: t("admin.siteAnalytics.pageViews"), color: "var(--mention)" },
                    { key: "sessions", label: t("admin.siteAnalytics.sessions"), color: "var(--chart-2)" },
                    { key: "uniqueVisitors", label: t("admin.siteAnalytics.uniqueVisitors"), color: "var(--chart-4)" },
                    { key: "registeredSessions", label: t("admin.siteAnalytics.segmentRegistered"), color: "var(--chart-5)" },
                ]}
            />

            <div className="grid gap-4 xl:grid-cols-2">
                <MetricBarTable
                    title={t("admin.siteAnalytics.channelsTitle")}
                    description={t("admin.siteAnalytics.channelsDescription")}
                    rows={channels.data ?? []}
                    getKey={(r) => r.key}
                    getLabel={(r) => <span className="text-sm">{r.key}</span>}
                    getBarValue={(r) => r.sessions}
                    columns={breakdownColumns}
                    emptyText={empty}
                />
                <MetricBarTable
                    title={t("admin.siteAnalytics.breakdownTitle")}
                    description={t("admin.siteAnalytics.breakdownDescription")}
                    rows={breakdown.data ?? []}
                    getKey={(r) => r.key}
                    getLabel={(r) => <span className="text-sm">{r.key}</span>}
                    getBarValue={(r) => r.sessions}
                    columns={breakdownColumns}
                    emptyText={empty}
                    action={
                        <Tabs value={dimension} onValueChange={(v) => setDimension(v as SiteBreakdownDimension)}>
                            <TabsList className="h-8 flex-wrap">
                                {DIMENSIONS.map((d) => (
                                    <TabsTrigger key={d} value={d} className="px-2 text-xs">{t(`admin.siteAnalytics.dimensions.${d}`)}</TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    }
                />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <MetricBarTable
                    title={t("admin.siteAnalytics.entriesTitle")}
                    description={t("admin.siteAnalytics.entriesDescription")}
                    rows={entries.data ?? []}
                    getKey={(r) => r.route}
                    getLabel={(r) => <span className="flex items-center gap-2 font-mono text-xs"><LogIn className="h-3.5 w-3.5 text-muted-foreground" />{routeLabel(r.route)}</span>}
                    getBarValue={(r) => r.sessions}
                    columns={[
                        { key: "sessions", label: t("admin.siteAnalytics.colSessions"), render: (r) => fmtInt(r.sessions) },
                        { key: "share", label: t("admin.siteAnalytics.colShare"), render: (r) => fmtPct(r.share), muted: true },
                        { key: "bounce", label: t("admin.siteAnalytics.colBounce"), render: (r) => fmtPct(r.bounceRate), muted: true },
                    ]}
                    emptyText={empty}
                />
                <MetricBarTable
                    title={t("admin.siteAnalytics.exitsTitle")}
                    description={t("admin.siteAnalytics.exitsDescription")}
                    rows={exits.data ?? []}
                    getKey={(r) => r.route}
                    getLabel={(r) => <span className="flex items-center gap-2 font-mono text-xs"><LogOut className="h-3.5 w-3.5 text-muted-foreground" />{routeLabel(r.route)}</span>}
                    getBarValue={(r) => r.sessions}
                    columns={[
                        { key: "sessions", label: t("admin.siteAnalytics.colSessions"), render: (r) => fmtInt(r.sessions) },
                        { key: "share", label: t("admin.siteAnalytics.colShare"), render: (r) => fmtPct(r.share), muted: true },
                        { key: "bounce", label: t("admin.siteAnalytics.colBounce"), render: (r) => fmtPct(r.bounceRate), muted: true },
                    ]}
                    emptyText={empty}
                />
            </div>

            <SiteSessionsTable
                sessions={sessions.data?.items ?? []}
                title={t("admin.siteAnalytics.sessionsTitle")}
                description={t("admin.siteAnalytics.sessionsDescription").replace("{count}", fmtInt(totalSessions))}
                locale={locale}
                routeLabel={routeLabel}
                labels={{
                    when: t("admin.siteAnalytics.colWhen"),
                    who: t("admin.siteAnalytics.colWho"),
                    channel: t("admin.siteAnalytics.colChannel"),
                    where: t("admin.siteAnalytics.colWhere"),
                    pages: t("admin.siteAnalytics.colPages"),
                    duration: t("admin.siteAnalytics.colDuration"),
                    journey: t("admin.siteAnalytics.colJourney"),
                    scroll: t("admin.siteAnalytics.colScroll"),
                    anonymous: t("admin.siteAnalytics.anonymousVisitor"),
                    bot: t("admin.siteAnalytics.botBadge"),
                    internal: t("admin.siteAnalytics.internalBadge"),
                    empty,
                    stepView: t("admin.siteAnalytics.stepView"),
                    stepLeave: t("admin.siteAnalytics.stepLeave"),
                    stepAction: t("admin.siteAnalytics.stepAction"),
                }}
                footer={
                    pageCount > 1 ? (
                        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{t("admin.siteAnalytics.pageOf").replace("{page}", String(page)).replace("{total}", String(pageCount))}</span>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t("admin.siteAnalytics.prev")}</Button>
                                <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>{t("admin.siteAnalytics.next")}</Button>
                            </div>
                        </div>
                    ) : null
                }
            />
        </div>
    );
}
