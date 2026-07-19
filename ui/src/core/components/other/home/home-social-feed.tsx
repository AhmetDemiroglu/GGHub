"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { enUS, tr } from "date-fns/locale";
import { getPersonalizedFeed } from "@/api/activity/activity.api";
import { Activity, ActivityActor, ActivityType } from "@/models/activity/activity.model";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";
import { enUSMessages } from "@/i18n/messages/en-US";
import { trMessages } from "@/i18n/messages/tr";
import { getImageUrl } from "@/core/lib/get-image-url";
import placeholderGame from "@/core/assets/placeholder.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { Skeleton } from "@/core/components/ui/skeleton";
import { MentionText } from "@/core/components/base/mention-text";
import { Activity as ActivityIcon, Flame, Heart, List, Loader2, MessageCircle, Star, UserPlus } from "lucide-react";

const FEED_PAGE_SIZE = 10;

/** Sekme sirasi mobildeki TAB_ORDER ile birebir. */
type TabKey = "reviews" | "lists" | "follows" | "all";

const TAB_TYPE: Record<TabKey, ActivityType | undefined> = {
    reviews: ActivityType.Review,
    lists: ActivityType.ListCreated,
    follows: ActivityType.FollowUser,
    all: undefined,
};

interface TabState {
    items: Activity[];
    hasMore: boolean;
    loading: boolean;
    loaded: boolean;
}

const emptyTab = (): TabState => ({ items: [], hasMore: true, loading: false, loaded: false });

interface HomeSocialFeedProps {
    initialActivities: Activity[];
    isAuthenticated: boolean;
}

