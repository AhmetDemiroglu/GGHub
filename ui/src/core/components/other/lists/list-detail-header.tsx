"use client";

import type { UserListDetail } from "@/models/list/list.model";
import { ListCategory } from "@/models/list/list.model";
import { Avatar, AvatarFallback, AvatarImage } from "@core/components/ui/avatar";
import { Star, Users, Tag } from "lucide-react";
import Link from "next/link";
import { ListRating } from "./list-rating";
import React from "react";
import { Separator } from "../../ui/separator";

const getCategoryLabel = (category: ListCategory): string => {
    const label = ListCategory[category];
    return label === "Other" ? "Diğer" : label || "Diğer";
};

interface ListDetailHeaderProps {
    list: UserListDetail;
    actions?: React.ReactNode;
    myRating: number | null | undefined;
    onSubmitRating: (rating: number) => void;
    isRatingPending: boolean;
    currentUserId: number | undefined;
}

export function ListDetailHeader({ list, actions, myRating, onSubmitRating, isRatingPending, currentUserId }: ListDetailHeaderProps) {
    const getImageUrl = (path: string | null | undefined): string | undefined => {
        if (!path) {
            return undefined;
        }
        if (path.startsWith("http://") || path.startsWith("https://")) {
            return path;
        }
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
        return `${API_BASE}${path}`;
    };

    const avatarSrc = getImageUrl(list.owner.profileImageUrl);

    return (
        <div className="relative">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent rounded-xl -z-10" />

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-10 p-3 sm:p-6 mb-0 pb-2">
                <div className="md:col-span-4 space-y-3">
                    <Link href={`/profiles/${list.owner.username}`}>
                        <div className="flex items-start gap-3 group mb-2">
                            <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarImage src={avatarSrc} />
                                <AvatarFallback>{list.owner.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                {(list.owner.firstName || list.owner.lastName) && (
                                    <span className="text-sm font-semibold text-foreground">
                                        {list.owner.firstName} {list.owner.lastName}
                                    </span>
                                )}
                                <span className="text-xs font-medium text-muted-foreground group-hover:text-primary group-hover:underline">{list.owner.username} tarafından</span>
                            </div>
                        </div>
                    </Link>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">{list.name}</h1>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-muted-foreground text-sm">
                        <div className="flex items-center gap-1 text-yellow-500">
                            <Star className="h-4 w-4 fill-yellow-500" />
                            <span className="font-semibold text-foreground">{list.averageRating.toFixed(1)}</span>
                            <span>({list.ratingCount} oy)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span className="font-semibold text-foreground">{list.followerCount}</span>
                            <span>takipçi</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Tag className="h-4 w-4" />
                            <span className="font-semibold text-foreground">{getCategoryLabel(list.category)}</span>
                        </div>
                    </div>
                    {list.description && <p className="text-muted-foreground mt-4">{list.description}</p>}
                </div>
                <div className="md:col-span-1 flex flex-col gap-4 md:gap-2 md:justify-between h-full">
                    <div className="flex justify-start md:justify-end">{actions}</div>
                    <div className="flex justify-start md:justify-end">
                        <ListRating myRating={myRating} onSubmitRating={onSubmitRating} isPending={isRatingPending} listOwnerId={list.owner.id} currentUserId={currentUserId} />
                    </div>
                </div>
            </div>
        </div>
    );
}
