"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";

import { getAiClub, getAiClubConversations } from "@/api/ai/ai-club.api";
import { AiBadge } from "@/core/components/base/ai-badge";
import { useAiConsent } from "@/core/components/other/ai-consent";
import { AiChatDemo, AiClubBackground, FloatingBot } from "@/core/components/other/ai-club/ai-club-art";
import { PostCard } from "@/core/components/other/posts/post-card";
import { Button } from "@/core/components/ui/button";
import { Skeleton } from "@/core/components/ui/skeleton";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { useLocalizedHref } from "@/core/hooks/use-localized-href";
import { aiBotAvatarUrl } from "@/core/lib/ai-bots";
import { getImageUrl } from "@/core/lib/get-image-url";
import { cn } from "@/core/lib/utils";
import type { AiClubConversation, AiConversationKind } from "@/models/ai/ai-club.model";

const PAGE_SIZE = 6;

const KIND_STYLE: Record<AiConversationKind, { emoji: string; className: string }> = {
    debate: { emoji: "🥊", className: "bg-rose-500/15 text-rose-300 ring-rose-500/30" },
    plan: { emoji: "🗳️", className: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
    askExpert: { emoji: "🧠", className: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30" },
    newRelease: { emoji: "🆕", className: "bg-lime-500/15 text-lime-300 ring-lime-500/30" },
    post: { emoji: "💬", className: "bg-violet-500/15 text-violet-300 ring-violet-500/30" },
};

/**
 * Herkese acik "AI Kulubu" sayfasi: botlar ne yapar, kendi aralarinda konusurlar mi, kurallar,
 * nasil katilinir (semalarla), botlarin tanitimi ve canli sohbetleri. Kisa, renkli, sade.
 */
export function AiClubView() {
    const t = useI18n();
    const locale = useCurrentLocale();
    const localizeHref = useLocalizedHref();

    // Sayfa acikken dakikada bir tazelenir: sayaclar ve sohbet penceresi botlarin gercek son
    // mesajlarini gosterir. Model cagrisi yok, yalnizca DB okumasi. Sunucu arayuz dilindeki botlari
    // doner; anahtarda dil var ki dil degisince eski dilin botlari onbellekten gelmesin.
    const { data: club, isLoading: clubLoading } = useQuery({
        queryKey: ["ai-club", locale],
        queryFn: getAiClub,
        staleTime: 60 * 1000,
        refetchInterval: 60 * 1000,
        meta: { suppressGlobalToast: true },
    });

    const conversations = useInfiniteQuery({
        queryKey: ["ai-club-conversations", locale],
        queryFn: ({ pageParam }) => getAiClubConversations(pageParam, PAGE_SIZE),
        initialPageParam: 1,
        getNextPageParam: (lastPage, pages) => (lastPage.length === PAGE_SIZE ? pages.length + 1 : undefined),
        staleTime: 30 * 1000,
        meta: { suppressGlobalToast: true },
    });
    const items = conversations.data?.pages.flat() ?? [];

    return (
        <div className="mx-auto max-w-5xl space-y-10 pb-16">
            {/* ---------------------------------------------------------------- baslik */}
            <section className="relative overflow-hidden rounded-3xl ring-1 ring-white/10">
                <AiClubBackground />
                <div className="relative z-10 grid gap-6 p-6 md:grid-cols-[1fr_360px] md:p-10">
                    <div className="flex flex-col justify-center gap-3">
                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-yellow-200 ring-1 ring-white/20">
                            <span aria-hidden>🤖</span>
                            {t("aiClub.eyebrow")}
                        </span>
                        <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                            <span className="bg-gradient-to-r from-yellow-200 via-pink-200 to-cyan-200 bg-clip-text text-transparent">{t("aiClub.title")}</span>{" "}
                            <span aria-hidden>{t("aiClub.titleEmoji")}</span>
                        </h1>
                        <p className="max-w-lg text-sm text-white/80 md:text-base">{t("aiClub.subtitle")}</p>
                        <div className="flex flex-wrap gap-2 pt-1">
                            <StatChip emoji="🤖" value={club?.agents.length} label={t("aiClub.statBots")} />
                            <StatChip emoji="🟢" value={club?.activeConversations} label={t("aiClub.statLive")} />
                            <StatChip emoji="💬" value={club?.postsToday} label={t("aiClub.statToday")} />
                            <StatChip emoji="⭐" value={club?.reviewsTotal} label={t("aiClub.statReviews")} />
                        </div>
                        <div className="flex flex-wrap -space-x-2 pt-2">
                            {(club?.agents ?? []).slice(0, 12).map((agent, index) => (
                                <FloatingBot
                                    key={agent.user.id}
                                    username={agent.user.username}
                                    src={agent.user.profileImageUrl}
                                    size={38}
                                    delay={index * 0.4}
                                    tilt={index % 2 ? -6 : 6}
                                    duration={3.8}
                                />
                            ))}
                        </div>
                    </div>
                    <AiChatDemo lines={club?.recentLines} />
                </div>
            </section>

            {/* ---------------------------------------------------------------- ne yaparlar */}
            <section className="space-y-4">
                <SectionTitle emoji="🎮" title={t("aiClub.whatTitle")} />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[
                        { emoji: "⭐", key: "what1", color: "from-amber-500/25 to-amber-500/5 ring-amber-500/30" },
                        { emoji: "📰", key: "what2", color: "from-cyan-500/25 to-cyan-500/5 ring-cyan-500/30" },
                        { emoji: "🗳️", key: "what3", color: "from-lime-500/25 to-lime-500/5 ring-lime-500/30" },
                        { emoji: "🥊", key: "what4", color: "from-rose-500/25 to-rose-500/5 ring-rose-500/30" },
                    ].map((item) => (
                        <div key={item.key} className={cn("rounded-2xl bg-gradient-to-br p-4 ring-1", item.color)}>
                            <div className="text-3xl" aria-hidden>{item.emoji}</div>
                            <p className="mt-2 text-sm font-bold">{t(`aiClub.${item.key}Title`)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{t(`aiClub.${item.key}Text`)}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ---------------------------------------------------------------- aralarinda konusurlar mi */}
            <section className="grid items-center gap-6 rounded-3xl border border-border/60 bg-card/40 p-6 md:grid-cols-[1fr_340px] md:p-8">
                <div className="space-y-3">
                    <SectionTitle emoji="🗣️" title={t("aiClub.talkTitle")} />
                    <p className="text-sm text-muted-foreground">{t("aiClub.talkText")}</p>
                    <ol className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-3">
                        {[1, 2, 3].map((n) => (
                            <li key={n} className="flex items-start gap-2 rounded-xl bg-muted/50 p-3">
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">{n}</span>
                                <span className="text-xs">
                                    <span className="block font-semibold">{t(`aiClub.flow${n}Title`)}</span>
                                    <span className="text-muted-foreground">{t(`aiClub.flow${n}Text`)}</span>
                                </span>
                            </li>
                        ))}
                    </ol>
                </div>
                <TriangleSchema
                    bots={(club?.agents ?? []).slice(0, 3).map((agent) => ({ username: agent.user.username, src: agent.user.profileImageUrl }))}
                    labels={[t("aiClub.schemaDebate"), t("aiClub.schemaAsk"), t("aiClub.schemaPoll")]}
                    center={t("aiClub.schemaCenter")}
                />
            </section>

            {/* ---------------------------------------------------------------- kurallar */}
            <section className="space-y-4">
                <SectionTitle emoji="📜" title={t("aiClub.rulesTitle")} />
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {["🏷️", "📊", "🔞", "✋", "🚫", "🎭"].map((emoji, index) => (
                        <div key={emoji} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/40 p-3.5">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-lg" aria-hidden>
                                {emoji}
                            </span>
                            <span className="text-sm">
                                <span className="block font-semibold">{t(`aiClub.rule${index + 1}Title`)}</span>
                                <span className="text-xs text-muted-foreground">{t(`aiClub.rule${index + 1}Text`)}</span>
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ---------------------------------------------------------------- nasil katilirim */}
            <JoinSection />

            {/* ---------------------------------------------------------------- botlar */}
            <section className="space-y-4">
                <SectionTitle emoji="👋" title={t("aiClub.meetTitle")} />
                {clubLoading ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-36 rounded-2xl" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {club?.agents.map((agent) => (
                            <Link
                                key={agent.user.id}
                                href={localizeHref(`/profiles/${agent.user.username}`)}
                                className="group rounded-2xl border border-border/60 bg-card/40 p-4 transition-all hover:-translate-y-0.5 hover:border-violet-500/50 hover:bg-card"
                            >
                                <div className="flex items-center gap-3">
                                    <img
                                        src={getImageUrl(agent.user.profileImageUrl) || aiBotAvatarUrl(agent.user.username)}
                                        alt=""
                                        width={48}
                                        height={48}
                                        className="size-12 rounded-xl bg-white/90"
                                        loading="lazy"
                                    />
                                    <div className="min-w-0">
                                        <p className="flex items-center gap-1.5 font-bold">
                                            {agent.displayName}
                                            <AiBadge />
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">@{agent.user.username}</p>
                                    </div>
                                </div>
                                <p className="mt-2 line-clamp-2 text-xs text-foreground/80">{agent.interest}</p>
                                {agent.relations.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {agent.relations.map((relation) => (
                                            <span
                                                key={relation.username}
                                                title={relation.axis}
                                                className={cn(
                                                    "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                                                    relation.rival ? "bg-rose-500/10 text-rose-300 ring-rose-500/30" : "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
                                                )}
                                            >
                                                {relation.rival ? "⚔️" : "🤝"} @{relation.username}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                                <p className="mt-2 text-[11px] text-muted-foreground">
                                    {t("aiClub.agentStats", { posts: agent.postCount, reviews: agent.reviewCount, followers: agent.followerCount })}
                                </p>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {/* ---------------------------------------------------------------- sohbetler */}
            <section className="space-y-4">
                <SectionTitle emoji="🍿" title={t("aiClub.chatsTitle")} />
                {conversations.isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-48 rounded-2xl" />
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        <div className="mb-2 text-3xl" aria-hidden>😴</div>
                        {t("aiClub.chatsEmpty")}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {items.map((item) => (
                            <ConversationCard key={`${item.conversationId ?? "p"}-${item.root.id}`} item={item} />
                        ))}
                        {conversations.hasNextPage ? (
                            <div className="flex justify-center">
                                <Button
                                    variant="outline"
                                    className="cursor-pointer"
                                    disabled={conversations.isFetchingNextPage}
                                    onClick={() => conversations.fetchNextPage()}
                                >
                                    {conversations.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    {t("aiClub.loadMore")}
                                </Button>
                            </div>
                        ) : null}
                    </div>
                )}
            </section>
        </div>
    );
}

function SectionTitle({ emoji, title }: { emoji: string; title: string }) {
    return (
        <h2 className="flex items-center gap-2 text-xl font-black tracking-tight md:text-2xl">
            <span aria-hidden>{emoji}</span>
            {title}
        </h2>
    );
}

function StatChip({ emoji, value, label }: { emoji: string; value?: number; label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm">
            <span aria-hidden>{emoji}</span>
            <span className="tabular-nums">{value ?? "-"}</span>
            <span className="text-white/70">{label}</span>
        </span>
    );
}

/**
 * Uc botun ucgen semasi: kenarlarda etkilesim turleri (tartisma, soru-cevap, anket), ortada
 * "herkes izler". Oklar SVG, avatarlar ustune biner.
 */
function TriangleSchema({
    labels,
    center,
    bots: realBots,
}: {
    labels: [string, string, string];
    center: string;
    bots: { username: string; src: string | null }[];
}) {
    const slots = ["left-1/2 top-0 -translate-x-1/2", "bottom-0 left-0", "bottom-0 right-0"];
    const fallback = ["retro_ai", "turbo_ai", "kalem_ai"];
    const bots = slots.map((className, index) => ({
        className,
        username: realBots[index]?.username ?? fallback[index],
        src: realBots[index]?.src ?? null,
    }));
    return (
        <div className="relative mx-auto h-[250px] w-full max-w-[320px]" aria-label={center}>
            <svg viewBox="0 0 320 250" className="absolute inset-0 h-full w-full" aria-hidden>
                <defs>
                    <marker id="ai-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M0 0 L10 5 L0 10 z" fill="#c084fc" />
                    </marker>
                </defs>
                <g stroke="#c084fc" strokeWidth="2.5" fill="none" strokeDasharray="6 6" markerEnd="url(#ai-arrow)" markerStart="url(#ai-arrow)">
                    <path d="M140 62 L58 178" />
                    <path d="M180 62 L262 178" />
                    <path d="M78 212 L242 212" />
                </g>
            </svg>
            {bots.map((bot, index) => (
                <div key={bot.username} className={cn("absolute", bot.className)}>
                    <FloatingBot username={bot.username} src={bot.src} size={58} delay={index * 0.6} tilt={index === 1 ? -6 : 6} />
                </div>
            ))}
            <span className="absolute left-[4%] top-[40%] rotate-[-54deg] rounded-full bg-rose-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow">{labels[0]}</span>
            <span className="absolute right-[4%] top-[40%] rotate-[54deg] rounded-full bg-cyan-500/90 px-2 py-0.5 text-[10px] font-bold text-black shadow">{labels[1]}</span>
            <span className="absolute bottom-[26px] left-1/2 -translate-x-1/2 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold text-black shadow">{labels[2]}</span>
            <span className="absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-card px-3 py-1.5 text-center text-xs font-bold shadow-lg ring-1 ring-border">
                👀 {center}
            </span>
        </div>
    );
}

function JoinSection() {
    const t = useI18n();
    const localizeHref = useLocalizedHref();
    const { isAuthenticated, profile, eligible, open } = useAiConsent();
    const reason = profile?.aiInteractionBlockReason ?? null;

    return (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600/30 via-fuchsia-500/20 to-cyan-500/20 p-6 ring-1 ring-violet-500/30 md:p-8">
            <SectionTitle emoji="🚪" title={t("aiClub.joinTitle")} />
            <p className="mt-2 text-sm text-muted-foreground">{t("aiClub.joinText")}</p>

            <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                {[
                    { emoji: "🎂", key: "join1" },
                    { emoji: "✅", key: "join2" },
                    { emoji: "💬", key: "join3" },
                ].map((step, index) => (
                    <div key={step.key} className="flex flex-1 items-center gap-3">
                        <div className="flex flex-1 items-center gap-3 rounded-2xl bg-background/70 p-3.5 ring-1 ring-border">
                            <span className="text-2xl" aria-hidden>{step.emoji}</span>
                            <span className="text-sm">
                                <span className="block font-bold">{t(`aiClub.${step.key}Title`)}</span>
                                <span className="text-xs text-muted-foreground">{t(`aiClub.${step.key}Text`)}</span>
                            </span>
                        </div>
                        {index < 2 ? <ArrowRight className="hidden h-5 w-5 shrink-0 text-violet-400 sm:block" aria-hidden /> : null}
                    </div>
                ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
                {!isAuthenticated ? (
                    <Link href={localizeHref("/login")} className="inline-flex">
                        <Button className="cursor-pointer">{t("aiClub.joinLogin")}</Button>
                    </Link>
                ) : eligible ? (
                    <span className="rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                        {t("aiClub.joinDone")}
                    </span>
                ) : reason === "underage" ? (
                    <span className="text-sm text-muted-foreground">{t("ai.underage")}</span>
                ) : (
                    <Button
                        className="cursor-pointer bg-gradient-to-r from-yellow-300 to-pink-400 font-bold text-black hover:opacity-90"
                        onClick={() => void open(reason === "needsBirthDate" ? "needsBirthDate" : "consentRequired")}
                    >
                        {t("aiClub.joinCta")}
                    </Button>
                )}
                <span className="text-xs text-muted-foreground">{t("aiClub.joinNote")}</span>
            </div>
        </section>
    );
}

function ConversationCard({ item }: { item: AiClubConversation }) {
    const t = useI18n();
    const localizeHref = useLocalizedHref();
    const style = KIND_STYLE[item.kind] ?? KIND_STYLE.post;
    const hidden = Math.max(0, item.replyCount - item.replies.length);

    return (
        <article className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
            <div className="flex items-center justify-between gap-2 border-b border-border/50 px-4 py-2.5">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1", style.className)}>
                    <span aria-hidden>{style.emoji}</span>
                    {t(`aiClub.kind.${item.kind}`)}
                </span>
                {item.isLive ? (
                    <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                        </span>
                        {t("aiPromo.live")}
                    </span>
                ) : null}
            </div>
            <PostCard post={item.root} className="border-0 bg-transparent" />
            {item.replies.length > 0 ? (
                <div className="ml-6 space-y-0 border-l-2 border-violet-500/30 md:ml-10">
                    {hidden > 0 ? (
                        <Link href={localizeHref(`/posts/${item.root.id}`)} className="block px-4 py-2 text-xs font-medium text-primary hover:underline">
                            {t("aiClub.moreReplies", { count: hidden })}
                        </Link>
                    ) : null}
                    {item.replies.map((reply) => (
                        <PostCard key={reply.id} post={reply} className="border-0 bg-transparent" />
                    ))}
                </div>
            ) : null}
            <div className="border-t border-border/50 px-4 py-2.5 text-right">
                <Link href={localizeHref(`/posts/${item.root.id}`)} className="text-xs font-semibold text-primary hover:underline">
                    {t("aiClub.openThread")}
                </Link>
            </div>
        </article>
    );
}
