import type { Game } from "@/models/gaming/game.model";
import { Star, Trash2 } from "lucide-react";
import { memo } from "react";
interface ListGameCardProps {
    game: Game;
    showRemoveButton?: boolean;
    onRemove?: (gameId: number) => void;
}

export const ListGameCard = memo(function ListGameCard({ game, showRemoveButton, onRemove }: ListGameCardProps) {
    return (
        <div className="flex gap-3 p-3 rounded-lg border bg-card cursor-pointer hover:bg-accent/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
            {/* Sol: Küçük Thumbnail */}
            <img
                src={game.backgroundImage ?? "/placeholder.png"}
                alt={game.name}
                className="w-20 h-20 object-cover rounded flex-shrink-0"
                loading="lazy"
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = "https://placehold.co/80x112/27272a/71717a?text=?";
                }}
            />

            {/* Orta: Bilgiler */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                    <h3 className="font-semibold line-clamp-2 mb-1">{game.name}</h3>
                    <p className="text-xs text-muted-foreground">{game.released ? new Date(game.released).getFullYear() : "-"}</p>
                </div>

                {/* RAWG / Metacritic Puanı */}
                <div className="flex items-center gap-2 flex-wrap">
                    {game.rating && <div className="px-2 py-1 rounded-md bg-blue-500/20 text-blue-400 font-semibold text-xs border border-blue-500/30">{game.rating.toFixed(1)}</div>}
                    {game.metacritic && <div className="px-2 py-1 rounded-md bg-green-500/20 text-green-400 font-semibold text-xs border border-green-500/30">{game.metacritic}</div>}
                </div>
            </div>

            {/* Sağ: Trash Button */}
            {showRemoveButton && onRemove && (
                <button
                    onClick={() => onRemove?.(game.rawgId)}
                    className="cursor-pointer flex-shrink-0 self-start p-2 rounded-md hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50"
                    aria-label="Listeden çıkar"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            )}
        </div>
    );
});
