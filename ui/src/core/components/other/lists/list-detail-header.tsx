"use client";

import type { UserListDetail } from "@/models/list/list.model";
import { ListCategory } from "@/models/list/list.model";
import { Avatar, AvatarFallback, AvatarImage } from "@core/components/ui/avatar";
import { Star, Users, Tag } from "lucide-react";
import Link from "next/link";

const getCategoryLabel = (category: ListCategory): string => {
    return ListCategory[category] || "Diğer";
};

interface ListDetailHeaderProps {
    list: UserListDetail;
    actions?: React.ReactNode;
}

export function ListDetailHeader({ list, actions }: ListDetailHeaderProps) {
    const getImageUrl = (path: string | null | undefined) => {
        if (!path) return undefined;
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
        return `${API_BASE}${path}`;
    };

    const avatarSrc = getImageUrl(list.owner.profileImageUrl);

    return (
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-6">
            {/* Sol Taraf: Liste Bilgileri */}
            <div className="flex-1">
                {/* Sahip Bilgisi (Avatar ve Link) */}
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

                {/* Liste Başlığı */}
                <h1 className="text-4xl font-bold tracking-tight">{list.name}</h1>

                {/* İstatistikler (Puan, Takipçi, Kategori) */}
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

                {/* Açıklama */}
                {list.description && <p className="text-muted-foreground mt-4 max-w-2xl">{list.description}</p>}
            </div>

            {/* Sağ Taraf: Aksiyon Butonları (Adım 8'de gelecek) */}
            <div className="flex-shrink-0 flex sm:flex-col items-center gap-2">{actions}</div>
        </div>
    );
}
