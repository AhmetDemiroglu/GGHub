"use client";

import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import type { SiteTransition } from "@/models/site-analytics/site-analytics.model";
import { fmtInt, fmtPct } from "./metric-bar-table";

/** En sik "A sayfasindan B sayfasina" gecisleri: kullanicinin sitede izledigi patikalar. */
export function SiteTransitionsCard({
    transitions,
    title,
    description,
    routeLabel,
    emptyText,
    shareLabel,
}: {
    transitions: SiteTransition[];
    title: string;
    description: string;
    routeLabel: (route: string) => string;
    emptyText: string;
    shareLabel: string;
}) {
    const max = transitions.reduce((peak, t) => Math.max(peak, t.count), 0) || 1;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {transitions.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
                ) : (
                    <div className="space-y-1.5">
                        {transitions.map((t) => (
                            <div key={`${t.from}>${t.to}`} className="relative flex items-center gap-3 text-sm">
                                <div className="absolute inset-y-0 left-0 rounded bg-mention/15" style={{ width: `${Math.round((t.count / max) * 100)}%` }} aria-hidden />
                                <div className="relative flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1">
                                    <span className="truncate font-mono text-xs">{routeLabel(t.from)}</span>
                                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <span className="truncate font-mono text-xs">{routeLabel(t.to)}</span>
                                </div>
                                <span className="w-16 text-right font-mono tabular-nums">{fmtInt(t.count)}</span>
                                <span className="w-20 text-right font-mono text-xs tabular-nums text-muted-foreground" title={shareLabel}>
                                    {fmtPct(t.share)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
