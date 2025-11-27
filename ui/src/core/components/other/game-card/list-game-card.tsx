import type { Game } from "@/models/gaming/game.model";
import { Star, Trash2 } from "lucide-react";
import { memo } from "react";
import placeHolder3 from "@core/assets/placeholder3.png";
import Link from "next/link";
import logoSrc from "@core/assets/logo.png";
import rawgLogoSrc from "@core/assets/rawg_logo.png";
import metacriticLogoSrc from "@core/assets/metacritic_logo.png";

interface ListGameCardProps {
    game: Game;
    showRemoveButton?: boolean;
    onRemove?: (gameId: number) => void;
}

export const ListGameCard = memo(function ListGameCard({ game, showRemoveButton, onRemove }: ListGameCardProps) {
    const gameUrl = `/games/${game.slug || game.rawgId}`;

    return (
        <Link href={gameUrl} className="block h-full">

            <div className="flex gap-3 p-3 rounded-lg border bg-card cursor-pointer hover:bg-accent/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                {/* Sol: Küçük Thumbnail */}
                <img
                    src={game.backgroundImage ?? placeHolder3.src}
                    alt={game.name}
                    className="w-20 h-20 object-cover rounded flex-shrink-0"
                    loading="lazy"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.dataset.fallbackApplied) return;
                        target.dataset.fallbackApplied = "true";
                        target.src = placeHolder3.src;
                    }}
                />

                {/* Orta: Bilgiler */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                        <h3 className="font-semibold line-clamp-2 mb-1">{game.name}</h3>
                        <p className="text-xs text-muted-foreground">{game.released ? new Date(game.released).getFullYear() : "-"}</p>
                    </div>

                    {/* RAWG / Metacritic / GGHub Puanı */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* RAWG (Mavi) */}
                        {game.rating ? (
                            <div className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 font-bold text-[10px] border border-blue-500/20 flex items-center gap-1.5 tabular-nums" title="RAWG Rating">
                                <img src={rawgLogoSrc.src} alt="RAWG" className="w-3 h-3 object-contain opacity-80" />
                                {game.rating.toFixed(1)}
                            </div>
                        ) : null}

                        {/* Metacritic (Yeşil) */}
                        {game.metacritic ? (
                            <div className="px-2 py-1 rounded-md bg-green-500/10 text-green-400 font-bold text-[10px] border border-green-500/20 flex items-center gap-1.5 tabular-nums" title="Metascore">
                                <img src={metacriticLogoSrc.src} alt="Metacritic" className="w-3 h-3 object-contain opacity-80" />
                                {game.metacritic}
                            </div>
                        ) : null}

                        {/* GGHub (Mor) */}
                        <div className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 font-bold text-[10px] border border-purple-500/20 flex items-center gap-1.5 tabular-nums" title="GGHub Puanı">
                            <img src={logoSrc.src} alt="GGHub" className="w-3 h-3 object-contain opacity-80" />
                            {game.gghubRating && game.gghubRating > 0 ? game.gghubRating.toFixed(1) : "-"}
                        </div>
                    </div>
                </div>

                {/* Sağ: Trash Button */}
                {showRemoveButton && onRemove && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onRemove?.(game.rawgId);
                        }}
                        className="cursor-pointer flex-shrink-0 self-start p-2 rounded-md hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50 z-10" // z-10 eklendi
                        aria-label="Listeden çıkar"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>
        </Link>
    );
});
