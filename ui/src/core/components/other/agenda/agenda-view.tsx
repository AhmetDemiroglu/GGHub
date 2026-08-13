"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Flame, Hourglass, Sparkles } from "lucide-react";
import { agendaApi } from "@/api/agenda/agenda.api";
import type { AgendaContent } from "@/models/agenda/agenda.model";
import type { Game } from "@/models/gaming/game.model";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { Skeleton } from "@/core/components/ui/skeleton";
import { Button } from "@/core/components/ui/button";
import { PlatformIcons } from "@/core/components/other/platform-icons";
import { IgdbLogo } from "@/core/components/other/igdb-logo";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";
import { getImageUrl } from "@/core/lib/get-image-url";

interface AgendaViewProps {
    initialContent: AgendaContent | null;
    initialYear: number;
    initialMonth: number;
}

type StatusFilter = "all" | "upcoming" | "released";

interface AgendaGame extends Game {
    isUpcoming: boolean;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

/** Kronolojik karışık liste: çıkanlar ve çıkacaklar tarih sırasıyla iç içe. */
const mixGames = (content: AgendaContent): AgendaGame[] => {
    const today = todayStr();
    const tag = (games: Game[]): AgendaGame[] =>
        games.map((game) => ({ ...game, isUpcoming: !!game.released && game.released > today }));
    return [...tag(content.released), ...tag(content.upcoming)].sort((a, b) =>
        (a.released ?? "").localeCompare(b.released ?? ""),
    );
};

const AgendaSkeleton = () => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-52 w-full rounded-2xl" />
            ))}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
                <Skeleton key={index} className="aspect-video w-full rounded-xl" />
            ))}
        </div>
    </div>
);

