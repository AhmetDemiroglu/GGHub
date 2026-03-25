"use client";

import { Gamepad2, List, Star, Users } from "lucide-react";
import { SiteStats } from "@/models/home/home.model";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";

interface HomeStatsBarProps {
    stats: SiteStats;
}

export default function HomeStatsBar({ stats }: HomeStatsBarProps) {
    const locale = useCurrentLocale();
    const t = useI18n();
    const items = [
        { icon: Gamepad2, label: t("home.stats.games"), value: stats.totalGames, color: "text-blue-400" },
        { icon: Users, label: t("home.stats.users"), value: stats.totalUsers, color: "text-green-400" },
        { icon: Star, label: t("home.stats.reviews"), value: stats.totalReviews, color: "text-yellow-400" },
        { icon: List, label: t("home.stats.lists"), value: stats.totalLists, color: "text-purple-400" },
    ];

    return (
        <div className="flex items-center justify-center gap-6 rounded-xl border border-border/50 bg-card/50 px-4 py-3 backdrop-blur-sm md:gap-10">
            {items.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                    <span className="text-sm font-bold text-foreground">{item.value.toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}</span>
                    <span className="hidden text-xs text-muted-foreground sm:inline">{item.label}</span>
                </div>
            ))}
        </div>
    );
}
