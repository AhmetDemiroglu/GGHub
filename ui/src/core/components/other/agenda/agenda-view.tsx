"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, Sparkles } from "lucide-react";
import { agendaApi } from "@/api/agenda/agenda.api";
import type { AgendaContent } from "@/models/agenda/agenda.model";
import type { Game } from "@/models/gaming/game.model";
import { ListGameCard } from "@/core/components/other/game-card/list-game-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { Skeleton } from "@/core/components/ui/skeleton";
import { Button } from "@/core/components/ui/button";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";

interface AgendaViewProps {
    initialContent: AgendaContent | null;
    initialYear: number;
    initialMonth: number;
}

/** Aynı gün çıkan oyunları tek başlık altında toplar; sıralama API'den geldiği gibi korunur. */
const groupByDate = (games: Game[]): Array<[string, Game[]]> => {
    const groups = new Map<string, Game[]>();
    for (const game of games) {
        const key = game.released ?? "";
        const list = groups.get(key);
        if (list) list.push(game);
        else groups.set(key, [game]);
    }
    return Array.from(groups.entries());
};

const AgendaSkeleton = () => (
    <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-lg" />
        ))}
    </div>
);

export const AgendaView = ({ initialContent, initialYear, initialMonth }: AgendaViewProps) => {
    const t = useI18n();
    const locale = useCurrentLocale();
    const [year, setYear] = useState(initialYear);
    const [month, setMonth] = useState(initialMonth);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["agenda", year, month],
        queryFn: () => agendaApi.get(year, month),
        initialData: year === initialYear && month === initialMonth ? (initialContent ?? undefined) : undefined,
        staleTime: 15 * 60 * 1000,
        meta: { suppressGlobalToast: true },
    });

    const monthFormatter = new Intl.DateTimeFormat(locale, { month: "long" });
    const dayFormatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", weekday: "long" });

    // Geriye 1 yıl, ileriye 2 yıl: gündem sayfasının doğal penceresi.
    const years = Array.from({ length: 4 }, (_, index) => initialYear - 1 + index);
    const months = Array.from({ length: 12 }, (_, index) => index + 1);

    const monthLabel = (m: number) => monthFormatter.format(new Date(Date.UTC(2026, m - 1, 15)));
    const formatDay = (dateStr: string) => {
        try {
            return dayFormatter.format(new Date(`${dateStr}T00:00:00`));
        } catch {
            return dateStr;
        }
    };

    const renderSection = (
        icon: React.ReactNode,
        title: string,
        games: Game[],
        totalCount: number,
        emptyText: string,
    ) => (
        <section className="space-y-5">
            <div className="flex items-center gap-2.5">
                {icon}
                <h2 className="text-xl font-bold text-foreground">{title}</h2>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                    {t("agenda.gamesCount", { count: totalCount })}
                </span>
            </div>

            {games.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{emptyText}</p>
            ) : (
                <div className="space-y-6">
                    {groupByDate(games).map(([date, dayGames]) => (
                        <div key={date} className="space-y-3">
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                {date ? formatDay(date) : t("common.tba")}
                            </h3>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {dayGames.map((game) => (
                                    <ListGameCard key={game.id} game={game} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );

    return (
        <div className="space-y-8">
            {/* Başlık + ay/yıl seçiciler */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                        <CalendarDays className="h-7 w-7 text-primary" />
                        <h1 className="text-3xl font-black tracking-tight text-foreground">{t("agenda.title")}</h1>
                    </div>
                    <p className="max-w-2xl text-sm text-muted-foreground">{t("agenda.subtitle")}</p>
                </div>

                <div className="flex items-center gap-2">
                    <Select value={String(month)} onValueChange={(value) => setMonth(Number(value))}>
                        <SelectTrigger className="w-[150px] cursor-pointer" aria-label={t("agenda.month")}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map((m) => (
                                <SelectItem key={m} value={String(m)} className="cursor-pointer capitalize">
                                    {monthLabel(m)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
                        <SelectTrigger className="w-[110px] cursor-pointer" aria-label={t("agenda.year")}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((y) => (
                                <SelectItem key={y} value={String(y)} className="cursor-pointer tabular-nums">
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {isLoading ? (
                <AgendaSkeleton />
            ) : isError || !data ? (
                <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-10 text-center">
                    <p className="text-sm text-muted-foreground">{t("agenda.loadError")}</p>
                    <Button variant="outline" className="cursor-pointer" onClick={() => refetch()}>
                        {t("gameDetail.retry")}
                    </Button>
                </div>
            ) : (
                <div className="space-y-12">
                    {renderSection(
                        <Sparkles className="h-5 w-5 text-primary" />,
                        t("agenda.upcoming"),
                        data.upcoming,
                        data.counts.upcoming,
                        t("agenda.emptyUpcoming"),
                    )}
                    {renderSection(
                        <Clock className="h-5 w-5 text-primary" />,
                        t("agenda.releasedThisMonth"),
                        data.released,
                        data.counts.released,
                        t("agenda.emptyReleased"),
                    )}
                </div>
            )}
        </div>
    );
};
