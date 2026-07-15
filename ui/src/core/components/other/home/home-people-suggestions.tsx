"use client";

import Link from "next/link";
import { useState } from "react";
import { Gamepad2, UserCheck, UserPlus, Users, X } from "lucide-react";
import { followUser, unfollowUser } from "@/api/social/social.api";
import { SuggestedUser } from "@/models/social/social.model";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";
import { getImageUrl } from "@/core/lib/get-image-url";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Button } from "@/core/components/ui/button";

interface HomePeopleSuggestionsProps {
    suggestions: SuggestedUser[];
}

export default function HomePeopleSuggestions({ suggestions }: HomePeopleSuggestionsProps) {
    const locale = useCurrentLocale();
    const t = useI18n();
    const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
    const [followState, setFollowState] = useState<Record<number, boolean>>({});
    const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

    const visible = suggestions.filter((user) => !dismissedIds.has(user.id));

    if (visible.length === 0) {
        return null;
    }

    const handleToggleFollow = async (user: SuggestedUser) => {
        if (pendingIds.has(user.id)) return;

        const isFollowing = followState[user.id] ?? false;
        // İyimser güncelleme: istek dönmeden arayüzü çevir, hata olursa geri al.
        setFollowState((current) => ({ ...current, [user.id]: !isFollowing }));
        setPendingIds((current) => new Set(current).add(user.id));

        try {
            if (isFollowing) {
                await unfollowUser(user.username);
            } else {
                await followUser(user.username);
            }
        } catch {
            setFollowState((current) => ({ ...current, [user.id]: isFollowing }));
        } finally {
            setPendingIds((current) => {
                const next = new Set(current);
                next.delete(user.id);
                return next;
            });
        }
    };

    const handleDismiss = (userId: number) => {
        setDismissedIds((current) => new Set(current).add(userId));
    };

    return (
        <section className="space-y-3">
            <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold tracking-tight">{t("home.pymk.title")}</h2>
            </div>

            <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
                {visible.map((user) => {
                    const isFollowing = followState[user.id] ?? false;
                    const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ");

                    return (
                        <div
                            key={user.id}
                            className="group relative flex w-[180px] shrink-0 snap-start flex-col items-center gap-2.5 rounded-xl border border-border/50 bg-card/50 p-4 pt-5 text-center transition-colors hover:border-border hover:bg-card/80"
                        >
                            <button
                                type="button"
                                aria-label={t("home.pymk.dismiss")}
                                onClick={() => handleDismiss(user.id)}
                                className="absolute right-2 top-2 cursor-pointer rounded-full p-1 text-muted-foreground/50 opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>

                            <Link href={buildLocalizedPathname(`/profiles/${user.username}`, locale)} className="flex flex-col items-center gap-2">
                                <Avatar className="h-16 w-16 border-2 border-border shadow-md transition-transform group-hover:scale-105">
                                    <AvatarImage src={getImageUrl(user.profileImageUrl) || ""} className="object-cover" />
                                    <AvatarFallback className="text-lg font-semibold">{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="max-w-[140px] truncate text-sm font-semibold">{displayName || user.username}</p>
                                    <p className="max-w-[140px] truncate text-xs text-muted-foreground">@{user.username}</p>
                                </div>
                            </Link>

                            <SuggestionReasonChip user={user} />

                            <Button
                                size="sm"
                                variant={isFollowing ? "outline" : "default"}
                                disabled={pendingIds.has(user.id)}
                                onClick={() => handleToggleFollow(user)}
                                className="h-8 w-full cursor-pointer gap-1.5 text-xs font-semibold"
                            >
                                {isFollowing ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                                {isFollowing ? t("home.pymk.following") : t("home.pymk.follow")}
                            </Button>
                        </div>
                    );
                })}
            </div>
        </section>
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
