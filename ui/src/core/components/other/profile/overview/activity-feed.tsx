"use client";

import { useState } from "react";
import { Activity, ActivityType } from "@/models/activity/activity.model";
import { Star, List as ListIcon, UserPlus, Gamepad2, Calendar, ArrowDown } from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/tr";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { getImageUrl } from "@/core/lib/get-image-url";
import { Button } from "@/core/components/ui/button";

dayjs.extend(relativeTime);
dayjs.locale("tr");

interface ActivityFeedProps {
    activities: Activity[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
    const [visibleCount, setVisibleCount] = useState(5);

    if (!activities || activities.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground text-sm">
                Henüz bir aktivite yok.
            </div>
        );
    }

    const visibleActivities = activities.slice(0, visibleCount);
    const hasMore = visibleCount < activities.length;

    return (
        <div className="relative space-y-6 pb-0">
            {visibleActivities.map((activity) => (
                <div key={`${activity.type}-${activity.id}`} className="relative pl-6 border-l border-border/50 last:border-0 pb-0 last:pb-0 group">                    <div className="absolute -left-2.5 top-0 h-5 w-5 rounded-full border-4 border-background bg-muted-foreground/30 group-hover:bg-primary group-hover:scale-110 transition-all" />
                    <div className="flex flex-col gap-2">
                        <div className="text-sm text-muted-foreground">
                            <span className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded text-foreground mr-2">
                                {dayjs(activity.occurredAt).fromNow()}
                            </span>

                            {activity.type === ActivityType.Review && activity.reviewData && (
                                <span>
                                    <span className="font-semibold text-foreground">{activity.reviewData.game.name}</span> oyununu inceledi.
                                </span>
                            )}
                            {activity.type === ActivityType.ListCreated && activity.listData && (
                                <span>
                                    <span className="font-semibold text-foreground">{activity.listData.name}</span> listesini oluşturdu.
                                </span>
                            )}
                            {activity.type === ActivityType.FollowUser && activity.followData && (
                                <span>
                                    <span className="font-semibold text-foreground">@{activity.followData.username}</span> kullanıcısını takip etti.
                                </span>
                            )}
                        </div>

                        {activity.type === ActivityType.Review && activity.reviewData && (
                            <Link
                                href={`/games/${activity.reviewData.game.slug}#review-${activity.reviewData.reviewId}`}
                                className="flex gap-4 p-3 rounded-lg border bg-card/50 hover:bg-card hover:border-primary/30 transition-all group/card"
                            >
                                <div className="shrink-0 w-12 h-16 bg-muted rounded overflow-hidden relative">
                                    <img
                                        src={activity.reviewData.game.coverImage || undefined}
                                        className="w-full h-full object-cover"
                                        alt=""
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                        <span className="font-bold text-sm">{activity.reviewData.rating}/10</span>
                                    </div>
                                    <p className="text-sm text-foreground/80 line-clamp-2 italic">
                                        &quot;{activity.reviewData.contentSnippet}&quot;
                                    </p>
                                </div>
                            </Link>
                        )}

                        {activity.type === ActivityType.ListCreated && activity.listData && (
                            <Link
                                href={`/lists/${activity.listData.listId}`}
                                className="flex items-center gap-4 p-3 rounded-lg border bg-card/50 hover:bg-card hover:border-primary/30 transition-all"
                            >
                                <div className="shrink-0 h-12 w-12 bg-muted rounded flex items-center justify-center">
                                    <ListIcon className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm">{activity.listData.name}</h4>
                                    <p className="text-xs text-muted-foreground">{activity.listData.gameCount} Oyun</p>
                                </div>
                            </Link>
                        )}

                        {activity.type === ActivityType.FollowUser && activity.followData && (
                            <Link
                                href={`/profiles/${activity.followData.username}`}
                                className="flex items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card hover:border-primary/30 transition-all w-fit"
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={getImageUrl(activity.followData.profileImageUrl)} />
                                    <AvatarFallback>{activity.followData.username[0]}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-sm">@{activity.followData.username}</span>
                                <UserPlus className="h-4 w-4 text-muted-foreground ml-2" />
                            </Link>
                        )}
                    </div>
                </div>
            ))}

            {hasMore && (
                <>
                    <div className="absolute bottom-0 left-0 right-0 h-36 bg-linear-to-t from-background via-background/45 to-background/0 pointer-events-none z-10" />
                    <div className="relative z-20 flex flex-col items-center gap-3 pt-4 -mt-16 pb-2">
                        <span className="text-xs text-muted-foreground font-medium">
                            Daha Fazla Aktivite Göster ({activities.length - visibleCount} adet)
                        </span>
                        <button
                            onClick={() => setVisibleCount((prev) => prev + 5)}
                            className="group relative cursor-pointer outline-none"
                            aria-label="Daha fazla göster"
                        >
                            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                            <div className="relative w-5 h-5 rounded-full border-2 border-primary/40 hover:border-primary bg-background/80 backdrop-blur-sm flex items-center justify-center transition-all duration-300 animate-bounce hover:animate-none group-hover:shadow-lg group-hover:shadow-primary/25">
                                <ArrowDown className="h-3 w-3 text-primary" />
                            </div>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}