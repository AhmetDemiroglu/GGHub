"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { DownloadAnalyticsFunnel } from "@/models/download-analytics/download-analytics.model";

interface FunnelRow {
    label: string;
    value: number;
    accent?: boolean;
}

/**
 * Sayfanın en değerli görseli, ama BİLEREK recharts kullanmıyor: gerçek bir
 * funnel chart mobilde kötü okunur ve burada ek bilgi vermez. Yüzdeye göre
 * genişleyen basit barlar hem daha okunur hem sıfır bağımlılık.
 */
export function DownloadFunnelCard({
    funnel,
    title,
    description,
    labels,
}: {
    funnel: DownloadAnalyticsFunnel;
    title: string;
    description: string;
    labels: {
        visits: string;
        eligible: string;
        reached: string;
        cancelled: string;
        manual: string;
        web: string;
        noAction: string;
    };
}) {
    const rows: FunnelRow[] = [
        { label: labels.visits, value: funnel.visits },
        { label: labels.eligible, value: funnel.autoRedirectEligible },
        { label: labels.reached, value: funnel.reachedStore, accent: true },
        { label: labels.manual, value: funnel.manualStoreClick },
        { label: labels.cancelled, value: funnel.cancelled },
        { label: labels.web, value: funnel.webVersion },
        { label: labels.noAction, value: funnel.noAction },
    ];

    // Yüzdeler ilk adıma (toplam ziyaret) göre; sıfıra bölmeye karşı korumalı.
    const base = funnel.visits || 1;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {rows.map((row) => {
                    const percent = Math.min(100, Math.round((row.value / base) * 100));
                    return (
                        <div key={row.label} className="space-y-1">
                            <div className="flex items-baseline justify-between gap-3 text-sm">
                                <span className="text-muted-foreground">{row.label}</span>
                                <span className="font-mono tabular-nums">
                                    <span className="font-semibold">{row.value.toLocaleString()}</span>
                                    <span className="ml-2 text-xs text-muted-foreground">{percent}%</span>
                                </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className={`h-full rounded-full ${row.accent ? "bg-mention" : "bg-muted-foreground/40"}`}
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
