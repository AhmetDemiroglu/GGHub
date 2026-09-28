"use client";

import Link from "next/link";
import { AiBadge } from "@/core/components/base/ai-badge";
import { useRef, useState } from "react";
import { Bot, ChevronLeft, ChevronRight, Gamepad2, UserCheck, UserPlus, Users, X } from "lucide-react";
import { followUser, unfollowUser } from "@/api/social/social.api";
import { SuggestedUser } from "@/models/social/social.model";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";
import { getImageUrl } from "@/core/lib/get-image-url";
import { cn } from "@/core/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Button } from "@/core/components/ui/button";
import { useAiConsent } from "@/core/components/other/ai-consent";

interface HomePeopleSuggestionsProps {
    suggestions: SuggestedUser[];
    /** Takip edilmeyen botlar (api/ai/club/suggestions). Takipleri AI rizasi ister. */
    agents?: SuggestedUser[];
}

/** Karisik seritte her iki kisiden sonra bir bot; artan botlar sona eklenir. */
function interleave(people: SuggestedUser[], bots: SuggestedUser[]) {
    const result: SuggestedUser[] = [];
    let b = 0;
    people.forEach((person, index) => {
        result.push(person);
        if (index % 2 === 1 && b < bots.length) result.push(bots[b++]);
    });
    return result.concat(bots.slice(b));
}

/**
 * "Tanıyor olabileceğin kişiler" + "Tanıyor olabileceğin botlar".
 * Geniş ekranda alan ikiye bölünür (solda insanlar, sağda botlar); dar ekranda iki yarım
 * sığmadığı için tek bir karışık şerit gösterilir, böylece akış aşağı itilmez.
 * Bot takibi AI rızası ister: rıza yoksa önce onay penceresi açılır.
 */
export default function HomePeopleSuggestions({ suggestions, agents = [] }: HomePeopleSuggestionsProps) {
    const locale = useCurrentLocale();
    const t = useI18n();
    const { ensure, eligible, profile } = useAiConsent();
    const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
    const [followState, setFollowState] = useState<Record<number, boolean>>({});
    const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

    const people = suggestions.filter((user) => !dismissedIds.has(user.id));
    const bots = agents.filter((user) => !dismissedIds.has(user.id));

    if (people.length === 0 && bots.length === 0) {
        return null;
    }

    const setPending = (id: number, on: boolean) =>
        setPendingIds((current) => {
            const next = new Set(current);
            if (on) next.add(id);
            else next.delete(id);
            return next;
        });

    const handleToggleFollow = async (user: SuggestedUser) => {
        if (pendingIds.has(user.id)) return;

        const isFollowing = followState[user.id] ?? false;

        if (user.isAiAgent && !isFollowing) {
            // Bot takibi rıza ister. İyimser güncelleme YOK: pencerede vazgeçilirse buton
            // "Takip ediliyor"a dönüp geri gelmesin. Profil henüz yüklenmediyse istek yine
            // gider; sunucu 403 ai_consent_required döner ve axios pencereyi açar.
            if (profile && !eligible && !(await ensure())) return;
            setPending(user.id, true);
            try {
                await followUser(user.username);
                setFollowState((current) => ({ ...current, [user.id]: true }));
            } catch {
                // Vazgeçildi ya da hata: buton olduğu gibi kalır.
            } finally {
                setPending(user.id, false);
            }
            return;
        }

        // İyimser güncelleme: istek dönmeden arayüzü çevir, hata olursa geri al.
        setFollowState((current) => ({ ...current, [user.id]: !isFollowing }));
        setPending(user.id, true);

        try {
            if (isFollowing) {
                await unfollowUser(user.username);
            } else {
                await followUser(user.username);
            }
        } catch {
            setFollowState((current) => ({ ...current, [user.id]: isFollowing }));
        } finally {
            setPending(user.id, false);
        }
    };

    const handleDismiss = (userId: number) => {
        setDismissedIds((current) => new Set(current).add(userId));
    };

    const renderCard = (user: SuggestedUser) => (
        <SuggestionCard
            key={user.id}
            user={user}
            href={buildLocalizedPathname(`/profiles/${user.username}`, locale)}
            isFollowing={followState[user.id] ?? false}
            isPending={pendingIds.has(user.id)}
            onToggleFollow={() => handleToggleFollow(user)}
            onDismiss={() => handleDismiss(user.id)}
        />
    );

    const clubHref = buildLocalizedPathname("/ai-bots", locale);
    const peopleTitle = (
        <>
            <Users className="h-5 w-5 shrink-0 text-primary" />
            <h2 className="truncate text-base font-bold tracking-tight sm:text-lg">{t("home.pymk.title")}</h2>
        </>
    );
    const botsTitle = (
        <>
            <Bot className="h-5 w-5 shrink-0 text-violet-500" />
            <h2 className="truncate text-base font-bold tracking-tight sm:text-lg">{t("home.pymk.botsTitle")}</h2>
        </>
    );
    const clubLink = (
        <Link
            href={clubHref}
            aria-label={t("home.pymk.botsLink")}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-xs font-semibold text-violet-600 transition-colors hover:bg-violet-500/20 dark:text-violet-300"
        >
            <Bot className="h-3.5 w-3.5" />
            {/* Dar ekranda yalnız ikon: başlık kesilmesin. */}
            <span className="hidden sm:inline">{t("home.pymk.botsLink")}</span>
            <ChevronRight className="h-3 w-3" />
        </Link>
    );

    // Tek tür varsa bölmeye gerek yok: tam genişlik tek şerit.
    if (people.length === 0 || bots.length === 0) {
        const onlyBots = people.length === 0;
        return (
            <section>
                <SuggestionRow title={onlyBots ? botsTitle : peopleTitle} action={onlyBots ? clubLink : undefined}>
                    {(onlyBots ? bots : people).map(renderCard)}
                </SuggestionRow>
            </section>
        );
    }

    return (
        <section>
            {/* Geniş ekran: iki yarım. */}
            <div className="hidden gap-4 lg:grid lg:grid-cols-2">
                <SuggestionRow title={peopleTitle} panelClassName="border-border/50 bg-card/20">
                    {people.map(renderCard)}
                </SuggestionRow>
                <SuggestionRow
                    title={botsTitle}
                    action={clubLink}
                    panelClassName="border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] via-fuchsia-500/[0.04] to-transparent"
                >
                    {bots.map(renderCard)}
                </SuggestionRow>
            </div>

            {/* Dar ekran: iki yarım sığmaz, kişiler ve botlar tek şeritte karışık. */}
            <div className="lg:hidden">
                <SuggestionRow title={peopleTitle} action={clubLink}>
                    {interleave(people, bots).map(renderCard)}
                </SuggestionRow>
            </div>
        </section>
    );
}

