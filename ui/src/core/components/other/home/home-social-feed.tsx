"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { enUS, tr } from "date-fns/locale";
import { Activity, ActivityType } from "@/models/activity/activity.model";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";
import { enUSMessages } from "@/i18n/messages/en-US";
import { trMessages } from "@/i18n/messages/tr";
import { getImageUrl } from "@/core/lib/get-image-url";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { Activity as ActivityIcon, Flame, List, Star, UserPlus } from "lucide-react";

interface HomeSocialFeedProps {
    activities: Activity[];
    isAuthenticated: boolean;
}

export default function HomeSocialFeed({ activities, isAuthenticated }: HomeSocialFeedProps) {
    const locale = useCurrentLocale();
    const t = useI18n();
    const [activeTab, setActiveTab] = useState("all");

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
                    className="mx-auto flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                    {t("home.joinCta")}
                </Link>
            </div>
        );
    }

    const filteredActivities =
        activeTab === "all"
            ? activities
            : activeTab === "reviews"
              ? activities.filter((activity) => activity.type === ActivityType.Review)
              : activeTab === "lists"
                ? activities.filter((activity) => activity.type === ActivityType.ListCreated)
                : activities.filter((activity) => activity.type === ActivityType.FollowUser);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ActivityIcon className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold tracking-tight">{t("home.activityTitle")}</h2>
                </div>
            </div>

            <Tabs defaultValue="all" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="all" className="gap-1 text-xs">
                        <Flame className="h-3 w-3" /> {t("home.activityTabs.all")}
                    </TabsTrigger>
                    <TabsTrigger value="reviews" className="gap-1 text-xs">
                        <Star className="h-3 w-3" /> {t("home.activityTabs.reviews")}
                    </TabsTrigger>
                    <TabsTrigger value="lists" className="gap-1 text-xs">
                        <List className="h-3 w-3" /> {t("home.activityTabs.lists")}
                    </TabsTrigger>
                    <TabsTrigger value="follows" className="gap-1 text-xs">
                        <UserPlus className="h-3 w-3" /> {t("home.activityTabs.follows")}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    <div className="space-y-3">
                        {filteredActivities.length > 0 ? (
                            filteredActivities.map((activity) => <FeedCard key={getActivityKey(activity)} activity={activity} locale={locale} />)
                        ) : (
                            <div className="py-12 text-center text-muted-foreground">
                                <ActivityIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
                                <p className="text-sm">{t("home.activityEmptyTitle")}</p>
                                <p className="mt-1 text-xs">{t("home.activityEmptyDescription")}</p>
                            </div>
                        )}
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

function ReviewCard({ activity, timeAgo, locale }: { activity: Activity; timeAgo: string; locale: "tr" | "en-US" }) {
    const review = activity.reviewData!;
    const text = locale === "tr" ? trMessages : enUSMessages;

    return (
        <div className="rounded-xl border border-border/50 bg-card/50 p-4 transition-colors hover:bg-card/80">
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                    <Star className="h-4 w-4 text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{text.home.reviewShared}</span>
                        <span className="text-xs text-muted-foreground">{timeAgo}</span>
                    </div>
                    <Link
                        href={buildLocalizedPathname(`/games/${review.game.slug}`, locale)}
                        className="mt-2 flex items-start gap-3 rounded-lg border border-transparent bg-background/60 p-2.5 transition-all hover:border-border/50 hover:bg-background"
                    >
                        <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md shadow-sm">
                            <Image src={getImageUrl(review.game.coverImage) || ""} alt={review.game.name} fill className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{review.game.name}</p>
                            <div className="mt-1 flex items-center gap-1.5">
                                <div className="flex items-center gap-0.5 rounded bg-yellow-500/10 px-1.5 py-0.5">
                                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                    <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">{review.rating}</span>
                                </div>
                            </div>
                            {review.contentSnippet ? <p className="mt-1.5 line-clamp-2 text-xs italic text-muted-foreground">"{review.contentSnippet}"</p> : null}
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}

function ListCard({ activity, timeAgo, locale }: { activity: Activity; timeAgo: string; locale: "tr" | "en-US" }) {
    const list = activity.listData!;
    const text = locale === "tr" ? trMessages : enUSMessages;

    return (
        <div className="rounded-xl border border-border/50 bg-card/50 p-4 transition-colors hover:bg-card/80">
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                    <List className="h-4 w-4 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{text.home.listCreated}</span>
                        <span className="text-xs text-muted-foreground">{timeAgo}</span>
                    </div>
                    <Link
                        href={buildLocalizedPathname(`/lists/${list.listId}`, locale)}
                        className="group mt-2 block rounded-lg border border-transparent bg-background/60 p-2.5 transition-all hover:border-border/50 hover:bg-background"
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
            </div>
        </div>
    );
}

function FollowCard({ activity, timeAgo, locale }: { activity: Activity; timeAgo: string; locale: "tr" | "en-US" }) {
    const follow = activity.followData!;
    const text = locale === "tr" ? trMessages : enUSMessages;

    return (
        <div className="rounded-xl border border-border/50 bg-card/50 p-4 transition-colors hover:bg-card/80">
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                    <UserPlus className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{text.home.startedFollowing}</span>
                        <span className="text-xs text-muted-foreground">{timeAgo}</span>
                    </div>
                    <Link
                        href={buildLocalizedPathname(`/profiles/${follow.username}`, locale)}
                        className="mt-2 flex items-center gap-3 rounded-lg border border-transparent bg-background/60 p-2.5 transition-all hover:border-border/50 hover:bg-background"
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
            </div>
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
            return `follow-${activity.followData?.username?.trim() || "unknown"}-${activity.occurredAt}`;
        default:
            return `activity-${activity.type}-${activity.id}-${activity.occurredAt}`;
    }
}
