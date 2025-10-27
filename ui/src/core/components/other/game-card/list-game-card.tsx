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
        <div className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
            {/* Sol: Küçük Thumbnail */}
            <img
                src={game.backgroundImage ?? "/placeholder.png"}
                alt={game.name}
                className="w-20 h-28 object-cover rounded flex-shrink-0"
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

                {/* Alt: RAWG Puanı */}
                {game.rating && (
                    <div className="flex items-center gap-1 text-sm">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        <span className="font-medium">{game.rating.toFixed(1)}</span>
                    </div>
                )}
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
