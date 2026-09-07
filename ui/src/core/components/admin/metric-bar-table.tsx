"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";

export interface MetricColumn<T> {
    key: string;
    label: string;
    /** Hucre icerigi. Varsayilan: sayi ise binlik ayracli. */
    render?: (row: T) => ReactNode;
    width?: string;
    muted?: boolean;
}

/**
 * Hucre ici barli, cok kolonlu siralama tablosu. Kirilim, rota, icerik, etkilesim tablolarinin
 * tamami bunu kullanir: her tablo icin ayri bir bilesen ya da recharts instance'i acmak yerine
 * tek desen. Bar, ilk metrigin (barValue) satirlar arasindaki oranini gosterir.
 */
export function MetricBarTable<T>({
    title,
    description,
    rows,
    getKey,
    getLabel,
    getBarValue,
    columns,
    emptyText,
    action,
    maxRows,
}: {
    title: string;
    description?: string;
    rows: T[];
    getKey: (row: T) => string;
    getLabel: (row: T) => ReactNode;
    getBarValue: (row: T) => number;
    columns: MetricColumn<T>[];
    emptyText: string;
    action?: ReactNode;
    maxRows?: number;
}) {
    const visible = maxRows ? rows.slice(0, maxRows) : rows;
    const max = visible.reduce((peak, row) => Math.max(peak, getBarValue(row)), 0) || 1;

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                    <CardTitle className="text-base">{title}</CardTitle>
                    {description ? <CardDescription>{description}</CardDescription> : null}
                </div>
                {action}
            </CardHeader>
            <CardContent>
                {visible.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
                ) : (
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3 border-b pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                            <span className="flex-1" />
                            {columns.map((col) => (
                                <span key={col.key} className="text-right" style={{ width: col.width ?? "4.5rem" }}>
                                    {col.label}
                                </span>
                            ))}
                        </div>
                        {visible.map((row) => (
                            <div key={getKey(row)} className="flex items-center gap-3 text-sm">
                                <div className="relative min-w-0 flex-1">
                                    <div
                                        aria-hidden
                                        className="absolute inset-y-0 left-0 rounded bg-mention/15"
                                        style={{ width: `${Math.round((getBarValue(row) / max) * 100)}%` }}
                                    />
                                    <div className="relative min-w-0 truncate px-1.5 py-1">{getLabel(row)}</div>
                                </div>
                                {columns.map((col) => (
                                    <span
                                        key={col.key}
                                        className={`text-right font-mono tabular-nums ${col.muted ? "text-muted-foreground" : ""}`}
                                        style={{ width: col.width ?? "4.5rem" }}
                                    >
                                        {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                                    </span>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export const fmtInt = (n: number | null | undefined) => (n ?? 0).toLocaleString();
export const fmtPct = (n: number | null | undefined) => `%${Math.round(n ?? 0)}`;
export const fmtDuration = (seconds: number | null | undefined) => {
    const s = Math.max(0, Math.round(seconds ?? 0));
    if (s < 60) return `${s} sn`;
    const m = Math.floor(s / 60);
    const rest = s % 60;
    if (m < 60) return rest ? `${m} dk ${rest} sn` : `${m} dk`;
    const h = Math.floor(m / 60);
    return `${h} sa ${m % 60} dk`;
};
