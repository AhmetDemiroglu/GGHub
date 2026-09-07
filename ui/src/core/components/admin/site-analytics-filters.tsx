"use client";

import { useState } from "react";
import { Card, CardContent } from "@/core/components/ui/card";
import { Label } from "@/core/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { Switch } from "@/core/components/ui/switch";
import { useI18n } from "@/core/contexts/locale-context";
import type { SiteAnalyticsFilter, SiteSegment } from "@/models/site-analytics/site-analytics.model";

function rangeFromDays(days: number): { startDate: string; endDate: string } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

export interface SiteFilterState {
    days: string;
    segment: SiteSegment;
    deviceType: string;
    platform: string;
    includeBots: boolean;
    includeInternal: boolean;
}

const DEFAULT_STATE: SiteFilterState = { days: "30", segment: "all", deviceType: "all", platform: "all", includeBots: false, includeInternal: false };

/** Iki analitik sayfasinin ortak filtre durumu; sorgu anahtari filtrenin TAMAMINI icerir. */
export function useSiteAnalyticsFilter(initial: Partial<SiteFilterState> = {}) {
    const [state, setState] = useState<SiteFilterState>({ ...DEFAULT_STATE, ...initial });
    const filter: SiteAnalyticsFilter = {
        ...rangeFromDays(Number(state.days)),
        segment: state.segment,
        deviceType: state.deviceType === "all" ? undefined : state.deviceType,
        platform: state.platform === "all" ? undefined : state.platform,
        includeBots: state.includeBots,
        includeInternal: state.includeInternal,
    };
    const key = [filter.startDate, filter.endDate, state.segment, state.deviceType, state.platform, state.includeBots, state.includeInternal];
    return { state, setState, filter, key };
}

export function SiteAnalyticsFilters({
    state,
    onChange,
    showPlatform = false,
    showBots = false,
}: {
    state: SiteFilterState;
    onChange: (next: SiteFilterState) => void;
    showPlatform?: boolean;
    showBots?: boolean;
}) {
    const t = useI18n();
    const patch = (p: Partial<SiteFilterState>) => onChange({ ...state, ...p });

    return (
        <Card>
            <CardContent className="flex flex-wrap items-end gap-4 pt-6">
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("admin.siteAnalytics.filterRange")}</Label>
                    <Select value={state.days} onValueChange={(v) => patch({ days: v })}>
                        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">{t("admin.siteAnalytics.today")}</SelectItem>
                            <SelectItem value="7">{t("admin.siteAnalytics.last7")}</SelectItem>
                            <SelectItem value="30">{t("admin.siteAnalytics.last30")}</SelectItem>
                            <SelectItem value="90">{t("admin.siteAnalytics.last90")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("admin.siteAnalytics.segment")}</Label>
                    <Select value={state.segment} onValueChange={(v) => patch({ segment: v as SiteSegment })}>
                        <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("admin.siteAnalytics.segmentAll")}</SelectItem>
                            <SelectItem value="registered">{t("admin.siteAnalytics.segmentRegistered")}</SelectItem>
                            <SelectItem value="anonymous">{t("admin.siteAnalytics.segmentAnonymous")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("admin.siteAnalytics.device")}</Label>
                    <Select value={state.deviceType} onValueChange={(v) => patch({ deviceType: v })}>
                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("admin.siteAnalytics.allDevices")}</SelectItem>
                            <SelectItem value="desktop">Desktop</SelectItem>
                            <SelectItem value="mobile">Mobile</SelectItem>
                            <SelectItem value="tablet">Tablet</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {showPlatform ? (
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t("admin.siteAnalytics.platform")}</Label>
                        <Select value={state.platform} onValueChange={(v) => patch({ platform: v })}>
                            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("admin.siteAnalytics.allPlatforms")}</SelectItem>
                                <SelectItem value="ios">iOS</SelectItem>
                                <SelectItem value="android">Android</SelectItem>
                                <SelectItem value="other">Desktop</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                ) : null}

                <div className="flex items-center gap-2 pb-2">
                    <Switch id="include-internal" checked={state.includeInternal} onCheckedChange={(v) => patch({ includeInternal: v })} />
                    <Label htmlFor="include-internal" className="text-sm">{t("admin.siteAnalytics.includeInternal")}</Label>
                </div>

                {showBots ? (
                    <div className="flex items-center gap-2 pb-2">
                        <Switch id="include-bots" checked={state.includeBots} onCheckedChange={(v) => patch({ includeBots: v })} />
                        <Label htmlFor="include-bots" className="text-sm">{t("admin.siteAnalytics.includeBots")}</Label>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}
