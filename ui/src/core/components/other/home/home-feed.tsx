"use client";

import Link from "next/link";
import Image from "next/image";
import { Activity, ActivityType } from "@/models/activity/activity.model";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { ScrollArea } from "@/core/components/ui/scroll-area";
import { Star, List, UserPlus, Activity as ActivityIcon } from "lucide-react";
import { getImageUrl } from "@/core/lib/get-image-url";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface HomeFeedProps {
    activities: Activity[];
    isAuthenticated: boolean;
}

export default function HomeFeed({ activities, isAuthenticated }: HomeFeedProps) {
    if (!isAuthenticated) {
        return (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="p-3 bg-primary/10 rounded-full">
                    <ActivityIcon className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h3 className="font-bold text-lg">Topluluğa Katıl</h3>
                    <p className="text-sm text-muted-foreground mt-1">Arkadaşlarını takip et, aktivitelerini kaçırma ve oyun dünyasının nabzını tut.</p>
                </div>
                <Link href="/auth/login" className="w-full">
                    <div className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md flex items-center justify-center text-sm font-medium transition-colors">
                        Giriş Yap
                    </div>
                </Link>
            </Card>
        );
    }

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ActivityIcon className="w-4 h-4 text-primary" />
                    Aktivite Akışı
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="flex flex-col">
                        {activities.length > 0 ? activities.map((activity) => (
                            <div key={getActivityKey(activity)} className="p-4 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                                {renderActivityItem(activity)}
                            </div>
                        )) : (
                            <div className="p-8 text-center text-muted-foreground text-sm">
                                <p>Henüz bir aktivite yok.</p>
                                <p className="text-xs mt-1">Takip ettiğin kişilerin hareketleri burada görünür.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

function getActivityKey(activity: Activity) {
    switch (activity.type) {
        case ActivityType.Review:
            return `review-${activity.reviewData?.reviewId ?? activity.reviewData?.game?.slug ?? activity.id}-${activity.occurredAt}`;

        case ActivityType.ListCreated:
            return `list-${activity.listData?.listId ?? activity.id}-${activity.occurredAt}`;

        case ActivityType.FollowUser: {
            const u = activity.followData?.username?.trim() || "unknown";
            return `follow-${u}-${activity.occurredAt}`;
        }

        default:
            return `activity-${activity.type}-${activity.id}-${activity.occurredAt}`;
    }
}

function renderActivityItem(activity: Activity) {
    const timeAgo = formatDistanceToNow(new Date(activity.occurredAt), { addSuffix: true, locale: tr });

    switch (activity.type) {
        case ActivityType.Review:
            const review = activity.reviewData!;
            return (
                <div className="flex gap-3">
                    <div className="mt-1">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Star className="w-4 h-4 text-blue-500" />
                        </div>
                    </div>
                    <div className="flex-1 space-y-1">
                        <p className="text-sm">
                            <span className="font-semibold text-foreground">Bir inceleme paylaştı</span>
                            <span className="text-muted-foreground mx-1">•</span>
                            <span className="text-xs text-muted-foreground">{timeAgo}</span>
                        </p>
                        <Link href={`/games/${review.game.slug}`} className="flex items-start gap-3 bg-background/50 p-2 rounded-md hover:bg-background transition-colors border border-transparent hover:border-border">
                            <div className="relative w-10 h-14 shrink-0 rounded overflow-hidden">
                                <Image src={getImageUrl(review.game.coverImage) || ""} alt={review.game.name} fill className="object-cover" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold truncate">{review.game.name}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                    <span className="text-xs font-bold">{review.rating}</span>
                                </div>
                                {review.contentSnippet && <p className="text-xs text-muted-foreground line-clamp-1 mt-1">"{review.contentSnippet}"</p>}
                            </div>
                        </Link>
                    </div>
                </div>
            );

        case ActivityType.ListCreated:
            const list = activity.listData!;
            return (
                <div className="flex gap-3">
                    <div className="mt-1">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                            <List className="w-4 h-4 text-amber-500" />
                        </div>
                    </div>
                    <div className="flex-1 space-y-1">
                        <p className="text-sm">
                            <span className="font-semibold text-foreground">Yeni liste oluşturdu</span>
                            <span className="text-muted-foreground mx-1">•</span>
                            <span className="text-xs text-muted-foreground">{timeAgo}</span>
                        </p>
                        <Link href={`/lists/${list.listId}`} className="group block">
                            <div className="bg-background/50 p-2 rounded-md hover:bg-background transition-colors border border-transparent hover:border-border">
                                <p className="text-sm font-bold group-hover:text-primary transition-colors">{list.name}</p>
                                <p className="text-xs text-muted-foreground mb-2">{list.gameCount} oyun</p>
                                <div className="flex gap-1">
                                    {list.previewImages.slice(0, 3).map((img, i) => (
                                        <div key={i} className="relative w-8 h-10 rounded overflow-hidden bg-muted">
                                            {img && <Image src={getImageUrl(img) || ""} alt="Game" fill className="object-cover" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            );

        case ActivityType.FollowUser:
            const follow = activity.followData!;
            return (
                <div className="flex gap-3">
                    <div className="mt-1">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <UserPlus className="w-4 h-4 text-emerald-500" />
                        </div>
                    </div>
                    <div className="flex-1 space-y-1">
                        <p className="text-sm">
                            <span className="font-semibold text-foreground">Takip etti</span>
                            <span className="text-muted-foreground mx-1">•</span>
                            <span className="text-xs text-muted-foreground">{timeAgo}</span>
                        </p>
                        <Link href={`/profiles/${follow.username}`} className="flex items-center gap-3 bg-background/50 p-2 rounded-md hover:bg-background transition-colors border border-transparent hover:border-border">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={getImageUrl(follow.profileImageUrl) || ""} className="object-cover" />
                                <AvatarFallback>{follow.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-semibold">{follow.username}</p>
                                <p className="text-xs text-muted-foreground">Profilini görüntüle</p>
                            </div>
                        </Link>
                    </div>
                </div>
            );

        default:
            return null;
    }
}