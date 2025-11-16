"use client";

import type { TopList } from "@/models/analytics/analytics.model";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@core/components/ui/card";
import { Library } from "lucide-react";
import Link from "next/link";

interface TopListsCardProps {
    lists: TopList[];
}

export const TopListsCard = ({ lists }: TopListsCardProps) => {
    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Library className="h-5 w-5" />
                    En Popüler Listeler
                </CardTitle>
                <CardDescription>Platformun en popüler 5 listesi.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                <div className="flex flex-1 flex-col gap-4">
                    {lists.length > 0 ? (
                        lists.map((list) => (
                            <div key={list.listId} className="flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{list.listName}</p>
                                    <p className="text-xs text-muted-foreground truncate">Oluşturan: {list.ownerUsername}</p>
                                </div>
                                <span className="text-sm font-medium text-muted-foreground">{list.followerCount} Takipçi</span>
                                {/* </Link> TODO: Listenin detay sayfasına yönlendirme */}
                            </div>
                        ))
                    ) : (
                        <p className="flex-1 flex items-center justify-center text-sm text-center text-muted-foreground">Veri bulunamadı.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
