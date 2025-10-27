"use client";

import type { UserList } from "@/models/list/list.model";
import { ListCategory, ListVisibilitySetting } from "@/models/list/list.model";
import { Badge } from "@core/components/ui/badge";
import { Separator } from "@core/components/ui/separator";
import { Globe, Lock, Users, Tag, Star, List as ListIcon, Users as FollowersIcon } from "lucide-react";
import React from "react";

const VisibilityInfo: React.FC<{
    visibility: ListVisibilitySetting;
    isCollapsed: boolean;
}> = ({ visibility, isCollapsed }) => {
    switch (visibility) {
        case ListVisibilitySetting.Public:
            return (
                <Badge variant="outline" className="text-green-500 border-green-500">
                    <Globe className="mr-1 h-3 w-3" />
                    {!isCollapsed && "Herkese Açık"}
                </Badge>
            );
        case ListVisibilitySetting.Followers:
            return (
                <Badge variant="outline" className="text-blue-500 border-blue-500">
                    <Users className="mr-1 h-3 w-3" />
                    {!isCollapsed && "Sadece Takipçiler"}
                </Badge>
            );
        case ListVisibilitySetting.Private:
        default:
            return (
                <Badge variant="outline" className="text-red-500 border-red-500">
                    <Lock className="mr-1 h-3 w-3" />
                    {!isCollapsed && "Özel"}
                </Badge>
            );
    }
};

const getCategoryLabel = (category: ListCategory): string => {
    return ListCategory[category] || "Diğer";
};

interface ListCardProps {
    list: UserList;
    footer?: React.ReactNode;
}

export function ListCard({ list, footer }: ListCardProps) {
    return (
        <div className="bg-card rounded-lg cursor-pointer overflow-hidden h-full flex flex-col group text-foreground border border-border hover:border-primary/50 transition-colors duration-300">
            {/* Dekoratif Başlık */}
            <div className="aspect-video relative overflow-hidden bg-muted/30">
                <div className="absolute inset-0 flex items-center justify-center">
                    <ListIcon className="h-16 w-16 text-muted-foreground/20 transition-transform duration-300 group-hover:scale-110" strokeWidth={1} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />
            </div>
            <div className="p-4 flex flex-col flex-1">
                {/* Başlık */}
                <h3 className="text-xl font-bold line-clamp-2 mb-4 flex-1">{list.name}</h3>

                {/* Rozetler (Görünürlük, Kategori, Puan) */}
                <div className="flex flex-col items-start gap-2 mb-4">
                    <VisibilityInfo visibility={list.visibility} isCollapsed={false} />
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                            <Tag className="mr-1 h-3 w-3" />
                            {getCategoryLabel(list.category)}
                        </Badge>
                        <Badge variant="secondary" className="text-yellow-500">
                            <Star className="mr-1 h-3 w-3 fill-yellow-500" />
                            {list.averageRating.toFixed(1)} ({list.ratingCount})
                        </Badge>
                    </div>
                </div>

                <Separator className="bg-border" />

                {/* İstatistikler (Oyun Sayısı, Takipçi) */}
                <div className="flex justify-between items-center text-sm text-muted-foreground pt-3 mt-auto">
                    <div className="flex items-center gap-1">
                        <ListIcon className="h-4 w-4" />
                        <span className="text-foreground font-semibold">{list.gameCount}</span>
                        <span className="hidden sm:inline">Oyun</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <FollowersIcon className="h-4 w-4" />
                        <span className="text-foreground font-semibold">{list.followerCount}</span>
                        <span className="hidden sm:inline">Takipçi</span>
                    </div>
                </div>

                {/* Footer (Aksiyon Butonları) */}
                {footer && (
                    <>
                        <Separator className="bg-border my-3" />
                        <div className="flex w-full gap-2">{footer}</div>
                    </>
                )}
            </div>
        </div>
    );
}
