"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/core/components/ui/button";
import { Skeleton } from "@/core/components/ui/skeleton";
import { Gift } from "lucide-react";
import type { UserListDetail } from "@/models/list/list.model";
import { useState } from "react";
import { toast } from "sonner";
import { getMyWishlist, toggleWishlist } from "@/api/list/list.api";
import logoSrc from "@core/assets/logo.png";
import rawgLogoSrc from "@core/assets/rawg_logo.png";
import metacriticLogoSrc from "@core/assets/metacritic_logo.png";


export default function WishlistPage() {
    const queryClient = useQueryClient();
    const [visibleCount, setVisibleCount] = useState(8);
    const [removingId, setRemovingId] = useState<number | null>(null);

    const { data, isLoading, isError } = useQuery<UserListDetail | null>({
        queryKey: ["wishlist"],
        queryFn: getMyWishlist,
    });

    const games = data?.games ?? [];
    const visibleGames = games.slice(0, visibleCount);
    const hasMore = games.length > visibleCount;

    const { mutate: handleToggleWishlist, isPending } = useMutation({
        mutationFn: (gameId: number) => toggleWishlist(gameId),
        onSuccess: (result) => {
            toast.success(result.message);
            queryClient.invalidateQueries({ queryKey: ["wishlist"] });
        },
        onSettled: () => {
            setRemovingId(null);
        },
    });

    return (
        <div className="w-full h-full p-5">
            <div className="space-y-4">
                {/* Başlık */}
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Gift className="h-6 w-6 text-pink-500" />
                        <span>İstek Listem</span>
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Takip ettiğin ve oynamayı planladığın oyunlar. Daha çok müzik listesi gibi, hızlı göz atma alanı.
                    </p>
                </div>

                {/* Loading skeleton */}
                {isLoading && (
                    <div className="space-y-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Skeleton className="h-14 w-14 rounded-md" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-1/3" />
                                    <Skeleton className="h-3 w-1/4" />
                                </div>
                                <Skeleton className="h-8 w-16" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Hata durumu */}
                {!isLoading && isError && (
                    <p className="text-sm text-destructive">İstek listen yüklenirken bir hata oluştu.</p>
                )}

                {/* Boş durum */}
                {!isLoading && !isError && games.length === 0 && (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                        <p>Henüz istek listene eklenmiş oyun yok.</p>
                        <p className="mt-1">
                            Oyun detayı ve keşfet sayfalarından listene ekleme yapabilirsin.
                        </p>
                    </div>
                )}

                {/* Liste – 2’li grid + fadeout + Daha Fazla Göster */}
                {!isLoading && !isError && games.length > 0 && (
                    <>
                        <div className="relative">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {visibleGames.map((game) => {
                                    const cover =
                                        game.coverImage ??
                                        game.backgroundImage ??
                                        "/images/placeholders/game-cover.png";

                                    const slugOrId =
                                        game.slug ??
                                        (game.rawgId ? String(game.rawgId) : game.id ? String(game.id) : "");

                                    const year = game.released ? game.released.slice(0, 4) : undefined;

                                    return (
                                        <div
                                            key={`${game.id}-${game.rawgId}-${game.slug}`}
                                            className="flex items-center gap-3 rounded-lg border bg-card/60 px-3 py-2 hover:bg-card transition"
                                        >
                                            {/* Küçük kapak görseli */}
                                            <div className="relative h-14 w-14 overflow-hidden rounded-md bg-muted flex-shrink-0">
                                                {slugOrId ? (
                                                    <Link href={`/games/${slugOrId}`}>
                                                        <Image
                                                            src={cover}
                                                            alt={game.name ?? ""}
                                                            fill
                                                            sizes="56px"
                                                            className="object-cover"
                                                        />
                                                    </Link>
                                                ) : (
                                                    <Image
                                                        src={cover}
                                                        alt={game.name ?? ""}
                                                        fill
                                                        sizes="56px"
                                                        className="object-cover"
                                                    />
                                                )}
                                            </div>

                                            {/* Oyun bilgileri */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    {slugOrId ? (
                                                        <Link
                                                            href={`/games/${slugOrId}`}
                                                            className="font-medium text-sm hover:underline truncate"
                                                        >
                                                            {game.name}
                                                        </Link>
                                                    ) : (
                                                        <span className="font-medium text-sm truncate">
                                                            {game.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mt-0.5 text-xs text-muted-foreground">
                                                    {year && <span>{year} • </span>}
                                                    <span>İstek listende</span>
                                                </div>
                                                {/* Rating Badges */}
                                                <div className="flex items-center gap-2 flex-wrap mt-1">

                                                    {/* RAWG Rating */}
                                                    {game.rating ? (
                                                        <div
                                                            className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 font-bold text-[10px] border border-blue-500/20 flex items-center gap-1.5 tabular-nums"
                                                            title="RAWG Rating"
                                                        >
                                                            <img
                                                                src={rawgLogoSrc.src}
                                                                alt="RAWG"
                                                                className="w-3 h-3 object-contain opacity-80"
                                                            />
                                                            {game.rating.toFixed(1)}
                                                        </div>
                                                    ) : null}

                                                    {/* Metacritic */}
                                                    {game.metacritic ? (
                                                        <div
                                                            className="px-2 py-1 rounded-md bg-green-500/10 text-green-400 font-bold text-[10px] border border-green-500/20 flex items-center gap-1.5 tabular-nums"
                                                            title="Metacritic"
                                                        >
                                                            <img
                                                                src={metacriticLogoSrc.src}
                                                                alt="Metacritic"
                                                                className="w-3 h-3 object-contain opacity-80"
                                                            />
                                                            {game.metacritic}
                                                        </div>
                                                    ) : null}

                                                    {/* GGHub Rating */}
                                                    <div
                                                        className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 font-bold text-[10px] border border-purple-500/20 flex items-center gap-1.5 tabular-nums"
                                                        title="GGHub Puanı"
                                                    >
                                                        <img
                                                            src={logoSrc.src}
                                                            alt="GGHub"
                                                            className="w-3 h-3 object-contain opacity-80"
                                                        />
                                                        {game.gghubRating && game.gghubRating > 0
                                                            ? game.gghubRating.toFixed(1)
                                                            : "-"}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Kalp – toggleWishlist + animasyon */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={`cursor-pointer text-destructive transition-transform duration-150 hover:scale-110 active:scale-95 ${removingId === game.rawgId ? "scale-90 opacity-60" : ""
                                                    }`}
                                                aria-label="İstek listesinden kaldır"
                                                disabled={isPending && removingId === game.rawgId}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (!game.rawgId) return;
                                                    setRemovingId(game.rawgId);
                                                    handleToggleWishlist(game.rawgId);
                                                }}
                                            >
                                                <Gift
                                                    className={`h-4 w-4 ${removingId === game.rawgId ? "animate-pulse fill-current" : "fill-current"
                                                        }`}
                                                />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Fade out efekti */}
                            {hasMore && (
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
                            )}
                        </div>

                        {/* Daha Fazla Göster butonu */}
                        {hasMore && (
                            <div className="flex justify-center mt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs font-semibold cursor-pointer "
                                    onClick={() => setVisibleCount((prev) => prev + 8)}
                                >
                                    Daha Fazla Göster
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
