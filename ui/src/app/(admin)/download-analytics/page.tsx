"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, Eye, Loader2, ShoppingBag, TrendingUp, Users } from "lucide-react";

import { useI18n, useCurrentLocale } from "@/core/contexts/locale-context";
import {
    getDownloadBreakdown,
    getDownloadEvents,
    getDownloadFunnel,
    getDownloadSummary,
    getDownloadTimeSeries,
} from "@/api/download-analytics/download-analytics.api";
import { BreakdownDimension, DownloadAnalyticsFilter } from "@/models/download-analytics/download-analytics.model";
import { StatsCard } from "@/core/components/admin/stats-card";
import { BreakdownCard } from "@/core/components/admin/breakdown-card";
import { DownloadFunnelCard } from "@/core/components/admin/download-funnel-card";
import { DownloadTimeSeriesChart } from "@/core/components/admin/download-timeseries-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table";
import { Badge } from "@/core/components/ui/badge";
import { Switch } from "@/core/components/ui/switch";
import { Label } from "@/core/components/ui/label";

/** Gun sayisindan ISO tarih araligi uretir. */
function rangeFromDays(days: number): { startDate: string; endDate: string } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

const BREAKDOWNS: { dimension: BreakdownDimension; labelKey: string }[] = [
    { dimension: "channel", labelKey: "admin.downloadAnalytics.byChannel" },
    { dimension: "utmCampaign", labelKey: "admin.downloadAnalytics.byCampaign" },
    { dimension: "platform", labelKey: "admin.downloadAnalytics.byPlatform" },
    { dimension: "country", labelKey: "admin.downloadAnalytics.byCountry" },
    { dimension: "browser", labelKey: "admin.downloadAnalytics.byBrowser" },
];

