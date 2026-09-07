"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import type { SiteTimePoint } from "@/models/site-analytics/site-analytics.model";

export interface SeriesSpec {
    key: keyof SiteTimePoint;
    label: string;
    color: string;
}

export function SiteTimeSeriesChart({
    data,
    title,
    description,
    series,
    locale,
}: {
    data: SiteTimePoint[];
    title: string;
    description: string;
    series: SeriesSpec[];
    locale: string;
}) {
    const formatted = data.map((point) => ({
        ...point,
        label: new Date(point.date).toLocaleDateString(locale, { day: "2-digit", month: "short" }),
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
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
                            {series.map((s) => (
                                <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    {series.map((s) => (
                        <span key={s.key} className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                            {s.label}
                        </span>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