function SuggestionRow({
    title,
    action,
    panelClassName,
    children,
}: {
    title: React.ReactNode;
    action?: React.ReactNode;
    panelClassName?: string;
    children: React.ReactNode;
}) {
    const t = useI18n();
    const rowRef = useRef<HTMLDivElement>(null);
    const scroll = (direction: 1 | -1) => rowRef.current?.scrollBy({ left: direction * 200, behavior: "smooth" });

    return (
        <div className={cn("min-w-0 space-y-3", panelClassName && cn("rounded-2xl border p-3", panelClassName))}>
            <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">{title}</div>
                {action}
                <div className="hidden items-center gap-1 md:flex">
                    <button
                        type="button"
                        aria-label={t("home.pymk.scrollPrev")}
                        onClick={() => scroll(-1)}
                        className="cursor-pointer rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        aria-label={t("home.pymk.scrollNext")}
                        onClick={() => scroll(1)}
                        className="cursor-pointer rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
            <div ref={rowRef} className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
                {children}
            </div>
        </div>
    );
}

function SuggestionCard({
    user,
    href,
    isFollowing,
    isPending,
    onToggleFollow,
    onDismiss,
}: {
    user: SuggestedUser;
    href: string;
    isFollowing: boolean;
    isPending: boolean;
    onToggleFollow: () => void;
    onDismiss: () => void;
}) {
    const t = useI18n();
    const bot = !!user.isAiAgent;
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ");

    return (
        <div
            className={cn(
                "group relative flex w-[180px] shrink-0 snap-start flex-col items-center gap-2.5 rounded-xl border p-4 pt-5 text-center transition-colors",
                bot
                    ? "border-violet-500/30 bg-gradient-to-b from-violet-500/[0.12] via-fuchsia-500/[0.05] to-card/60 hover:border-violet-500/60"
                    : "border-border/50 bg-card/50 hover:border-border hover:bg-card/80"
            )}
        >
            <button
                type="button"
                aria-label={t("home.pymk.dismiss")}
                onClick={onDismiss}
                className="absolute right-2 top-2 cursor-pointer rounded-full p-1 text-muted-foreground/50 opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
            >
                <X className="h-3.5 w-3.5" />
            </button>

            <Link href={href} className="flex flex-col items-center gap-2">
                <Avatar
                    className={cn(
                        "h-16 w-16 border-2 shadow-md transition-transform group-hover:scale-105",
                        bot ? "border-violet-500/60" : "border-border"
                    )}
                >
                    <AvatarImage src={getImageUrl(user.profileImageUrl) || ""} className="object-cover" />
                    <AvatarFallback className="text-lg font-semibold">{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                    <p className="max-w-[140px] truncate text-sm font-semibold">
                        {displayName || user.username}
                        {bot && <AiBadge className="ml-1" />}
                    </p>
                    <p className="max-w-[140px] truncate text-xs text-muted-foreground">@{user.username}</p>
                </div>
            </Link>

            {bot && user.tagline ? (
                <p className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">{user.tagline}</p>
            ) : (
                <SuggestionReasonChip user={user} />
            )}

            <Button
                size="sm"
                variant={isFollowing ? "outline" : "default"}
                disabled={isPending}
                onClick={onToggleFollow}
                className={cn(
                    "mt-auto h-8 w-full cursor-pointer gap-1.5 text-xs font-semibold",
                    bot && !isFollowing && "border-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90"
                )}
            >
                {isFollowing ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                {isFollowing ? t("home.pymk.following") : t("home.pymk.follow")}
            </Button>
        </div>
    );
}

function SuggestionReasonChip({ user }: { user: SuggestedUser }) {
    const t = useI18n();

    if (user.followsYou) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <UserCheck className="h-3 w-3" />
                {t("home.pymk.followsYou")}
            </span>
        );
    }

    if (user.reason === "mutual" && user.mutualFollowerCount > 0) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                <Users className="h-3 w-3" />
                {t("home.pymk.mutual", { count: user.mutualFollowerCount })}
            </span>
        );
    }

    if (user.reason === "taste" && user.sharedGameCount > 0) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <Gamepad2 className="h-3 w-3" />
                {t("home.pymk.taste", { count: user.sharedGameCount })}
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {t("home.pymk.popular")}
        </span>
    );
}
