"use client";

import type { TopGame } from "@/models/analytics/analytics.model";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@core/components/ui/card";
import { Gamepad2, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getImageUrl } from "@/core/lib/get-image-url";

interface TopGamesCardProps {
    games: TopGame[];
}

export const TopGamesCard = ({ games }: TopGamesCardProps) => {
    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5" />
                    En Yüksek Puanlı Oyunlar
                </CardTitle>
                <CardDescription>Kullanıcı puanlarına göre en iyi 5 oyun.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                <div className="flex flex-1 flex-col gap-4">
                    {games.length > 0 ? (
                        games.map((game) => (
                            <Link
                                key={game.slug || game.rawgId}
                                href={`/games/${game.slug || game.rawgId}`}
                                className="flex items-center gap-3 p-2 -m-2 rounded-md hover:bg-accent"
                            >
                                <Image src={getImageUrl(game.gameImageUrl) || "/assets/placeholder.png"} alt={game.gameName} width={40} height={56} className="rounded-sm object-cover" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{game.gameName}</p>
                                    <p className="text-xs text-muted-foreground truncate">{game.reviewCount} İnceleme</p>
                                </div>
                                <div className="flex items-center gap-1 text-sm font-medium text-amber-500">
                                    <Star className="h-4 w-4" />
                                    {game.averageRating.toFixed(1)}
                                </div>
                            </Link>
                        ))
                    ) : (
                        <p className="flex-1 flex items-center justify-center text-sm text-center text-muted-foreground">Veri bulunamadı.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
