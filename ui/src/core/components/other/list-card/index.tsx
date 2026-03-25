"use client";

import { ListCategory, ListVisibilitySetting } from "@/models/list/list.model";
import { useI18n } from "@/core/contexts/locale-context";
import { Badge } from "@core/components/ui/badge";
import { Separator } from "@core/components/ui/separator";
import { Globe, Lock, Users, Tag, Star, List as ListIcon, Users as FollowersIcon } from "lucide-react";
import React from "react";
import placeHolder2 from "@core/assets/placeholder2.png";

interface ListCardData {
    id: number;
    name: string;
    description?: string;
    visibility: ListVisibilitySetting;
    category: ListCategory;
    averageRating: number;
    ratingCount: number;
    gameCount: number;
    followerCount: number;
    firstGameImageUrls: (string | null)[];
    owner?: {
        id: number;
        username: string;
        profileImageUrl?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        isFollowing?: boolean;
    };
}

const VisibilityInfo: React.FC<{
    visibility: ListVisibilitySetting;
    isCollapsed: boolean;
    t: (key: string) => string;
}> = ({ visibility, isCollapsed, t }) => {
    switch (visibility) {
        case ListVisibilitySetting.Public:
            return (
                <Badge variant="outline" className="border-green-500 text-green-500">
                    <Globe className="mr-1 h-3 w-3" />
                    {!isCollapsed && t("lists.public")}
                </Badge>
            );
        case ListVisibilitySetting.Followers:
            return (
                <Badge variant="outline" className="border-blue-500 text-blue-500">
                    <Users className="mr-1 h-3 w-3" />
                    {!isCollapsed && t("lists.followers")}
                </Badge>
            );
        case ListVisibilitySetting.Private:
        default:
            return (
                <Badge variant="outline" className="border-red-500 text-red-500">
                    <Lock className="mr-1 h-3 w-3" />
                    {!isCollapsed && t("lists.private")}
                </Badge>
            );
    }
};

const getCategoryLabel = (category: ListCategory, t: (key: string) => string): string => {
    const label = ListCategory[category];

    if (!label || label === "Other") {
        return t("lists.other");
    }

    return t(`lists.categories.${label.toLowerCase()}`);
};

interface ListCardProps {
    list: ListCardData;
    footer?: React.ReactNode;
}

export function ListCard({ list, footer }: ListCardProps) {
    const t = useI18n();
    const imageUrls = (list.firstGameImageUrls?.filter((url) => url) as string[]) || [];
    const imageCount = imageUrls.length;

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const target = e.target as HTMLImageElement;
        if (target.dataset.fallbackApplied) return;
        target.dataset.fallbackApplied = "true";
        target.src = placeHolder2.src;
    };

    return (
        <div className="bg-card rounded-lg cursor-pointer overflow-hidden h-full flex flex-col text-foreground border border-border hover:border-primary/50 transition-colors duration-300">
            <div className="aspect-video relative overflow-hidden bg-muted/50">
                {imageCount === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <ListIcon className="h-16 w-16 text-muted-foreground/20" strokeWidth={1} />
                    </div>
                )}
                {imageCount === 1 && <img src={imageUrls[0]} alt={list.name} className="h-full w-full object-cover" loading="lazy" onError={handleImageError} />}
                {imageCount >= 2 && imageCount < 4 && (
                    <div className="grid h-full grid-cols-2">
                        {imageUrls.slice(0, 2).map((url, index) => (
                            <img key={index} src={url} alt={list.name} className="h-full w-full object-cover" loading="lazy" onError={handleImageError} />
                        ))}
                    </div>
                )}
                {imageCount >= 4 && (
                    <div className="grid h-full grid-cols-2 grid-rows-2">
                        {imageUrls.slice(0, 4).map((url, index) => (
                            <img key={index} src={url} alt={list.name} className="h-full w-full object-cover" loading="lazy" onError={handleImageError} />
                        ))}
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />
            </div>

            <div className="p-4 flex flex-col flex-1">
                <h3 className="mb-2 line-clamp-2 text-xl font-bold">{list.name}</h3>
                {list.owner ? <p className="mb-3 text-xs text-muted-foreground">{t("lists.byOwner", { username: list.owner.username })}</p> : null}
                {list.description ? <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{list.description}</p> : null}

                <div className="mb-4 flex flex-col items-start gap-2">
                    <VisibilityInfo visibility={list.visibility} isCollapsed={false} t={t} />
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                            <Tag className="mr-1 h-3 w-3" />
                            {getCategoryLabel(list.category, t)}
                        </Badge>
                        <Badge variant="secondary" className="text-yellow-500">
                            <Star className="mr-1 h-3 w-3 fill-yellow-500" />
                            {list.averageRating.toFixed(1)} ({list.ratingCount})
                        </Badge>
                    </div>
                </div>

                <div className="flex-1" />
                <Separator className="bg-border" />

                <div className="flex items-center justify-between pt-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <ListIcon className="h-4 w-4" />
                            <span className="font-semibold text-foreground">{list.gameCount}</span>
                            <span className="hidden sm:inline">{t("lists.gamesCount")}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <FollowersIcon className="h-4 w-4" />
                            <span className="font-semibold text-foreground">{list.followerCount}</span>
                            <span className="hidden sm:inline">{t("lists.followersCount")}</span>
                        </div>
                    </div>

                    {footer}
                </div>
            </div>
        </div>
    );
}
