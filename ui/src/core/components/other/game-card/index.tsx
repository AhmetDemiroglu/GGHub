// Dosya Yolu: src/core/components/other/game-card/index.tsx

import type { Game } from "@/models/gaming/game.model";
import { PlatformIcons } from "../platform-icons";
import { ScoreBadge } from "../score-badge";
import { Separator } from "@core/components/ui/separator";

export function GameCard({ game }: { game: Game }) {
  return (
    <div className="bg-muted/20 rounded-lg overflow-hidden h-full flex flex-col group text-white border border-transparent hover:border-primary/50 transition-colors duration-300">
      {/* Resim Alanı */}
      <div className="aspect-video relative overflow-hidden">
        <img
          src={game.backgroundImage ?? '/placeholder.png'}
          alt={game.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      </div>

      <div className="p-4 flex flex-col flex-1">
        {/* Platform İkonları */}
        <div className="mb-2 h-4">
            <PlatformIcons platforms={game.platforms} />
        </div>
        
        {/* Başlık */}
        <h3 className="text-xl font-bold line-clamp-2 mb-4 flex-1">{game.name}</h3>

        {/* Puanlar */}
        <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <ScoreBadge type="metacritic" score={game.metacritic} />
            <ScoreBadge type="rawg" score={game.rating} />
            <ScoreBadge type="gghub" score={null} />
        </div>

        <Separator className="bg-white/10" />

        {/* Çıkış Tarihi ve Türler */}
        <div className="flex justify-between items-center text-xs text-muted-foreground pt-3">
          <div>
            <p>Çıkış Tarihi</p>
            <p className="text-white font-semibold">{game.released ? new Date(game.released).toLocaleDateString('tr-TR') : '-'}</p>
          </div>
          <div className="text-right">
            <p>Türler</p>
            <p className="text-white font-semibold line-clamp-1">
                {game.genres.length > 0 ? game.genres.map(g => g.name).join(', ') : '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}