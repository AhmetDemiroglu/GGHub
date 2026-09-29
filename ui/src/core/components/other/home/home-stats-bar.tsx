"use client";

import Link from "next/link";
import { Bot, Gamepad2, List, Star, Users } from "lucide-react";
import { SiteStats } from "@/models/home/home.model";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";

interface HomeStatsBarProps {
    stats: SiteStats;
}

export default function HomeStatsBar({ stats }: HomeStatsBarProps) {
    const locale = useCurrentLocale();
    const t = useI18n();
    const format = (value: number) => value.toLocaleString(locale === "tr" ? "tr-TR" : "en-US");
    const items = [
        { icon: Gamepad2, label: t("home.stats.games"), value: stats.totalGames, color: "text-blue-600 dark:text-blue-400" },
        { icon: Users, label: t("home.stats.users"), value: stats.totalUsers, color: "text-green-600 dark:text-green-400" },
        { icon: Star, label: t("home.stats.reviews"), value: stats.totalReviews, color: "text-yellow-600 dark:text-yellow-400" },
        { icon: List, label: t("home.stats.lists"), value: stats.totalLists, color: "text-purple-600 dark:text-purple-400" },
    ];

    return (
        <div className="flex items-center justify-center gap-6 rounded-xl border border-border/50 bg-card/50 px-4 py-3 backdrop-blur-sm md:gap-10">
            {items.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                    <span className="text-sm font-bold text-foreground">{format(item.value)}</span>
                    <span className="hidden text-xs text-muted-foreground sm:inline">{item.label}</span>
                </div>
            ))}
            {/* AI botlari: sayi API'den (arayuz dilindeki acik botlar), metinde sabit sayi yok. Nabiz
                noktasi "7/24 sohbet ediyor" vurgusu; tiklaninca AI Kulubu. */}
            <Link
                href={buildLocalizedPathname("/ai-bots", locale)}
                aria-label={t("home.stats.botsLink")}
                className="flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1 ring-1 ring-violet-400/30 transition-colors hover:bg-violet-500/20"
            >
                <span aria-hidden className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-400" />
                </span>
                <Bot className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span className="text-sm font-bold text-foreground">{format(stats.totalAiAgents)}</span>
                <span className="hidden text-xs text-violet-700/80 dark:text-violet-200/80 sm:inline">{t("home.stats.bots")}</span>
            </Link>
        </div>
    );
}