export const AgendaView = ({ initialContent, initialYear, initialMonth }: AgendaViewProps) => {
    const t = useI18n();
    const locale = useCurrentLocale();
    const [year, setYear] = useState(initialYear);
    // 0 = "Tüm Yıl" görünümü
    const [month, setMonth] = useState(initialMonth);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["agenda", year, month],
        queryFn: () => agendaApi.get(year, month),
        initialData: year === initialYear && month === initialMonth ? (initialContent ?? undefined) : undefined,
        staleTime: 10 * 60 * 1000,
        meta: { suppressGlobalToast: true },
    });

    const monthFormatter = new Intl.DateTimeFormat(locale, { month: "long" });
    const dayFormatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
    const fullDayFormatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", weekday: "long" });

    const years = Array.from({ length: 4 }, (_, index) => initialYear - 1 + index);
    const monthLabel = (m: number) => monthFormatter.format(new Date(Date.UTC(2026, m - 1, 15)));
    const formatDay = (dateStr: string) => {
        try {
            return dayFormatter.format(new Date(`${dateStr}T00:00:00`));
        } catch {
            return dateStr;
        }
    };

    const mixed = useMemo(() => (data ? mixGames(data) : []), [data]);

    // Vitrin backend'den popülerlik sırasıyla gelir (tarih sırası vitrini rastgele
    // indie oyunlarla dolduruyordu).
    const highlights = useMemo<AgendaGame[]>(() => {
        const today = todayStr();
        return (data?.highlights ?? []).map((game) => ({
            ...game,
            isUpcoming: !!game.released && game.released > today,
        }));
    }, [data]);

    const highlightIds = useMemo(() => new Set(highlights.map((g) => g.id)), [highlights]);

    const gridGames = useMemo(() => {
        const rest = mixed.filter((g) => !highlightIds.has(g.id));
        if (statusFilter === "upcoming") return rest.filter((g) => g.isUpcoming);
        if (statusFilter === "released") return rest.filter((g) => !g.isUpcoming);
        return rest;
    }, [mixed, highlightIds, statusFilter]);

    // Yıl görünümünde grid ay başlıklarıyla gruplanır.
    const gridByMonth = useMemo(() => {
        if (month !== 0) return null;
        const groups = new Map<string, AgendaGame[]>();
        for (const game of gridGames) {
            const key = game.released?.slice(0, 7) ?? "";
            const list = groups.get(key);
            if (list) list.push(game);
            else groups.set(key, [game]);
        }
        return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [gridGames, month]);

    const totalCount = data ? data.counts.released + data.counts.upcoming : 0;

    const tbaGames = useMemo<AgendaGame[]>(
        () => (data?.tba ?? []).map((game) => ({ ...game, isUpcoming: true })),
        [data],
    );

    const statusChip = (game: AgendaGame, size: "sm" | "md" = "sm") => {
        // Vitrin kartında tam tarih (gün + ay + gün adı), küçük kartta kısa tarih sığar.
        const label = !game.released
            ? t("common.tba")
            : size === "md"
              ? fullDayFormatter.format(new Date(`${game.released}T00:00:00`))
              : formatDay(game.released);

        return (
            <span
                className={`inline-flex items-center gap-1 rounded-full font-semibold ${
                    size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]"
                } ${game.isUpcoming ? "bg-amber-400/95 text-black" : "bg-emerald-400/95 text-black"}`}
            >
                <CalendarDays className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} />
                {label}
                {!game.isUpcoming && game.released ? <span className="opacity-70">· {t("agenda.statusReleased")}</span> : null}
            </span>
        );
    };

    const gameCard = (game: AgendaGame) => (
        <Link
            key={game.id}
            href={buildLocalizedPathname(`/games/${game.slug || game.rawgId}`, locale)}
            className="group relative block overflow-hidden rounded-xl bg-[#0b0d16] ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-16px_rgba(0,0,0,0.9)] hover:ring-white/25"
        >
            <div className="relative aspect-video overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={getImageUrl(game.backgroundImage) || "/assets/placeholder-game.jpg"}
                    alt={game.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute right-2 top-2 flex items-center gap-1">
                    {game.igdbRating ? (
                        <span className="flex items-center gap-1 rounded-md bg-indigo-500/90 px-1.5 py-0.5 text-[11px] font-bold text-white" title="IGDB">
                            <IgdbLogo className="h-2.5" />
                            {Math.round(game.igdbRating)}
                        </span>
                    ) : null}
                    {game.metacritic ? (
                        <span className="rounded-md bg-green-500/90 px-1.5 py-0.5 text-[11px] font-bold text-black" title="Metacritic">
                            {game.metacritic}
                        </span>
                    ) : null}
                </div>
                <div className="absolute inset-x-0 bottom-0 space-y-1.5 p-3">
                    <p className="line-clamp-1 text-sm font-bold text-white drop-shadow">{game.name}</p>
                    <div className="flex items-center justify-between gap-2">
                        {statusChip(game)}
                        {game.platforms?.length ? (
                            <span className="opacity-80">
                                <PlatformIcons platforms={game.platforms} />
                            </span>
                        ) : null}
                    </div>
                </div>
            </div>
        </Link>
    );

    const featuredCard = (game: AgendaGame) => (
        <Link
            key={game.id}
            href={buildLocalizedPathname(`/games/${game.slug || game.rawgId}`, locale)}
            className="group relative block h-52 overflow-hidden rounded-2xl ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1 hover:ring-white/30 md:h-56"
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={getImageUrl(game.backgroundImage) || "/assets/placeholder-game.jpg"}
                alt={game.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/10" />
            <div className="absolute inset-x-0 bottom-0 space-y-2 p-4">
                <div className="flex items-center gap-2">{statusChip(game, "md")}</div>
                <h3 className="line-clamp-2 text-xl font-black tracking-tight text-white drop-shadow-lg md:text-2xl">
                    {game.name}
                </h3>
                <div className="flex items-center gap-2.5">
                    {game.platforms?.length ? <PlatformIcons platforms={game.platforms} /> : null}
                    {game.genres?.slice(0, 2).map((genre) => (
                        <span key={genre.slug} className="rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-[10px] text-white/70 backdrop-blur-sm">
                            {genre.name}
                        </span>
                    ))}
                </div>
            </div>
        </Link>
    );

    const filterPills: Array<{ key: StatusFilter; label: string }> = [
        { key: "all", label: t("agenda.filterAll") },
        { key: "upcoming", label: t("agenda.upcomingShort") },
        { key: "released", label: t("agenda.releasedShort") },
    ];

    return (
        <div className="space-y-8">
            {/* Sinematik başlık bandı */}
            <div className="relative overflow-hidden rounded-2xl bg-[#080910] ring-1 ring-white/10">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-[#080910] to-rose-600/20" />
                <div
                    aria-hidden
                    className="absolute inset-0 opacity-[0.35]"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
                        backgroundSize: "56px 56px",
                        maskImage: "radial-gradient(ellipse 90% 70% at 30% 40%, black 30%, transparent 75%)",
                    }}
                />
                <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-24 right-1/4 h-80 w-80 rounded-full bg-rose-600/15 blur-3xl" />

                <div className="relative flex flex-col gap-5 p-6 md:flex-row md:items-end md:justify-between md:p-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-amber-300/90">
                            <CalendarDays className="h-5 w-5" />
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">GGHub</span>
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">{t("agenda.title")}</h1>
                        <p className="max-w-2xl text-sm text-white/60">{t("agenda.subtitle")}</p>
                        {data ? (
                            <div className="flex items-center gap-2 pt-1">
                                <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-300">
                                    {t("agenda.gamesCount", { count: data.counts.upcoming })} · {t("agenda.upcomingShort")}
                                </span>
                                <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                                    {t("agenda.gamesCount", { count: data.counts.released })} · {t("agenda.releasedShort")}
                                </span>
                            </div>
                        ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                        <Select value={String(month)} onValueChange={(value) => setMonth(Number(value))}>
                            <SelectTrigger className="w-[150px] cursor-pointer border-white/15 bg-black/40 text-white backdrop-blur-md" aria-label={t("agenda.month")}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0" className="cursor-pointer font-semibold">
                                    {t("agenda.allYear")}
                                </SelectItem>
                                {Array.from({ length: 12 }, (_, index) => index + 1).map((m) => (
                                    <SelectItem key={m} value={String(m)} className="cursor-pointer capitalize">
                                        {monthLabel(m)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
                            <SelectTrigger className="w-[110px] cursor-pointer border-white/15 bg-black/40 text-white backdrop-blur-md" aria-label={t("agenda.year")}>
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
            </div>

            {isLoading ? (
                <AgendaSkeleton />
            ) : isError || !data ? (
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed p-10 text-center">
                    <p className="text-sm text-muted-foreground">{t("agenda.loadError")}</p>
                    <Button variant="outline" className="cursor-pointer" onClick={() => refetch()}>
                        {t("gameDetail.retry")}
                    </Button>
                </div>
            ) : totalCount === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-12 text-center">
                    <CalendarDays className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t("agenda.emptyUpcoming")}</p>
                </div>
            ) : (
                <div className="space-y-10">
                    {/* Vitrin */}
                    {highlights.length > 0 ? (
                        <section className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Flame className="h-5 w-5 text-amber-400" />
                                <h2 className="text-xl font-bold text-foreground">{t("agenda.highlights")}</h2>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{highlights.map(featuredCard)}</div>
                        </section>
                    ) : null}

                    {/* Karışık takvim gridi */}
                    <section className="space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                <h2 className="text-xl font-bold text-foreground">
                                    {month === 0 ? String(year) : `${monthLabel(month)} ${year}`}
                                </h2>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {filterPills.map((pill) => (
                                    <button
                                        key={pill.key}
                                        type="button"
                                        onClick={() => setStatusFilter(pill.key)}
                                        className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                                            statusFilter === pill.key
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                                        }`}
                                    >
                                        {pill.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {gridGames.length === 0 ? (
                            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                                {statusFilter === "released" ? t("agenda.emptyReleased") : t("agenda.emptyUpcoming")}
                            </p>
                        ) : gridByMonth ? (
                            <div className="space-y-8">
                                {gridByMonth.map(([monthKey, games]) => (
                                    <div key={monthKey} className="space-y-3">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                            {monthKey ? monthLabel(Number(monthKey.slice(5, 7))) : t("common.tba")}
                                            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                                                {games.length}
                                            </span>
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                                            {games.map(gameCard)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                                {gridGames.map(gameCard)}
                            </div>
                        )}
                    </section>

                    {/* Tarihi açıklanmamış büyük beklenenler (yalnızca yıl görünümünde) */}
                    {tbaGames.length > 0 ? (
                        <section className="space-y-5">
                            <div className="flex items-center gap-2">
                                <Hourglass className="h-5 w-5 text-violet-400" />
                                <h2 className="text-xl font-bold text-foreground">{t("agenda.tbaTitle")}</h2>
                                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                                    {t("agenda.tbaHint")}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
                                {tbaGames.map(gameCard)}
                            </div>
                        </section>
                    ) : null}
                </div>
            )}
        </div>
    );
};
