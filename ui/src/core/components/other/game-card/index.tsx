import type { Game } from "@/models/gaming/game.model";
import { PlatformIcons } from "../platform-icons";
import { ScoreBadge } from "../score-badge";
import { Separator } from "@core/components/ui/separator";
import { memo, useState } from "react";
import placeHolder2 from "@core/assets/placeholder2.png"
import Link from "next/link";
import { Plus, Gift, Loader2 } from "lucide-react";
import { GameAddToListDialog } from "../game-detail/game-add-to-list-dialog";
import { useMutation } from "@tanstack/react-query";
import { toggleWishlist } from "@/api/list/list.api";
import { toast } from "sonner";
import { useAuth } from "@/core/hooks/use-auth";

export const GameCard = memo(function GameCard({ game }: { game: Game }) {
    const { isAuthenticated } = useAuth();
    const [isListDialogOpen, setIsListDialogOpen] = useState(false);

    const [isInWishlist, setIsInWishlist] = useState(game.isInWishlist || false);

    const { mutate: mutateWishlist, isPending: isWishlistLoading } = useMutation({
        mutationFn: () => toggleWishlist(game.rawgId),
        onSuccess: (data) => {
            setIsInWishlist(data.isAdded);
            toast.success(data.message);
        },
    });

    const handleQuickAction = (e: React.MouseEvent, action: 'list' | 'wishlist') => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) {
            toast.error("Giriş Yapmalısınız");
            return;
        }

        if (action === 'list') {
            setIsListDialogOpen(true);
        } else {
            mutateWishlist();
        }
    };

    if (!game) return null;

    const hasPlatforms = game.platforms && Array.isArray(game.platforms) && game.platforms.length > 0;
    const hasGenres = game.genres && Array.isArray(game.genres) && game.genres.length > 0;
    const gameUrl = `/games/${game.slug || game.rawgId}`;

    return (
        <>
            <div className="relative group h-full">
                {/* 1. OYUN KARTI (LİNK) */}
                <Link href={gameUrl} className="block h-full">
                    <div className="bg-card rounded-lg cursor-pointer overflow-hidden h-full flex flex-col text-foreground border border-border hover:border-primary/50 transition-colors duration-300">

                        <div className="aspect-video relative overflow-hidden">
                            <img
                                src={game.backgroundImage ?? placeHolder2.src}
                                alt={game.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />
                        </div>

                        <div className="p-4 flex flex-col flex-1">
                            {hasPlatforms ? (
                                <div className="mb-2 h-4">
                                    <PlatformIcons platforms={game.platforms} />
                                </div>
                            ) : (
                                <div className="mb-2 h-0" />
                            )}

                            <h3 className="text-xl font-bold line-clamp-2 mb-4 flex-1">{game.name}</h3>

                            <div className="grid grid-cols-3 gap-4 text-center mb-4">
                                <ScoreBadge type="metacritic" score={game.metacritic} />
                                <ScoreBadge type="rawg" score={game.rating} />
                                <ScoreBadge type="gghub" score={game.gghubRating || null} />
                            </div>

                            <Separator className="bg-border" />

                            <div className="flex justify-between items-center text-xs text-muted-foreground pt-3 mt-auto">
                                <div>
                                    <p>Çıkış Tarihi</p>
                                    <p className="text-foreground font-semibold">{game.released ? new Date(game.released).toLocaleDateString("tr-TR") : "-"}</p>
                                </div>
                                {hasGenres ? (
                                    <div className="text-right">
                                        <p>Türler</p>
                                        <p className="text-foreground font-semibold line-clamp-1">{game.genres.map((g) => g.name).join(", ")}</p>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </Link>

                <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 translate-x-4 group-hover:translate-x-0 z-20">
                    {/* Listeye Ekle */}
                    <button
                        onClick={(e) => handleQuickAction(e, 'list')}
                        className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-primary hover:text-white transition-all shadow-lg border border-white/10 cursor-pointer"
                        title="Listeye Ekle"
                    >
                        <Plus size={16} strokeWidth={3} />
                    </button>

                    {/* İstek Listesi */}
                    <button
                        onClick={(e) => handleQuickAction(e, 'wishlist')}
                        disabled={isWishlistLoading}
                        className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all shadow-lg border disabled:opacity-50 cursor-pointer ${isInWishlist
                            ? "bg-pink-600 text-white border-pink-400 hover:bg-pink-700"
                            : "bg-black/60 text-white border-white/10 hover:bg-pink-500"
                            }`}
                        title={isInWishlist ? "İstek Listesinden Çıkar" : "İstek Listesine Ekle"}
                    >
                        {isWishlistLoading ? <Loader2 size={14} className="animate-spin" /> : <Gift size={16} className={isInWishlist ? "fill-current" : ""} />}
                    </button>
                </div>
            </div>

            {/* MODAL */}
            {isListDialogOpen && (
                <GameAddToListDialog
                    isOpen={isListDialogOpen}
                    onClose={() => setIsListDialogOpen(false)}
                    gameId={game.rawgId}
                />
            )}
        </>
    );
}); 