import type { Game } from "@/models/gaming/game.model";
import { PlatformIcons } from "../platform-icons";
import { ScoreBadge } from "../score-badge";
import { Separator } from "@core/components/ui/separator";

export function GameCard({ game }: { game: Game }) {
    return (
        // Ana div'den text-white kaldırıldı, text-foreground eklendi
        <div className="bg-card rounded-lg cursor-pointer overflow-hidden h-full flex flex-col group text-foreground border border-border hover:border-primary/50 transition-colors duration-300">
            {/* Resim Alanı */}
            <div className="aspect-video relative overflow-hidden">
                <img src={game.backgroundImage ?? "/placeholder.png"} alt={game.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />
            </div>

            <div className="p-4 flex flex-col flex-1">
                <div className="mb-2 h-4">
                    <PlatformIcons platforms={game.platforms} />
                </div>

                <h3 className="text-xl font-bold line-clamp-2 mb-4 flex-1">{game.name}</h3>

                <div className="grid grid-cols-3 gap-4 text-center mb-4">
                    <ScoreBadge type="metacritic" score={game.metacritic} />
                    <ScoreBadge type="rawg" score={game.rating} />
                    <ScoreBadge type="gghub" score={null} />
                </div>

                <Separator className="bg-border" />

                <div className="flex justify-between items-center text-xs text-muted-foreground pt-3 mt-auto">
                    {" "}
                    <div>
                        <p>Çıkış Tarihi</p>
                        <p className="text-foreground font-semibold">{game.released ? new Date(game.released).toLocaleDateString("tr-TR") : "-"}</p>
                    </div>
                    <div className="text-right">
                        <p>Türler</p>
                        <p className="text-foreground font-semibold line-clamp-1">{game.genres.length > 0 ? game.genres.map((g) => g.name).join(", ") : "-"}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
