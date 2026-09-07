"use client";

import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, ChevronDown, ChevronRight, Loader2, MousePointerClick, ShieldCheck, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@core/components/ui/avatar";
import { Badge } from "@/core/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table";
import { getImageUrl } from "@/core/lib/get-image-url";
import { siteAnalyticsApi } from "@/api/site-analytics/site-analytics.api";
import type { SiteSession } from "@/models/site-analytics/site-analytics.model";
import { fmtDuration, fmtInt, fmtPct } from "./metric-bar-table";

export interface SessionsTableLabels {
    when: string;
    who: string;
    channel: string;
    where: string;
    pages: string;
    duration: string;
    journey: string;
    scroll: string;
    anonymous: string;
    bot: string;
    internal: string;
    empty: string;
    stepView: string;
    stepLeave: string;
    stepAction: string;
}

/**
 * Canli oturum akisi: "kim gelmis, nereden, ne kadar gezmis, nereden cikmis". Satir acilinca
 * oturumun sayfa sayfa yolculugu yuklenir (tembel: 25 satir icin 25 sorgu atmak yerine
 * yalnizca bakilan oturum).
 */
export function SiteSessionsTable({
    sessions,
    title,
    description,
    labels,
    routeLabel,
    locale,
    footer,
}: {
    sessions: SiteSession[];
    title: string;
    description: string;
    labels: SessionsTableLabels;
    routeLabel: (route: string) => string;
    locale: string;
    footer?: React.ReactNode;
}) {
    const [openId, setOpenId] = useState<string | null>(null);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {sessions.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{labels.empty}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-8" />
                                    <TableHead>{labels.when}</TableHead>
                                    <TableHead>{labels.who}</TableHead>
                                    <TableHead>{labels.channel}</TableHead>
                                    <TableHead>{labels.where}</TableHead>
                                    <TableHead className="text-right">{labels.pages}</TableHead>
                                    <TableHead className="text-right">{labels.duration}</TableHead>
                                    <TableHead className="text-right">{labels.scroll}</TableHead>
                                    <TableHead>{labels.journey}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessions.map((s) => {
                                    const isOpen = openId === s.sessionId;
                                    return (
                                        <Fragment key={s.sessionId}>
                                            <TableRow className="cursor-pointer" onClick={() => setOpenId(isOpen ? null : s.sessionId)}>
                                                <TableCell className="px-2 text-muted-foreground">
                                                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-xs">
                                                    <div>{new Date(s.startedAt).toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                                                    <div className="text-muted-foreground">{relative(s.lastSeenAt, locale)}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {s.username ? (
                                                            <>
                                                                <Avatar className="h-6 w-6">
                                                                    <AvatarImage src={getImageUrl(s.profileImageUrl)} alt={s.username} />
                                                                    <AvatarFallback className="text-[10px]">{s.username.charAt(0).toUpperCase()}</AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-sm font-medium">{s.username}</span>
                                                            </>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                                <UserRound className="h-3.5 w-3.5" /> {labels.anonymous}
                                                            </span>
                                                        )}
                                                        {s.isBot ? <Badge variant="outline" className="gap-1 text-[10px]"><Bot className="h-3 w-3" />{labels.bot}</Badge> : null}
                                                        {s.isInternal ? <Badge variant="outline" className="gap-1 text-[10px]"><ShieldCheck className="h-3 w-3" />{labels.internal}</Badge> : null}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs">{s.channel ?? "direct"}</TableCell>
                                                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                                    {[s.countryCode, s.deviceType, s.browser].filter(Boolean).join(" / ")}
                                                </TableCell>
                                                <TableCell className="text-right font-mono tabular-nums">
                                                    {fmtInt(s.pageViews)}
                                                    {s.actions > 0 ? (
                                                        <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-mention" title={String(s.actions)}>
                                                            <MousePointerClick className="h-3 w-3" />{s.actions}
                                                        </span>
                                                    ) : null}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs tabular-nums">{fmtDuration(s.durationSeconds)}</TableCell>
                                                <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                                                    {s.avgScrollDepth != null ? fmtPct(s.avgScrollDepth) : "-"}
                                                </TableCell>
                                                <TableCell className="max-w-[260px] truncate font-mono text-[11px]">
                                                    {s.entryRoute ? routeLabel(s.entryRoute) : "?"}
                                                    {s.exitRoute && s.exitRoute !== s.entryRoute ? <span className="text-muted-foreground"> {"->"} {routeLabel(s.exitRoute)}</span> : null}
                                                </TableCell>
                                            </TableRow>
                                            {isOpen ? (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="bg-muted/30 p-0">
                                                        <SessionSteps sessionId={s.sessionId} labels={labels} routeLabel={routeLabel} locale={locale} />
                                                    </TableCell>
                                                </TableRow>
                                            ) : null}
                                        </Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
                {footer}
            </CardContent>
        </Card>
    );
}

function SessionSteps({ sessionId, labels, routeLabel, locale }: { sessionId: string; labels: SessionsTableLabels; routeLabel: (r: string) => string; locale: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ["site-analytics", "session", sessionId],
        queryFn: async () => (await siteAnalyticsApi.sessionSteps(sessionId)).data,
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const steps = (data ?? []).filter((step) => step.eventType !== "page_leave" || step.dwellMs != null);

    return (
        <ol className="space-y-1 px-6 py-3">
            {steps.map((step, index) => (
                <li key={index} className="flex items-center gap-3 text-xs">
                    <span className="w-14 shrink-0 font-mono text-muted-foreground">
                        {new Date(step.occurredAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                    <span
                        className={`w-2 shrink-0 rounded-full ${step.eventType === "action" ? "h-2 bg-mention" : step.eventType === "page_view" ? "h-2 bg-chart-2" : "h-1.5 bg-muted-foreground/50"}`}
                    />
                    <span className="w-16 shrink-0 text-muted-foreground">
                        {step.eventType === "page_view" ? labels.stepView : step.eventType === "action" ? labels.stepAction : labels.stepLeave}
                    </span>
                    <span className="min-w-0 truncate font-mono">
                        {step.eventType === "action" ? step.actionName : routeLabel(step.route)}
                        {step.pathKey ? <span className="text-muted-foreground"> {step.pathKey}</span> : null}
                    </span>
                    {step.eventType === "page_leave" ? (
                        <span className="ml-auto shrink-0 font-mono text-muted-foreground">
                            {fmtDuration((step.dwellMs ?? 0) / 1000)}
                            {step.scrollDepth != null ? ` / ${fmtPct(step.scrollDepth)}` : ""}
                        </span>
                    ) : null}
                </li>
            ))}
        </ol>
    );
}

function relative(iso: string, locale: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.round(diff / 60000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    if (minutes < 60) return rtf.format(-minutes, "minute");
    const hours = Math.round(minutes / 60);
    if (hours < 24) return rtf.format(-hours, "hour");
    return rtf.format(-Math.round(hours / 24), "day");
}
