"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { DownloadAnalyticsTimePoint } from "@/models/download-analytics/download-analytics.model";

/**
 * LineChart, yigilmis AreaChart DEGIL: seriler ic ice gecmis alt kumeler
 * (magazaya ulasan <= tekil ziyaret <= goruntuleme). Ust uste yigmak toplami
 * oldugundan buyuk gosterip yaniltirdi.
 */
export function DownloadTimeSeriesChart({
    data,
    title,
    description,
    labels,
    locale,
}: {
    data: DownloadAnalyticsTimePoint[];
    title: string;
    description: string;
    labels: { pageViews: string; uniqueVisits: string; storeReach: string };
    locale: string;
}) {
    const formatted = data.map((point) => ({
        ...point,
        label: new Date(point.date).toLocaleDateString(locale, { day: "2-digit", month: "short" }),
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{
                                    background: "var(--popover)",
                                    border: "1px solid var(--border)",
                                    borderRadius: 8,
                                    fontSize: 12,
                                    color: "var(--popover-foreground)",
                                }}
                            />
                            <Line type="monotone" dataKey="pageViews" name={labels.pageViews} stroke="var(--mention)" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="uniqueVisits" name={labels.uniqueVisits} stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="storeReach" name={labels.storeReach} stroke="var(--chart-4)" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <LegendDot color="var(--mention)" label={labels.pageViews} />
                    <LegendDot color="var(--chart-2)" label={labels.uniqueVisits} />
                    <LegendDot color="var(--chart-4)" label={labels.storeReach} />
                </div>
            </CardContent>
        </Card>
    );
}

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
            {label}
        </span>
    );
}
