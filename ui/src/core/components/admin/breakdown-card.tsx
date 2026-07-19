"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { DownloadAnalyticsBreakdown } from "@/models/download-analytics/download-analytics.model";

/**
 * Kanal/kampanya/ulke gibi tum kirilimlar icin TEK yeniden kullanilabilir kart.
 * Her kirilim icin ayri bir recharts instance'i acmak yerine hucre ici bar:
 * mobilde cok daha okunur ve sayfayi hafif tutar. Pasta grafik BILEREK yok,
 * siralanabilir kategorilerde bar her zaman daha iyi okunur.
 */
export function BreakdownCard({
    title,
    description,
    rows,
    emptyText,
    columnLabels,
}: {
    title: string;
    description?: string;
    rows: DownloadAnalyticsBreakdown[];
    emptyText: string;
    columnLabels: { visits: string; reach: string; rate: string };
}) {
    const max = rows.reduce((peak, row) => Math.max(peak, row.uniqueVisits), 0) || 1;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                {description ? <CardDescription>{description}</CardDescription> : null}
            </CardHeader>
            <CardContent>
                {rows.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 border-b pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                            <span className="flex-1" />
                            <span className="w-16 text-right">{columnLabels.visits}</span>
                            <span className="w-16 text-right">{columnLabels.reach}</span>
                            <span className="w-14 text-right">{columnLabels.rate}</span>
                        </div>
                        {rows.map((row) => (
                            <div key={row.key} className="flex items-center gap-3 text-sm">
                                <div className="relative min-w-0 flex-1">
                                    {/* Hucre ici bar: metnin ARKASINDA, oransal genislikte. */}
                                    <div
                                        aria-hidden
                                        className="absolute inset-y-0 left-0 rounded bg-mention/15"
                                        style={{ width: `${Math.round((row.uniqueVisits / max) * 100)}%` }}
                                    />
                                    <span className="relative block truncate px-1 py-0.5" title={row.key}>
                                        {row.key}
                                    </span>
                                </div>
                                <span className="w-16 text-right font-mono tabular-nums">{row.uniqueVisits.toLocaleString()}</span>
                                <span className="w-16 text-right font-mono tabular-nums text-muted-foreground">
                                    {row.storeReach.toLocaleString()}
                                </span>
                                <span className="w-14 text-right font-mono tabular-nums font-medium">{row.conversionRate}%</span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
