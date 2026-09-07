"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Activity, Clock, Eye, Layers, Loader2, MousePointerClick, ScrollText, UserCheck, Users } from "lucide-react";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { siteAnalyticsApi } from "@/api/site-analytics/site-analytics.api";
import type { SiteContentSection, SiteRouteStat } from "@/models/site-analytics/site-analytics.model";
import { StatsCard } from "@/core/components/admin/stats-card";
import { SiteAnalyticsFilters, useSiteAnalyticsFilter } from "@/core/components/admin/site-analytics-filters";
import { SiteHeatmapGrid } from "@/core/components/admin/site-heatmap-grid";
import { SiteSectionTiles } from "@/core/components/admin/site-section-tiles";
import { SiteTransitionsCard } from "@/core/components/admin/site-transitions-card";
import { MetricBarTable, fmtDuration, fmtInt, fmtPct } from "@/core/components/admin/metric-bar-table";
import { Avatar, AvatarFallback, AvatarImage } from "@core/components/ui/avatar";
import { Badge } from "@/core/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { getImageUrl } from "@/core/lib/get-image-url";

const CONTENT_SECTIONS: SiteContentSection[] = ["games", "profiles", "lists", "posts", "reviews"];

/**
 * Davranis Haritasi: "kullanicilar sitede NE yapiyor, NEREDE ne kadar kaliyor".
 * Trafik sayfasi "kim, nereden" sorusuna bakar; bu sayfa icerideki hareketi okur.
 */
