"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import type { SiteSectionStat } from "@/models/site-analytics/site-analytics.model";
import { fmtDuration, fmtInt, fmtPct } from "./metric-bar-table";

/**
 * Bolum isi haritasi: her karo bir bolum, rengi trafik payina gore isinir. "Kullanicilar sitede
 * NEREDE" sorusunun tek bakista cevabi; alt satirlar "ne kadar kaldi, ne kadar okudu, nerede
 * birakti" diyor.
 */
export function SiteSectionTiles({
    sections,
    title,
    description,
    sectionLabel,
    labels,
    emptyText,
}: {
    sections: SiteSectionStat[];
    title: string;
    description: string;
    sectionLabel: (section: string) => string;
    labels: { views: string; sessions: string; dwell: string; scroll: string; exit: string; users: string; actions: string };
    emptyText: string;
}) {
    const maxShare = sections.reduce((peak, s) => Math.max(peak, s.share), 0) || 1;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {sections.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {sections.map((s) => {
                            const heat = 10 + Math.round((s.share / maxShare) * 60);
                            return (
                                <div
                                    key={s.section}
                                    className="rounded-xl border p-3 transition-colors"
                                    style={{
                                        background: `color-mix(in oklab, var(--mention) ${heat}%, var(--card))`,
                                        borderColor: `color-mix(in oklab, var(--mention) ${Math.min(80, heat + 20)}%, var(--border))`,
                                    }}
                                >
                                    <div className="flex items-baseline justify-between gap-2">
                                        <span className="truncate text-sm font-semibold">{sectionLabel(s.section)}</span>
                                        <span className="text-xs font-medium tabular-nums text-muted-foreground">{fmtPct(s.share)}</span>
                                    </div>
                                    <div className="mt-1 text-2xl font-bold tabular-nums">{fmtInt(s.pageViews)}</div>
                                    <div className="text-[11px] text-muted-foreground">{labels.views}</div>
                                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                                        <Stat label={labels.sessions} value={fmtInt(s.sessions)} />
                                        <Stat label={labels.users} value={fmtInt(s.registeredUsers)} />
                                        <Stat label={labels.dwell} value={fmtDuration(s.avgDwellSeconds)} />
                                        <Stat label={labels.scroll} value={fmtPct(s.avgScrollDepth)} />
                                        <Stat label={labels.exit} value={fmtPct(s.exitRate)} />
                                        <Stat label={labels.actions} value={fmtInt(s.actions)} />
                                    </dl>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <dt className="truncate text-muted-foreground">{label}</dt>
            <dd className="font-mono tabular-nums">{value}</dd>
        </div>
    );
}
