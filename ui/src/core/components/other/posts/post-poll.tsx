"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";

import { votePostPoll } from "@/api/post/post.api";
import { useI18n } from "@/core/contexts/locale-context";
import { cn } from "@/core/lib/utils";
import type { PostPoll as PostPollModel } from "@/models/post/post.model";

interface PostPollProps {
    postId: number;
    poll: PostPollModel;
    /** Anonim kullanici oy veremez; tiklayinca girise yonlendirmek cagirana kalir. */
    canVote: boolean;
}

/**
 * Anket. Sonuclar YALNIZCA oy verildikten sonra ya da anket kapandiktan sonra
 * gosterilir (X davranisi): erken gosterilen sonuc oyu yonlendirir.
 */
export function PostPoll({ postId, poll: initialPoll, canVote }: PostPollProps) {
    const t = useI18n();
    const [poll, setPoll] = useState(initialPoll);

    const { mutate, isPending } = useMutation({
        mutationFn: (optionId: number) => votePostPoll(postId, optionId),
        onSuccess: (updated) => setPoll(updated),
        onError: (error: Error) => toast.error(t("posts.poll.voteError"), { description: error.message }),
    });

    const hasVoted = poll.myOptionId != null;
    const showResults = hasVoted || poll.isClosed;

    const remaining = () => {
        if (poll.isClosed) return t("posts.poll.closed");

        const ms = new Date(poll.endsAt).getTime() - Date.now();
        if (ms <= 0) return t("posts.poll.closed");

        const hours = Math.floor(ms / 3_600_000);
        if (hours >= 24) return t("posts.poll.daysLeft", { count: Math.floor(hours / 24) });
        if (hours >= 1) return t("posts.poll.hoursLeft", { count: hours });
        return t("posts.poll.minutesLeft", { count: Math.max(1, Math.floor(ms / 60_000)) });
    };

    return (
        <div className="mt-3 space-y-1.5">
            {poll.options
                .slice()
                .sort((a, b) => a.position - b.position)
                .map((option) => {
                    const percent = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
                    const isMine = poll.myOptionId === option.id;

                    if (!showResults) {
                        return (
                            <button
                                key={option.id}
                                type="button"
                                disabled={!canVote || isPending}
                                onClick={() => mutate(option.id)}
                                className="w-full cursor-pointer rounded-lg border border-primary/40 px-3 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {option.text}
                            </button>
                        );
                    }

                    return (
                        <div
                            key={option.id}
                            className="relative overflow-hidden rounded-lg border border-border/50 px-3 py-2"
                        >
                            {/* Dolgu cubugu metnin ARKASINDA: yuzde degistikce metin kaymasin. */}
                            <div
                                className={cn(
                                    "absolute inset-y-0 left-0 transition-all duration-500",
                                    isMine ? "bg-primary/25" : "bg-muted",
                                )}
                                style={{ width: `${percent}%` }}
                                aria-hidden
                            />
                            <div className="relative flex items-center justify-between gap-2 text-sm">
                                <span className={cn("flex items-center gap-1.5", isMine && "font-semibold")}>
                                    {isMine ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                                    {option.text}
                                </span>
                                <span className="shrink-0 tabular-nums text-muted-foreground">{percent}%</span>
                            </div>
                        </div>
                    );
                })}

            <p className="pt-0.5 text-xs text-muted-foreground">
                {t("posts.poll.votes", { count: poll.totalVotes })} · {remaining()}
            </p>
        </div>
    );
}
