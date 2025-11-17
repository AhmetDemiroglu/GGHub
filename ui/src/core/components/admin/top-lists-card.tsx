"use client";

import type { TopList } from "@/models/analytics/analytics.model";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@core/components/ui/card";
import { Library, Star } from "lucide-react";

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
                            <div key={list.listId} className="flex items-center gap-3 p-2 -m-2 rounded-md hover:bg-accent">
                                {/* Sol Taraf (İsim ve Sahip) */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{list.listName}</p>
                                    <p className="text-xs text-muted-foreground truncate">Oluşturan: {list.ownerUsername}</p>
                                </div>

                                {/* Sağ Taraf (Puan ve Takipçi) */}
                                <div className="flex flex-col items-end flex-shrink-0">
                                    <div className="flex items-center gap-1 text-sm font-medium text-amber-500">
                                        <Star className="h-4 w-4" />
                                        {list.averageRating.toFixed(1)}
                                    </div>
                                    <span className="text-xs text-muted-foreground">{list.followerCount} Takipçi</span>
                                </div>
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