export default function HomeSocialFeed({ initialActivities, isAuthenticated }: HomeSocialFeedProps) {
    const locale = useCurrentLocale();
    const t = useI18n();
    // Varsayılan sekme mobildeki TabbedActivityFeed ile aynı: İncelemeler.
    // Buradaki başlangıç değeri ile <Tabs defaultValue> BİRLİKTE değişmeli,
    // yoksa seçili sekme ile listelenen içerik birbirini tutmaz.
    const [activeTab, setActiveTab] = useState<TabKey>("reviews");
    // Her sekme KENDI sayfasini sunucudan ceker. Onceden tek bir karisik akis
    // cekilip istemcide filtreleniyordu; 10 kayitlik sayfaya kac inceleme
    // dustuyse "Incelemeler" sekmesi yalnizca onu gosterdigi icin web, mobile
    // gore neredeyse bos gorunuyordu. Mobildeki TabbedActivityFeed ile ayni model.
    const [feeds, setFeeds] = useState<Record<TabKey, TabState>>(() => ({
        reviews: emptyTab(),
        lists: emptyTab(),
        follows: emptyTab(),
        // Sunucudan gelen ilk akis zaten karisik: dogrudan "all" sekmesini besler.
        all: {
            items: initialActivities,
            hasMore: initialActivities.length >= FEED_PAGE_SIZE,
            loading: false,
            loaded: true,
        },
    }));
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    // loadTab closure'ının her render'da güncel listeyi görmesi için ref tutuyoruz.
    const feedsRef = useRef(feeds);
    feedsRef.current = feeds;

    useEffect(() => {
        setFeeds((current) => ({
            ...current,
            all: {
                items: initialActivities,
                hasMore: initialActivities.length >= FEED_PAGE_SIZE,
                loading: false,
                loaded: true,
            },
        }));
    }, [initialActivities]);

    const loadTab = useCallback(async (tab: TabKey, reset: boolean) => {
        const current = feedsRef.current[tab];
        if (current.loading) return;
        if (!reset && current.loaded && !current.hasMore) return;

        setFeeds((prev) => ({ ...prev, [tab]: { ...prev[tab], loading: true } }));

        try {
            // Sayfa içi sıralama skor bazlı olduğundan cursor son eleman değil,
            // eldeki en eski occurredAt olmalı; yoksa kayıt atlanır/yinelenir.
            const cursor = reset
                ? undefined
                : feedsRef.current[tab].items.reduce<string | undefined>(
                      (min, activity) => (min === undefined || activity.occurredAt < min ? activity.occurredAt : min),
                      undefined,
                  );

            const page = await getPersonalizedFeed(FEED_PAGE_SIZE, cursor, TAB_TYPE[tab]);

            setFeeds((prev) => {
                const base = reset ? [] : prev[tab].items;
                const seen = new Set(base.map(getActivityKey));
                const fresh = page.filter((activity) => !seen.has(getActivityKey(activity)));
                return {
                    ...prev,
                    [tab]: {
                        items: [...base, ...fresh],
                        // Tüm sayfa yinelenen geldiyse dur; aksi halde aynı sayfa
                        // tekrar tekrar çekilip observer döngüye girer.
                        hasMore: fresh.length > 0 && page.length >= FEED_PAGE_SIZE,
                        loading: false,
                        loaded: true,
                    },
                };
            });
        } catch {
            setFeeds((prev) => ({ ...prev, [tab]: { ...prev[tab], loading: false, loaded: true, hasMore: false } }));
        }
    }, []);

    // Açılışta önce varsayılan sekme (İncelemeler), ardından diğerleri arka
    // planda; sekme değişince içerik anında hazır olur. "all" zaten sunucudan
    // gelen ilk akışla dolu, tekrar çekilmez.
    useEffect(() => {
        if (!isAuthenticated) return;
        let cancelled = false;
        void (async () => {
            await loadTab("reviews", true);
            for (const tab of ["lists", "follows"] as TabKey[]) {
                if (cancelled) return;
                if (!feedsRef.current[tab].loaded) await loadTab(tab, true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, loadTab]);

    // Emniyet: ön yükleme başarısız olduysa sekmeye girildiğinde yükle.
    useEffect(() => {
        if (!isAuthenticated) return;
        const state = feedsRef.current[activeTab];
        if (!state.loaded && !state.loading) void loadTab(activeTab, true);
    }, [isAuthenticated, activeTab, loadTab]);

    // IntersectionObserver yalnızca kesişme DURUMU değişince tetiklenir. Yükleme
    // sonrası sentinel hâlâ görünürse yeni olay üretmez ve akış durur (desktop'ta
    // hiç, mobilde elle scroll gerektirir). Bu yüzden her append/yükleme bitişinde
    // observer'ı yeniden kurup kesişmeyi tekrar değerlendiriyoruz: sentinel görünür
    // kaldıkça yükleme kendiliğinden devam eder (X benzeri akışkan sonsuz scroll).
    const activeState = feeds[activeTab];

    useEffect(() => {
        if (!isAuthenticated || !activeState.hasMore || activeState.loading) return;
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    void loadTab(activeTab, false);
                }
            },
            { rootMargin: "600px 0px" },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [isAuthenticated, activeTab, activeState.hasMore, activeState.loading, activeState.items.length, loadTab]);

    if (!isAuthenticated) {
        return (
            <div className="space-y-4 rounded-xl border border-border/50 bg-card/30 px-6 py-16 text-center">
                <div className="mx-auto w-fit rounded-full bg-primary/10 p-4">
                    <ActivityIcon className="h-10 w-10 text-primary" />
                </div>
                <div>
                    <h3 className="text-xl font-bold">{t("home.joinTitle")}</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("home.joinDescription")}</p>
                </div>
                <Link
                    href={buildLocalizedPathname("/login", locale)}
                    className="mx-auto flex h-10 w-fit items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                    {t("home.joinCta")}
                </Link>
            </div>
        );
    }

    // Filtreleme artik SUNUCUDA; burada aktif sekmenin kendi listesi gosterilir.
    const visibleActivities = activeState.items;
    // İlk yükleme (henüz hiç veri yok) ile "sonu geldi" durumunu ayırmak için:
    // ilkinde iskelet, ikincisinde boş durum metni gösterilmeli.
    const isInitialLoading = activeState.loading && visibleActivities.length === 0;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ActivityIcon className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold tracking-tight">{t("home.activityTitle")}</h2>
                </div>
            </div>

            {/* Sekme sırası mobildeki TAB_ORDER ile birebir: reviews, lists, follows, all. */}
            <Tabs defaultValue="reviews" onValueChange={(value) => setActiveTab(value as TabKey)}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="reviews" className="gap-1 text-xs">
                        <Star className="h-3 w-3" /> {t("home.activityTabs.reviews")}
                    </TabsTrigger>
                    <TabsTrigger value="lists" className="gap-1 text-xs">
                        <List className="h-3 w-3" /> {t("home.activityTabs.lists")}
                    </TabsTrigger>
                    <TabsTrigger value="follows" className="gap-1 text-xs">
                        <UserPlus className="h-3 w-3" /> {t("home.activityTabs.follows")}
                    </TabsTrigger>
                    <TabsTrigger value="all" className="gap-1 text-xs">
                        <Flame className="h-3 w-3" /> {t("home.activityTabs.all")}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    <div className="space-y-3">
                        {isInitialLoading ? (
                            <div className="space-y-3">
                                <Skeleton className="h-28 rounded-xl" />
                                <Skeleton className="h-28 rounded-xl" />
                                <Skeleton className="h-28 rounded-xl" />
                            </div>
                        ) : visibleActivities.length > 0 ? (
                            visibleActivities.map((activity) => <FeedCard key={getActivityKey(activity)} activity={activity} locale={locale} />)
                        ) : (
                            <div className="py-12 text-center text-muted-foreground">
                                <ActivityIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
                                <p className="text-sm">{t("home.activityEmptyTitle")}</p>
                                <p className="mt-1 text-xs">{t("home.activityEmptyDescription")}</p>
                            </div>
                        )}

                        {activeState.loading && visibleActivities.length > 0 ? (
                            <div className="space-y-3">
                                <Skeleton className="h-28 rounded-xl" />
                                <Skeleton className="h-28 rounded-xl" />
                            </div>
                        ) : null}

                        {activeState.hasMore && visibleActivities.length > 0 ? (
                            <div ref={sentinelRef} className="flex h-10 items-center justify-center">
                                {activeState.loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
                            </div>
                        ) : null}

                        {!activeState.hasMore && visibleActivities.length > 0 ? (
                            <p className="py-4 text-center text-xs text-muted-foreground/70">{t("home.feedEnd")}</p>
                        ) : null}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function FeedCard({ activity, locale }: { activity: Activity; locale: "tr" | "en-US" }) {
    const timeAgo = formatDistanceToNow(new Date(activity.occurredAt), { addSuffix: true, locale: locale === "tr" ? tr : enUS });

    switch (activity.type) {
        case ActivityType.Review:
            return <ReviewCard activity={activity} timeAgo={timeAgo} locale={locale} />;
        case ActivityType.ListCreated:
            return <ListCard activity={activity} timeAgo={timeAgo} locale={locale} />;
        case ActivityType.FollowUser:
            return <FollowCard activity={activity} timeAgo={timeAgo} locale={locale} />;
        default:
            return null;
    }
}

/** Kart başlığı: aktör avatarı + kullanıcı adı + eylem + zaman. Aktör yoksa (eski API) ikon gösterilir. */
function CardHeader({
    actor,
    fallbackIcon,
    actionText,
    timeAgo,
    locale,
}: {
    actor: ActivityActor | null | undefined;
    fallbackIcon: React.ReactNode;
    actionText: string;
    timeAgo: string;
    locale: "tr" | "en-US";
}) {
    if (!actor) {
        return (
            <div className="flex items-start gap-3">
                {fallbackIcon}
                <div className="flex flex-wrap items-center gap-2 pt-1.5">
                    <span className="text-sm font-semibold">{actionText}</span>
                    <span className="text-xs text-muted-foreground">{timeAgo}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <Link href={buildLocalizedPathname(`/profiles/${actor.username}`, locale)} className="shrink-0">
                <Avatar className="h-9 w-9 border border-border transition-transform hover:scale-105">
                    <AvatarImage src={getImageUrl(actor.profileImageUrl) || ""} className="object-cover" />
                    <AvatarFallback className="text-xs">{actor.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
            </Link>
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <Link
                    href={buildLocalizedPathname(`/profiles/${actor.username}`, locale)}
                    className="max-w-[160px] truncate text-sm font-bold hover:text-primary hover:underline"
                >
                    {actor.username}
                </Link>
                <span className="text-sm text-muted-foreground">{actionText}</span>
                <span className="text-xs text-muted-foreground/70">· {timeAgo}</span>
            </div>
        </div>
    );
}

function ReviewCard({ activity, timeAgo, locale }: { activity: Activity; timeAgo: string; locale: "tr" | "en-US" }) {
    const review = activity.reviewData!;
    const text = locale === "tr" ? trMessages : enUSMessages;

    return (
        <div className="rounded-xl border border-border/50 bg-card/50 p-4 transition-colors hover:bg-card/80">
            <CardHeader
                actor={activity.actor}
                fallbackIcon={
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                        <Star className="h-4 w-4 text-blue-500" />
                    </div>
                }
                actionText={text.home.reviewShared}
                timeAgo={timeAgo}
                locale={locale}
            />
            <Link
                href={buildLocalizedPathname(`/games/${review.game.slug}`, locale)}
                className="mt-3 flex items-start gap-3 rounded-lg border border-transparent bg-background/60 p-2.5 transition-all hover:border-border/50 hover:bg-background"
            >
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md shadow-sm">
                    <Image src={getImageUrl(review.game.coverImage || review.game.backgroundImage) || placeholderGame.src} alt={review.game.name} fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{review.game.name}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5 rounded bg-yellow-500/10 px-1.5 py-0.5">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">{review.rating}</span>
                        </div>
                    </div>
                    {review.contentSnippet ? (
                        // Kart komple tıklanabilir; mention yalnızca boyanır, link DEĞİL.
                        <p className="mt-1.5 line-clamp-2 text-xs italic text-muted-foreground">
                            &quot;
                            <MentionText text={review.contentSnippet} linkify={false} />
                            &quot;
                        </p>
                    ) : null}
                </div>
            </Link>
            <div className="mt-2.5 flex items-center gap-5 pl-1 text-muted-foreground">
                <span className="flex items-center gap-1.5 text-xs">
                    <Heart className="h-3.5 w-3.5" />
                    {review.likeCount ?? 0}
                </span>
                <span className="flex items-center gap-1.5 text-xs">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {review.commentCount ?? 0}
                </span>
            </div>
        </div>
    );
}

function ListCard({ activity, timeAgo, locale }: { activity: Activity; timeAgo: string; locale: "tr" | "en-US" }) {
    const list = activity.listData!;
    const text = locale === "tr" ? trMessages : enUSMessages;

    return (
        <div className="rounded-xl border border-border/50 bg-card/50 p-4 transition-colors hover:bg-card/80">
            <CardHeader
                actor={activity.actor}
                fallbackIcon={
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                        <List className="h-4 w-4 text-amber-500" />
                    </div>
                }
                actionText={text.home.listCreated}
                timeAgo={timeAgo}
                locale={locale}
            />
            <Link
                href={buildLocalizedPathname(`/lists/${list.listId}`, locale)}
                className="group mt-3 block rounded-lg border border-transparent bg-background/60 p-2.5 transition-all hover:border-border/50 hover:bg-background"
            >
                <p className="text-sm font-bold transition-colors group-hover:text-primary">{list.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    {list.gameCount} {text.home.gamesSuffix}
                </p>
                {list.previewImages.length > 0 ? (
                    <div className="mt-2 flex gap-1">
                        {list.previewImages.slice(0, 4).map((image, index) => (
                            <div key={index} className="relative h-12 w-9 overflow-hidden rounded-md bg-muted shadow-sm">
                                {image ? <Image src={getImageUrl(image) || ""} alt="Game" fill className="object-cover" /> : null}
                            </div>
                        ))}
                    </div>
                ) : null}
            </Link>
        </div>
    );
}

function FollowCard({ activity, timeAgo, locale }: { activity: Activity; timeAgo: string; locale: "tr" | "en-US" }) {
    const follow = activity.followData!;
    const text = locale === "tr" ? trMessages : enUSMessages;

    return (
        <div className="rounded-xl border border-border/50 bg-card/50 p-4 transition-colors hover:bg-card/80">
            <CardHeader
                actor={activity.actor}
                fallbackIcon={
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                        <UserPlus className="h-4 w-4 text-emerald-500" />
                    </div>
                }
                actionText={text.home.startedFollowing}
                timeAgo={timeAgo}
                locale={locale}
            />
            <Link
                href={buildLocalizedPathname(`/profiles/${follow.username}`, locale)}
                className="mt-3 flex items-center gap-3 rounded-lg border border-transparent bg-background/60 p-2.5 transition-all hover:border-border/50 hover:bg-background"
            >
                <Avatar className="h-9 w-9 border border-border">
                    <AvatarImage src={getImageUrl(follow.profileImageUrl) || ""} className="object-cover" />
                    <AvatarFallback className="text-xs">{follow.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-sm font-semibold">{follow.username}</p>
                    <p className="text-xs text-muted-foreground">{text.home.viewProfile}</p>
                </div>
            </Link>
        </div>
    );
}

function getActivityKey(activity: Activity) {
    switch (activity.type) {
        case ActivityType.Review:
            return `review-${activity.reviewData?.reviewId ?? activity.id}-${activity.occurredAt}`;
        case ActivityType.ListCreated:
            return `list-${activity.listData?.listId ?? activity.id}-${activity.occurredAt}`;
        case ActivityType.FollowUser:
            return `follow-${activity.actor?.username ?? ""}-${activity.followData?.username?.trim() || "unknown"}-${activity.occurredAt}`;
        default:
            return `activity-${activity.type}-${activity.id}-${activity.occurredAt}`;
    }
}
