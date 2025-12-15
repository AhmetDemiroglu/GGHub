import { gameApi } from "@/api/gaming/game.api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import React from "react";
import logoSrc from "@core/assets/logo.png";
import placeHolder2 from "@core/assets/placeholder2.png";

interface GameSimilarSliderProps {
    rawgId: number;
}

export const GameSimilarSlider = ({ rawgId }: GameSimilarSliderProps) => {
    const { data: games, isLoading } = useQuery({
        queryKey: ["game-similar", rawgId],
        queryFn: () => gameApi.getSimilar(rawgId),
        enabled: !!rawgId,
    });

    if (isLoading || !games || !Array.isArray(games) || games.length === 0) return null;

    const sliderContent = [...games, ...games];

    return (
        <section className="w-full mt-12 border-t border-border/60 bg-linear-to-b from-background/40 to-background">
            <div className="flex items-center justify-between gap-2 px-4 md:px-0 pt-8 pb-6">
                <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground/70">
                        Benzer oyunlar
                    </p>
                    <h3 className="text-2xl md:text-3xl font-semibold text-foreground">
                        İlginizi çekebilir
                    </h3>
                </div>

                <div className="hidden md:inline-flex items-center gap-2 text-[11px] px-3 py-1 rounded-full border border-border/70 bg-background/70 text-muted-foreground/80 backdrop-blur-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                    <span>{games.length} öneri</span>
                </div>
            </div>

            <div className="relative w-full overflow-hidden group">
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 md:w-28 bg-linear-to-r from-background via-background/80 to-transparent z-10" />
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 md:w-28 bg-linear-to-l from-background via-background/80 to-transparent z-10" />

                <div className="flex gap-5 md:gap-6 animate-similar-scroll hover:paused w-max px-4 md:px-0 pb-6 overflow-x-auto touch-pan-x md:overflow-visible md:touch-none no-scrollbar">
                    {sliderContent.map((game, index) => {
                        const year = game.released ? new Date(game.released).getFullYear() : null;
                        const rating = typeof game.rating === "number" ? game.rating : null;
                        const metacritic = typeof game.metacritic === "number" ? game.metacritic : null;
                        const gghubRating =
                            typeof game.gghubRating === "number" && game.gghubRating > 0
                                ? game.gghubRating
                                : null;

                        return (
                            <Link
                                key={`${game.rawgId}-${index}`}
                                href={`/games/${game.slug || game.rawgId}`}
                                className="relative group/card w-64 md:w-72 h-44 md:h-48 rounded-2xl overflow-hidden border border-border/60 bg-background/40 shadow-sm hover:shadow-[0_0_40px_rgba(56,189,248,0.35)] hover:border-primary/70 transition-all duration-300 shrink-0"
                            >
                                <div className="absolute inset-0">
                                    <Image
                                        src={game.backgroundImage || placeHolder2.src}
                                        alt={game.name}
                                        fill
                                        sizes="(max-width: 768px) 256px, 288px"
                                        className="object-cover transition-transform duration-500 group-hover/card:scale-110"
                                    />
                                </div>

                                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/50 to-black/0" />
                                <div className="absolute inset-0 bg-radial from-cyan-500/10 via-transparent to-transparent pointer-events-none" />

                                {gghubRating && (
                                    <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-1 border border-cyan-400/70 shadow-lg backdrop-blur-md text-[11px] font-semibold text-cyan-50">
                                        <Image
                                            src={logoSrc}
                                            alt="GGHub"
                                            width={16}
                                            height={16}
                                            className="rounded-sm object-contain"
                                        />
                                        <span>{gghubRating.toFixed(1)}</span>
                                    </div>
                                )}

                                <div className="absolute bottom-0 left-0 right-0 p-4 space-y-1.5">
                                    <h4 className="text-sm md:text-base font-semibold text-white line-clamp-1 group-hover/card:text-cyan-300 transition-colors">
                                        {game.name}
                                    </h4>

                                    <div className="flex items-center gap-2 text-[11px] text-zinc-300/80">
                                        {year && <span>{year}</span>}
                                        {(rating || metacritic) && year && (
                                            <span className="w-1 h-1 rounded-full bg-zinc-500/80" />
                                        )}
                                        {rating && (
                                            <span className="inline-flex items-center gap-1">
                                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
                                                <span>Rawg {rating.toFixed(1)}/5</span>
                                            </span>
                                        )}
                                        {metacritic && (
                                            <>
                                                {(rating || year) && (
                                                    <span className="w-1 h-1 rounded-full bg-zinc-500/80" />
                                                )}
                                                <span>Metacritic {metacritic}</span>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <span className="inline-flex items-center gap-1.5 text-[11px] text-cyan-200/80 opacity-0 group-hover/card:opacity-100 translate-y-1 group-hover/card:translate-y-0 transition-all duration-200">
                                            <span className="inline-block w-1 h-1 rounded-full bg-cyan-300 animate-pulse" />
                                            Detayları gör
                                        </span>
                                        <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-400/90">
                                            Rawg Önerisi
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};
