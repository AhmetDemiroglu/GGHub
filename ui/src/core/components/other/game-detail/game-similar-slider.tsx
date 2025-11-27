import { gameApi } from "@/api/gaming/game.api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
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

    if (isLoading || !games || games.length === 0) return null;
    const sliderContent = [...games, ...games];

    return (
        <div className="w-full space-y-6 overflow-hidden pt-10 pb-0 mt-12 border-t border-border">
            <h3 className="text-2xl font-bold text-foreground px-4 md:px-0">İlginizi Çekebilir</h3>

            {/* Slider Container */}
            <div className="relative w-full group">
                {/* Sol ve Sağ Kenar Yumuşatma (Fade Effect) */}
                <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

                {/* Kayan Track */}
                <div className="flex gap-6 animate-scroll hover:[animation-play-state:paused] w-max px-4">
                    {sliderContent.map((game, index) => (
                        <Link
                            key={`${game.rawgId}-${index}`}
                            href={`/games/${game.slug || game.rawgId}`}
                            className="relative w-64 h-40 rounded-xl overflow-hidden shadow-lg border border-border/50 hover:border-primary/50 hover:shadow-primary/20 hover:scale-105 transition-all duration-300 flex-shrink-0 group/card"
                        >
                            {/* Arka Plan Görseli */}
                            <img
                                src={game.backgroundImage ?? placeHolder2.src}
                                alt={game.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                            />

                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                            {/* İçerik */}
                            <div className="absolute bottom-0 left-0 w-full p-4">
                                <h4 className="text-white font-bold text-sm line-clamp-1 group-hover/card:text-primary transition-colors">
                                    {game.name}
                                </h4>
                                <p className="text-zinc-400 text-xs mt-0.5">
                                    {game.released ? new Date(game.released).getFullYear() : "TBA"}
                                </p>
                            </div>

                            {/* GGHub Puanı */}
                            {game.gghubRating && game.gghubRating > 0 && (
                                <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-cyan-900/20 text-white font-bold text-xs border border-purple-400/50 flex items-center gap-1.5 shadow-lg backdrop-blur-sm">
                                    <img src={logoSrc.src} alt="GGHub" className="w-4 h-4 object-contain" />
                                    {game.gghubRating.toFixed(1)}
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            </div>

            <style jsx>{`
                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-scroll {
                    animation: scroll 40s linear infinite;
                }
            `}</style>
        </div>
    );
};