export default function DownloadAnalyticsPage() {
    const t = useI18n();
    const locale = useCurrentLocale();

    const [days, setDays] = useState("30");
    const [platform, setPlatform] = useState("all");
    const [includeBots, setIncludeBots] = useState(false);

    const filter: DownloadAnalyticsFilter = {
        ...rangeFromDays(Number(days)),
        platform: platform === "all" ? undefined : platform,
        includeBots,
    };
    // Sorgu anahtari filtrenin TAMAMINI icermeli, yoksa filtre degisince
    // TanStack onbellekten eski veriyi doner.
    const key = [filter.startDate, filter.endDate, filter.platform ?? "all", includeBots];

    const summaryQuery = useQuery({
        queryKey: ["download-analytics", "summary", ...key],
        queryFn: async () => (await getDownloadSummary(filter)).data,
        placeholderData: (prev) => prev,
    });

    const funnelQuery = useQuery({
        queryKey: ["download-analytics", "funnel", ...key],
        queryFn: async () => (await getDownloadFunnel(filter)).data,
        placeholderData: (prev) => prev,
    });

    const seriesQuery = useQuery({
        queryKey: ["download-analytics", "timeseries", ...key],
        queryFn: async () => (await getDownloadTimeSeries(filter)).data,
        placeholderData: (prev) => prev,
    });

    const eventsQuery = useQuery({
        queryKey: ["download-analytics", "events", ...key],
        queryFn: async () => (await getDownloadEvents({ ...filter, page: 1, pageSize: 25 })).data,
        placeholderData: (prev) => prev,
    });

    const isLoading = summaryQuery.isLoading || funnelQuery.isLoading;
    const isError = summaryQuery.isError || funnelQuery.isError;

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="container px-6 py-6 lg:px-8 lg:py-8">
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center">
                    <p className="text-sm font-medium">{t("admin.loadErrorTitle")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t("admin.downloadAnalytics.loadError")}</p>
                </div>
            </div>
        );
    }

    const summary = summaryQuery.data;
    const funnel = funnelQuery.data;

    return (
        // Dolgu diger admin sayfalariyla ayni (dashboard/users/reports); <main>
        // kendi dolgusunu vermiyor, her sayfa kendi veriyor.
        <div className="container flex flex-col gap-6 px-6 py-6 lg:px-8 lg:py-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t("admin.downloadAnalytics.title")}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t("admin.downloadAnalytics.description")}</p>
            </div>

            <Card>
                <CardContent className="flex flex-wrap items-end gap-4 pt-6">
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t("admin.downloadAnalytics.filterRange")}</Label>
                        <Select value={days} onValueChange={setDays}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">{t("admin.downloadAnalytics.last7")}</SelectItem>
                                <SelectItem value="30">{t("admin.downloadAnalytics.last30")}</SelectItem>
                                <SelectItem value="90">{t("admin.downloadAnalytics.last90")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t("admin.downloadAnalytics.platform")}</Label>
                        <Select value={platform} onValueChange={setPlatform}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("admin.downloadAnalytics.allPlatforms")}</SelectItem>
                                <SelectItem value="ios">iOS</SelectItem>
                                <SelectItem value="android">Android</SelectItem>
                                <SelectItem value="other">Desktop</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2 pb-2">
                        <Switch id="include-bots" checked={includeBots} onCheckedChange={setIncludeBots} />
                        <Label htmlFor="include-bots" className="text-sm">
                            {t("admin.downloadAnalytics.includeBots")}
                        </Label>
                    </div>
                </CardContent>
            </Card>

            {summary ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <StatsCard title={t("admin.downloadAnalytics.pageViews")} value={summary.pageViews.toLocaleString()} icon={Eye} />
                    <StatsCard
                        title={t("admin.downloadAnalytics.uniqueVisits")}
                        value={summary.uniqueVisits.toLocaleString()}
                        icon={Users}
                        description={t("admin.downloadAnalytics.uniqueVisitorsNote").replace("{count}", summary.uniqueVisitors.toLocaleString())}
                    />
                    <StatsCard
                        title={t("admin.downloadAnalytics.storeReach")}
                        value={(summary.autoRedirects + summary.storeClicks).toLocaleString()}
                        icon={ShoppingBag}
                        description={t("admin.downloadAnalytics.storeReachNote")}
                    />
                    <StatsCard title={t("admin.downloadAnalytics.conversion")} value={`${summary.storeReachRate}%`} icon={TrendingUp} />
                    <StatsCard
                        title={t("admin.downloadAnalytics.botTraffic")}
                        value={summary.botHits.toLocaleString()}
                        icon={Bot}
                        description={t("admin.downloadAnalytics.botsFiltered")}
                    />
                </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
                {funnel ? (
                    <DownloadFunnelCard
                        funnel={funnel}
                        title={t("admin.downloadAnalytics.funnelTitle")}
                        description={t("admin.downloadAnalytics.funnelDescription")}
                        labels={{
                            visits: t("admin.downloadAnalytics.funnelVisits"),
                            eligible: t("admin.downloadAnalytics.funnelEligible"),
                            reached: t("admin.downloadAnalytics.funnelReached"),
                            cancelled: t("admin.downloadAnalytics.funnelCancelled"),
                            manual: t("admin.downloadAnalytics.funnelManual"),
                            web: t("admin.downloadAnalytics.funnelWeb"),
                            noAction: t("admin.downloadAnalytics.funnelNoAction"),
                        }}
                    />
                ) : null}

                <DownloadTimeSeriesChart
                    data={seriesQuery.data ?? []}
                    title={t("admin.downloadAnalytics.trendTitle")}
                    description={t("admin.downloadAnalytics.trendDescription")}
                    labels={{
                        pageViews: t("admin.downloadAnalytics.pageViews"),
                        uniqueVisits: t("admin.downloadAnalytics.uniqueVisits"),
                        storeReach: t("admin.downloadAnalytics.storeReach"),
                    }}
                    locale={locale}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                {BREAKDOWNS.map((item) => (
                    <BreakdownSection key={item.dimension} dimension={item.dimension} title={t(item.labelKey)} filter={filter} queryKey={key} />
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("admin.downloadAnalytics.eventsTitle")}</CardTitle>
                    <CardDescription>{t("admin.downloadAnalytics.eventsDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                    {(eventsQuery.data?.items.length ?? 0) === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">{t("admin.downloadAnalytics.noData")}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("admin.downloadAnalytics.eventTime")}</TableHead>
                                        <TableHead>{t("admin.downloadAnalytics.eventType")}</TableHead>
                                        <TableHead>{t("admin.downloadAnalytics.eventChannel")}</TableHead>
                                        <TableHead>{t("admin.downloadAnalytics.eventPlatform")}</TableHead>
                                        <TableHead>{t("admin.downloadAnalytics.eventCountry")}</TableHead>
                                        <TableHead>{t("admin.downloadAnalytics.eventTarget")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {eventsQuery.data?.items.map((event) => (
                                        <TableRow key={event.id}>
                                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                                {new Date(event.occurredAt).toLocaleString(locale)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-mono text-[11px]">
                                                    {event.eventType}
                                                </Badge>
                                                {event.isBot ? (
                                                    <Badge variant="outline" className="ml-1 text-[10px]">
                                                        bot
                                                    </Badge>
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="max-w-[160px] truncate text-sm">{event.channel}</TableCell>
                                            <TableCell className="text-sm">{event.platform}</TableCell>
                                            <TableCell className="text-sm">{event.countryCode ?? "-"}</TableCell>
                                            <TableCell className="text-sm">{event.target ?? "-"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function BreakdownSection({
    dimension,
    title,
    filter,
    queryKey,
}: {
    dimension: BreakdownDimension;
    title: string;
    filter: DownloadAnalyticsFilter;
    queryKey: (string | number | boolean | undefined)[];
}) {
    const t = useI18n();
    const { data } = useQuery({
        queryKey: ["download-analytics", "breakdown", dimension, ...queryKey],
        queryFn: async () => (await getDownloadBreakdown(dimension, filter)).data,
        placeholderData: (prev) => prev,
    });

    return (
        <BreakdownCard
            title={title}
            description={dimension === "channel" ? t("admin.downloadAnalytics.channelNote") : undefined}
            rows={data ?? []}
            emptyText={t("admin.downloadAnalytics.noData")}
            columnLabels={{
                visits: t("admin.downloadAnalytics.colVisits"),
                reach: t("admin.downloadAnalytics.colReach"),
                rate: t("admin.downloadAnalytics.colRate"),
            }}
        />
    );
}
