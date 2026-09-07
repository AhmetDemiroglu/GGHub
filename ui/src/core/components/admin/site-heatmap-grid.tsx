"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import type { SiteHeatmapCell } from "@/models/site-analytics/site-analytics.model";

/**
 * Haftanin gunu x saat yogunluk haritasi. Recharts'ta isi haritasi yok; 168 hucrelik CSS grid
 * hem daha hafif hem de tam kontrol veriyor. Renk tek tondan (mention moru) alfa ile turetilir:
 * cok renkli olcek "sicak/soguk" okumasini bozuyordu.
 */
export function SiteHeatmapGrid({
    cells,
    title,
    description,
    weekdayLabels,
    metricLabel,
    emptyText,
}: {
    cells: SiteHeatmapCell[];
    title: string;
    description: string;
    weekdayLabels: string[];
    metricLabel: string;
    emptyText: string;
}) {
    const byKey = new Map<string, SiteHeatmapCell>();
    let max = 0;
    let total = 0;
    for (const cell of cells) {
        byKey.set(`${cell.weekday}-${cell.hour}`, cell);
        if (cell.pageViews > max) max = cell.pageViews;
        total += cell.pageViews;
    }

    // En yogun saat ve gun: ozetin bir cumlelik cevabi.
    const peak = cells.reduce<SiteHeatmapCell | null>((best, c) => (best === null || c.pageViews > best.pageViews ? c : best), null);

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>
                    {description}
                    {peak && peak.pageViews > 0 ? (
                        <span className="ml-1 font-medium text-foreground">
                            {weekdayLabels[peak.weekday]} {String(peak.hour).padStart(2, "0")}:00 ({peak.pageViews.toLocaleString()})
                        </span>
                    ) : null}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {total === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="min-w-[640px]">
                            <div className="grid" style={{ gridTemplateColumns: "44px repeat(24, minmax(0, 1fr))", gap: 3 }}>
                                <div />
                                {hours.map((h) => (
                                    <div key={h} className="text-center text-[10px] tabular-nums text-muted-foreground">
                                        {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
                                    </div>
                                ))}
                                {weekdayLabels.map((label, weekday) => (
                                    <RowCells key={weekday} label={label} weekday={weekday} hours={hours} byKey={byKey} max={max} metricLabel={metricLabel} />
                                ))}
                            </div>
                            <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
                                <span>0</span>
                                <div className="h-2 w-28 rounded" style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--mention) 8%, transparent), var(--mention))" }} />
                                <span>{max.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function RowCells({
    label,
    weekday,
    hours,
    byKey,
    max,
    metricLabel,
}: {
    label: string;
    weekday: number;
    hours: number[];
    byKey: Map<string, SiteHeatmapCell>;
    max: number;
    metricLabel: string;
}) {
    return (
        <>
            <div className="flex items-center text-[11px] font-medium text-muted-foreground">{label}</div>
            {hours.map((hour) => {
                const cell = byKey.get(`${weekday}-${hour}`);
                const value = cell?.pageViews ?? 0;
                const ratio = max === 0 ? 0 : value / max;
                // Sifir hucre hafif bir zemin; en dusuk pozitif deger bile gorunur olsun diye taban %12.
                const alpha = value === 0 ? 4 : 12 + Math.round(ratio * 88);
                return (
                    <div
                        key={hour}
                        title={`${label} ${String(hour).padStart(2, "0")}:00  ${metricLabel}: ${value.toLocaleString()}${cell ? `  (${cell.sessions.toLocaleString()} oturum)` : ""}`}
                        className="aspect-square rounded-[3px] transition-transform hover:scale-125"
                        style={{ background: `color-mix(in oklab, var(--mention) ${alpha}%, transparent)` }}
                    />
                );
            })}
        </>
    );
}
