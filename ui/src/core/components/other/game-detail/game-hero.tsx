import { Game } from "@/models/gaming/game.model";
import React, { useState } from "react";
import { PlatformIcons } from "@/core/components/other/platform-icons";
import { Calendar, Plus, Gift, Share2, Loader2, Trash2 } from "lucide-react";
import { GameRatingBar } from "./game-rating-bar";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { checkWishlistStatus, toggleWishlist } from "@/api/list/list.api";
import { toast } from "sonner";
import { useAuth } from "@/core/hooks/use-auth";
import { GameAddToListDialog } from "./game-add-to-list-dialog";
import { getMyReview } from "@/api/review/review.api";
import { FavoriteButton } from "./favorite-button";
import { AdminGameRefreshButton } from "./admin-game-refresh-button";
import { useI18n } from "@/core/contexts/locale-context";

interface GameHeroProps {
    game: Game;
    onOpenReviewModal: () => void;
}

export const GameHero = ({ game, onOpenReviewModal }: GameHeroProps) => {
    const t = useI18n();
    const { isAuthenticated, user } = useAuth();
    const queryClient = useQueryClient();
    const isAdmin = user?.role === "Admin";
    const [isListDialogOpen, setIsListDialogOpen] = useState(false);

    const { data: wishlistStatus, isLoading: isStatusLoading } = useQuery({
        queryKey: ["wishlist-status", game.id],
        queryFn: () => checkWishlistStatus(game.id),
        enabled: !!isAuthenticated,
    });

    const { mutate: mutateWishlist, isPending: isWishlistLoading } = useMutation({
        mutationFn: () => toggleWishlist(game.rawgId),
        onSuccess: (data) => {
            queryClient.setQueryData(["wishlist-status", game.id], { isInWishlist: data.isAdded });

            toast.success(data.message, {
                description: data.isAdded ? t("reviewList.wishlistAdded") : t("reviewList.wishlistRemoved"),
            });
        },
        onError: () => {
            toast.error(t("reviewList.wishlistErrorTitle"), {
                description: t("reviewList.wishlistErrorDescription"),
            });
        },
    });

    const { data: myReview } = useQuery({
        queryKey: ["my-review", game.rawgId],
        queryFn: () => getMyReview(game.rawgId),
        enabled: !!isAuthenticated,
        retry: false,
    });

    const isAdded = wishlistStatus?.isInWishlist ?? false;
    const isButtonLoading = isStatusLoading || isWishlistLoading;

    const handleWishlistClick = () => {
        if (!isAuthenticated) {
            toast.error(t("reviewList.wishlistLoginTitle"), { description: t("reviewList.wishlistLoginDescription") });
            return;
        }
        mutateWishlist();
    };

    const handleShare = async () => {
        const url = window.location.href;
        try {
            await navigator.clipboard.writeText(url);
            toast.success(t("reviewList.shareSuccessTitle"), { description: t("reviewList.shareSuccessDescription") });
        } catch {
            toast.error(t("reviewList.shareErrorTitle"));
        }
    };

    const releaseDate = game.released ? new Date(game.released).toLocaleDateString("tr-TR", { month: "long", day: "numeric", year: "numeric" }) : null;

    return (
        <div className="relative w-full min-h-[550px] overflow-hidden rounded-3xl shadow-2xl bg-background border border-white/5">
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 hover:scale-105"
                style={{ backgroundImage: `url(${game.backgroundImage || "/placeholder-game.jpg"})` }}
            >
                <div className="absolute inset-0 bg-linear-to-t from-background via-background/90 via-30% to-transparent" />
                <div className="absolute inset-0 bg-linear-to-r from-background via-background/50 to-transparent" />
            </div>

            <div className="relative h-full flex flex-col justify-end pt-62 pb-0 md:px-12 md:pb-10 lg:px-16 lg:pb-12 z-10">
                <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-white/80 mb-4">
                    {releaseDate && (
                        <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                            <Calendar size={14} className="text-white/60" />
                            <span className="uppercase tracking-wide text-xs">{releaseDate}</span>
                        </div>
                    )}

                    {game.platforms && game.platforms.length > 0 && (
                        <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                            <PlatformIcons platforms={game.platforms} />
                        </div>
                    )}
                </div>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-8 leading-[0.9] tracking-tight drop-shadow-2xl">{game.name}</h1>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:items-end">
                    <div className="lg:col-span-7 flex flex-wrap gap-3">
                        <button
                            onClick={() => {
                                if (!isAuthenticated) {
                                    toast.error(t("reviewList.loginRequired"));
                                    return;
                                }
                                setIsListDialogOpen(true);
                            }}
                            className="group flex items-center gap-3 bg-white text-black pl-4 pr-6 py-3.5 rounded-xl hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)] cursor-pointer"
                        >
                            <div className="bg-black text-white p-1 rounded-full group-hover:rotate-90 transition-transform">
                                <Plus size={20} strokeWidth={3} />
                            </div>
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t("reviewList.addAction")}</span>
                                <span className="text-lg font-bold">{t("reviewList.selectList")}</span>
                            </div>
                        </button>

                        <button
                            onClick={handleWishlistClick}
                            disabled={isButtonLoading}
                            className={`flex items-center gap-3 border px-6 py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                                isAdded
                                    ? "bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30"
                                    : "bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-white/20"
                            }`}
                        >
                            {isButtonLoading ? (
                                <Loader2 size={20} className="animate-spin text-zinc-400" />
                            ) : isAdded ? (
                                <Trash2 size={20} className="text-red-400" />
                            ) : (
                                <Gift size={20} className="text-pink-500" />
                            )}

                            <div className="flex flex-col items-start leading-none">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isAdded ? "text-red-400" : "text-white/40"}`}>
                                    {isAdded ? t("reviewList.removeAction") : t("reviewList.addAction")}
                                </span>
                                <span className="text-base font-bold mt-1">{t("reviewList.wishlistName")}</span>
                            </div>
                        </button>

                        <FavoriteButton gameId={game.rawgId} className="h-[70px] w-[58px] rounded-xl flex items-center justify-center bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20" />
                        <button
                            onClick={handleShare}
                            className="flex items-center justify-center w-14 bg-white/5 text-white border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer backdrop-blur-md"
                        >
                            <Share2 size={20} />
                        </button>

                        {isAdmin && !game.metacritic && (
                            <div className="flex items-center justify-center w-14 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500/20 hover:border-red-500/30 transition-all cursor-pointer backdrop-blur-md">
                                <AdminGameRefreshButton gameId={game.id} />
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-5 lg:flex lg:justify-end">
                        <GameRatingBar rating={game.gghubRating || 0} onRateClick={onOpenReviewModal} actionLabel={myReview ? t("reviewList.rateEdit") : t("reviewList.ratePrompt")} />
                    </div>
                </div>
                <GameAddToListDialog isOpen={isListDialogOpen} onClose={() => setIsListDialogOpen(false)} gameId={game.rawgId} />
            </div>
        </div>
    );
};
