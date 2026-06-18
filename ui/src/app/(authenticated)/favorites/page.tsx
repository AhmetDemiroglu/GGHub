"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/core/components/ui/button";
import { Skeleton } from "@/core/components/ui/skeleton";
import { Crown, X } from "lucide-react";
import type { UserList } from "@/models/list/list.model";
import { useState } from "react";
import { toast } from "sonner";
import { getFavoritesList, toggleFavorite } from "@/api/list/list.api";
import { useAuth } from "@core/hooks/use-auth";
import { useI18n } from "@/core/contexts/locale-context";

export default function FavoritesPage() {
    const t = useI18n();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [removingId, setRemovingId] = useState<number | null>(null);
    const username = user?.username;

    const { data, isLoading, isError } = useQuery<UserList | null>({
        queryKey: ["favorites", username],
        queryFn: () => getFavoritesList(username!),
        enabled: !!username,
    });

    const games = data?.previewGames ?? [];

    const { mutate: handleToggleFavorite, isPending } = useMutation({
        mutationFn: (gameId: number) => toggleFavorite(gameId),
        onSuccess: (result) => {
            toast.success(result.message);
            queryClient.invalidateQueries({ queryKey: ["favorites"] });
        },
        onSettled: () => {
            setRemovingId(null);
        },
    });

    return (
        <div className="w-full h-full p-5">
            <div className="space-y-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Crown className="h-6 w-6 text-yellow-500" />
                        <span>{t("favoritesPage.title")}</span>
                    </h1>
                    <p className="text-muted-foreground mt-2">{t("favoritesPage.description")}</p>
                </div>

                {isLoading && (
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Skeleton className="h-14 w-14 rounded-md" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-1/3" />
                                </div>
                                <Skeleton className="h-8 w-8" />
                            </div>
                        ))}
                    </div>
                )}

                {!isLoading && isError && <p className="text-sm text-destructive">{t("favoritesPage.loadError")}</p>}

                {!isLoading && !isError && games.length === 0 && (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                        <p>{t("favoritesPage.emptyTitle")}</p>
                        <p className="mt-1">{t("favoritesPage.emptyDescription")}</p>
                    </div>
                )}

                {!isLoading && !isError && games.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {games.map((game) => {
                            const cover = game.coverImage ?? "/images/placeholders/game-cover.png";
                            return (
                                <div
                                    key={`${game.id}-${game.rawgId}`}
                                    className="flex items-center gap-3 rounded-lg border bg-card/60 px-3 py-2 hover:bg-card transition"
                                >
                                    <div className="relative h-14 w-14 overflow-hidden rounded-md bg-muted flex-shrink-0">
                                        <Link href={`/games/${game.slug}`}>
                                            <Image src={cover} alt={game.name ?? ""} fill sizes="56px" className="object-cover" />
                                        </Link>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <Link href={`/games/${game.slug}`} className="block font-medium text-sm hover:underline truncate">
                                            {game.name}
                                        </Link>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`cursor-pointer text-destructive transition-transform duration-150 hover:scale-110 active:scale-95 ${
                                            removingId === game.rawgId ? "scale-90 opacity-60" : ""
                                        }`}
                                        aria-label={t("favoritesPage.removeAria")}
                                        disabled={isPending && removingId === game.rawgId}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (!game.rawgId) return;
                                            setRemovingId(game.rawgId);
                                            handleToggleFavorite(game.rawgId);
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