export default function BehaviorPage() {
    const t = useI18n();
    const locale = useCurrentLocale();
    const { state, setState, filter, key } = useSiteAnalyticsFilter();
    const [routeSection, setRouteSection] = useState("all");
    const [contentSection, setContentSection] = useState<SiteContentSection>("games");
    const tzOffset = -new Date().getTimezoneOffset();

    const useSiteQuery = <T,>(name: string, fn: () => Promise<{ data: T }>, extra: unknown[] = []) =>
        useQuery({ queryKey: ["site-analytics", name, ...key, ...extra], queryFn: async () => (await fn()).data, placeholderData: keepPreviousData });

    const summary = useSiteQuery("summary", () => siteAnalyticsApi.summary(filter));
    const sections = useSiteQuery("sections", () => siteAnalyticsApi.sections(filter));
    const heatmap = useSiteQuery("heatmap", () => siteAnalyticsApi.heatmap(filter, tzOffset), [tzOffset]);
    const routes = useSiteQuery("routes", () => siteAnalyticsApi.routes({ ...filter, section: routeSection === "all" ? undefined : routeSection }), [routeSection]);
    const transitions = useSiteQuery("transitions", () => siteAnalyticsApi.transitions(filter));
    const content = useSiteQuery("content", () => siteAnalyticsApi.content(contentSection, filter), [contentSection]);
    const actions = useSiteQuery("actions", () => siteAnalyticsApi.actions(filter));
    const segments = useSiteQuery("segments", () => siteAnalyticsApi.segments(filter));
    const topUsers = useSiteQuery("top-users", () => siteAnalyticsApi.topUsers(filter));

    const sectionLabel = (s: string) => t(`admin.siteAnalytics.sections.${s}`);
    const routeLabel = (route: string) => route;
    const weekdayLabels = t("admin.siteAnalytics.weekdays").split(",");

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
    const empty = t("admin.siteAnalytics.empty");
    const seg = segments.data ?? [];
    const anon = seg.find((x) => x.segment === "anonymous");
    const reg = seg.find((x) => x.segment === "registered");

    return (
        <div className="container flex flex-col gap-6 px-6 py-6 lg:px-8 lg:py-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t("admin.siteAnalytics.behaviorTitle")}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t("admin.siteAnalytics.behaviorDescription")}</p>
            </div>

            <SiteAnalyticsFilters state={state} onChange={setState} />

            {s ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatsCard title={t("admin.siteAnalytics.pageViews")} value={fmtInt(s.pageViews)} icon={Eye} description={t("admin.siteAnalytics.sessionsNote").replace("{count}", fmtInt(s.sessions))} />
                    <StatsCard title={t("admin.siteAnalytics.avgPages")} value={s.avgPagesPerSession.toLocaleString()} icon={Layers} description={t("admin.siteAnalytics.avgPagesNote")} />
                    <StatsCard title={t("admin.siteAnalytics.avgDuration")} value={fmtDuration(s.avgSessionSeconds)} icon={Clock} description={t("admin.siteAnalytics.bounceNote").replace("{rate}", fmtPct(s.bounceRate))} />
                    <StatsCard title={t("admin.siteAnalytics.avgScroll")} value={fmtPct(s.avgScrollDepth)} icon={ScrollText} description={t("admin.siteAnalytics.avgScrollNote")} />
                    <StatsCard title={t("admin.siteAnalytics.actions")} value={fmtInt(s.actions)} icon={MousePointerClick} description={t("admin.siteAnalytics.actionRateNote").replace("{rate}", fmtPct(s.actionRate))} />
                    <StatsCard title={t("admin.siteAnalytics.registeredUsers")} value={fmtInt(s.registeredUsers)} icon={UserCheck} description={t("admin.siteAnalytics.registeredSessionsNote").replace("{count}", fmtInt(s.registeredSessions))} />
                    <StatsCard title={t("admin.siteAnalytics.anonymousSessions")} value={fmtInt(s.anonymousSessions)} icon={Users} description={t("admin.siteAnalytics.anonymousNote")} />
                    <StatsCard title={t("admin.siteAnalytics.activeNow")} value={fmtInt(s.activeNow)} icon={Activity} description={t("admin.siteAnalytics.activeNowNote")} />
                </div>
            ) : null}

            <SiteSectionTiles
                sections={sections.data ?? []}
                title={t("admin.siteAnalytics.sectionHeatTitle")}
                description={t("admin.siteAnalytics.sectionHeatDescription")}
                sectionLabel={sectionLabel}
                labels={{
                    views: t("admin.siteAnalytics.pageViews"),
                    sessions: t("admin.siteAnalytics.sessions"),
                    dwell: t("admin.siteAnalytics.colDwell"),
                    scroll: t("admin.siteAnalytics.colScroll"),
                    exit: t("admin.siteAnalytics.colExitRate"),
                    users: t("admin.siteAnalytics.colUsers"),
                    actions: t("admin.siteAnalytics.actions"),
                }}
                emptyText={empty}
            />

            <SiteHeatmapGrid
                cells={heatmap.data ?? []}
                title={t("admin.siteAnalytics.hourHeatTitle")}
                description={t("admin.siteAnalytics.hourHeatDescription")}
                weekdayLabels={weekdayLabels}
                metricLabel={t("admin.siteAnalytics.pageViews")}
                emptyText={empty}
            />

            <div className="grid gap-4 xl:grid-cols-5">
                <div className="xl:col-span-3">
                    <MetricBarTable<SiteRouteStat>
                        title={t("admin.siteAnalytics.routesTitle")}
                        description={t("admin.siteAnalytics.routesDescription")}
                        rows={routes.data ?? []}
                        getKey={(r) => r.route}
                        getLabel={(r) => (
                            <span className="flex items-center gap-2">
                                <span className="font-mono text-xs">{r.route}</span>
                                <Badge variant="outline" className="text-[10px]">{sectionLabel(r.section)}</Badge>
                            </span>
                        )}
                        getBarValue={(r) => r.pageViews}
                        columns={[
                            { key: "pageViews", label: t("admin.siteAnalytics.colViews"), render: (r) => fmtInt(r.pageViews) },
                            { key: "sessions", label: t("admin.siteAnalytics.colSessions"), render: (r) => fmtInt(r.sessions), muted: true },
                            { key: "dwell", label: t("admin.siteAnalytics.colDwell"), render: (r) => fmtDuration(r.avgDwellSeconds), width: "5rem" },
                            { key: "scroll", label: t("admin.siteAnalytics.colScroll"), render: (r) => fmtPct(r.avgScrollDepth), muted: true, width: "3.5rem" },
                            { key: "entries", label: t("admin.siteAnalytics.colEntries"), render: (r) => fmtInt(r.entries), muted: true, width: "3.5rem" },
                            { key: "exits", label: t("admin.siteAnalytics.colExits"), render: (r) => fmtInt(r.exits), muted: true, width: "3.5rem" },
                            { key: "actions", label: t("admin.siteAnalytics.colActions"), render: (r) => fmtInt(r.actions), width: "3.5rem" },
                        ]}
                        emptyText={empty}
                        action={
                            <Select value={routeSection} onValueChange={setRouteSection}>
                                <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t("admin.siteAnalytics.allSections")}</SelectItem>
                                    {["home", "discover", "agenda", "games", "lists", "collection", "posts", "profiles", "reviews", "messages", "auth", "info", "download"].map((sec) => (
                                        <SelectItem key={sec} value={sec}>{sectionLabel(sec)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        }
                    />
                </div>
                <div className="xl:col-span-2">
                    <SiteTransitionsCard
                        transitions={transitions.data ?? []}
                        title={t("admin.siteAnalytics.transitionsTitle")}
                        description={t("admin.siteAnalytics.transitionsDescription")}
                        routeLabel={routeLabel}
                        emptyText={empty}
                        shareLabel={t("admin.siteAnalytics.transitionShare")}
                    />
                </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <MetricBarTable
                    title={t("admin.siteAnalytics.contentTitle")}
                    description={t("admin.siteAnalytics.contentDescription")}
                    rows={content.data ?? []}
                    getKey={(r) => r.key}
                    getLabel={(r) => <span className="text-sm">{r.key}</span>}
                    getBarValue={(r) => r.pageViews}
                    columns={[
                        { key: "pageViews", label: t("admin.siteAnalytics.colViews"), render: (r) => fmtInt(r.pageViews) },
                        { key: "sessions", label: t("admin.siteAnalytics.colSessions"), render: (r) => fmtInt(r.sessions), muted: true },
                        { key: "users", label: t("admin.siteAnalytics.colUsers"), render: (r) => fmtInt(r.registeredUsers), muted: true },
                        { key: "dwell", label: t("admin.siteAnalytics.colDwell"), render: (r) => fmtDuration(r.avgDwellSeconds), width: "5rem" },
                    ]}
                    emptyText={empty}
                    action={
                        <Tabs value={contentSection} onValueChange={(v) => setContentSection(v as SiteContentSection)}>
                            <TabsList className="h-8">
                                {CONTENT_SECTIONS.map((sec) => (
                                    <TabsTrigger key={sec} value={sec} className="px-2 text-xs">{sectionLabel(sec)}</TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    }
                />

                <MetricBarTable
                    title={t("admin.siteAnalytics.actionsTitle")}
                    description={t("admin.siteAnalytics.actionsDescription")}
                    rows={actions.data ?? []}
                    getKey={(r) => r.action}
                    getLabel={(r) => <span className="text-sm">{t(`admin.siteAnalytics.actionNames.${r.action}`)}</span>}
                    getBarValue={(r) => r.count}
                    columns={[
                        { key: "count", label: t("admin.siteAnalytics.colCount"), render: (r) => fmtInt(r.count) },
                        { key: "sessions", label: t("admin.siteAnalytics.colSessions"), render: (r) => fmtInt(r.sessions), muted: true },
                        { key: "users", label: t("admin.siteAnalytics.colUsers"), render: (r) => fmtInt(r.registeredUsers), muted: true },
                        { key: "anon", label: t("admin.siteAnalytics.colAnonymous"), render: (r) => fmtInt(r.anonymousCount), muted: true },
                    ]}
                    emptyText={empty}
                />
            </div>

            <div className="grid gap-4 xl:grid-cols-5">
                <Card className="xl:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base">{t("admin.siteAnalytics.segmentsTitle")}</CardTitle>
                        <CardDescription>{t("admin.siteAnalytics.segmentsDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-y-2 text-sm">
                            <div />
                            <div className="text-right text-[11px] uppercase tracking-wide text-muted-foreground">{t("admin.siteAnalytics.segmentAnonymous")}</div>
                            <div className="text-right text-[11px] uppercase tracking-wide text-muted-foreground">{t("admin.siteAnalytics.segmentRegistered")}</div>
                            {[
                                [t("admin.siteAnalytics.sessions"), fmtInt(anon?.sessions), fmtInt(reg?.sessions)],
                                [t("admin.siteAnalytics.avgPages"), (anon?.avgPagesPerSession ?? 0).toLocaleString(), (reg?.avgPagesPerSession ?? 0).toLocaleString()],
                                [t("admin.siteAnalytics.avgDuration"), fmtDuration(anon?.avgSessionSeconds), fmtDuration(reg?.avgSessionSeconds)],
                                [t("admin.siteAnalytics.avgScroll"), fmtPct(anon?.avgScrollDepth), fmtPct(reg?.avgScrollDepth)],
                                [t("admin.siteAnalytics.actions"), fmtInt(anon?.actions), fmtInt(reg?.actions)],
                                [t("admin.siteAnalytics.actionRate"), fmtPct(anon?.actionRate), fmtPct(reg?.actionRate)],
                                [t("admin.siteAnalytics.bounceRate"), fmtPct(anon?.bounceRate), fmtPct(reg?.bounceRate)],
                            ].map(([label, a, b]) => (
                                <SegmentRow key={label} label={label} a={a} b={b} />
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="xl:col-span-3">
                    <MetricBarTable
                        title={t("admin.siteAnalytics.topUsersTitle")}
                        description={t("admin.siteAnalytics.topUsersDescription")}
                        rows={topUsers.data ?? []}
                        getKey={(u) => String(u.userId)}
                        getLabel={(u) => (
                            <span className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={getImageUrl(u.profileImageUrl)} alt={u.username} />
                                    <AvatarFallback className="text-[10px]">{u.username.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">{u.username}</span>
                                {u.topSection ? <Badge variant="outline" className="text-[10px]">{sectionLabel(u.topSection)}</Badge> : null}
                            </span>
                        )}
                        getBarValue={(u) => u.pageViews}
                        columns={[
                            { key: "sessions", label: t("admin.siteAnalytics.colSessions"), render: (u) => fmtInt(u.sessions), muted: true, width: "3.5rem" },
                            { key: "pageViews", label: t("admin.siteAnalytics.colViews"), render: (u) => fmtInt(u.pageViews) },
                            { key: "actions", label: t("admin.siteAnalytics.colActions"), render: (u) => fmtInt(u.actions), width: "3.5rem" },
                            { key: "minutes", label: t("admin.siteAnalytics.colMinutes"), render: (u) => u.totalMinutes.toLocaleString(), muted: true, width: "3.5rem" },
                            { key: "last", label: t("admin.siteAnalytics.colLastSeen"), render: (u) => new Date(u.lastSeenAt).toLocaleDateString(locale, { day: "2-digit", month: "short" }), muted: true, width: "4.5rem" },
                        ]}
                        emptyText={empty}
                    />
                </div>
            </div>
        </div>
    );
}

function SegmentRow({ label, a, b }: { label: string; a: string; b: string }) {
    return (
        <>
            <div className="text-muted-foreground">{label}</div>
            <div className="text-right font-mono tabular-nums">{a}</div>
            <div className="text-right font-mono tabular-nums">{b}</div>
        </>
    );
}
