"use client";

import { useQuery } from "@tanstack/react-query";
import { getFavoritesList } from "@/api/list/list.api";
import { Loader2, Crown } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/core/components/ui/tooltip";

interface TopFiveGamesProps {
    username: string;
}

export default function TopFiveGames({ username }: TopFiveGamesProps) {
    const { data: favoritesList, isLoading } = useQuery({
        queryKey: ["profile-favorites", username],
        queryFn: () => getFavoritesList(username),
    });

    if (isLoading) {
        return (
            <Card className="h-[200px] border-border/50 bg-card shadow-sm overflow-hidden flex flex-col">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </Card>
        );
    }

    const favoriteGames = favoritesList?.previewGames || [];
    if (!favoriteGames || favoriteGames.length === 0) {
        return null;
    }
    const displayGames = favoriteGames.slice(0, 5);
    const totalSlots = 5;
    const placeholdersCount = Math.max(0, totalSlots - displayGames.length);
    const isFull = displayGames.length === totalSlots;

    return (
        <Card className="h-[300px] border-border/50 bg-card shadow-sm overflow-hidden flex flex-col pb-1">
            <CardHeader className="pb-0.5 pt-0 px-4 shrink-0 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <div className="p-1.5 bg-yellow-500/10 rounded-md">
                        <Crown className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                    </div>
                    Favori Oyunlar
                </CardTitle>
            </CardHeader>

            <CardContent className="py-4 px-4 pt-0 flex-1 grid grid-cols-5 gap-4 items-stretch">
                {displayGames.map((game, index) => (
                    <TooltipProvider key={game.id}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    className="relative w-full aspect-3/4 rounded-lg overflow-hidden border border-border/50 bg-muted group cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 hover:scale-105 hover:z-10"
                                >
                                    <Link href={`/games/${game.slug}`} className="block w-full h-full">
                                        {game.coverImage ? (
                                            <img
                                                src={game.coverImage}
                                                alt={`Favori ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-secondary">
                                                <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-1 pt-4 flex justify-center">
                                            <span className="text-[10px] font-bold text-white opacity-80">{index + 1}</span>
                                        </div>
                                    </Link>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                <p>{game.name}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}
                {Array.from({ length: placeholdersCount }).map((_, index) => (
                    <div
                        key={`placeholder-${index}`}
                        className="w-full aspect-3/4 rounded-lg border-2 border-dashed border-border/60 bg-muted/30 backdrop-blur-sm opacity-80"
                    />
                ))}
            </CardContent>
        </Card>
    );
}