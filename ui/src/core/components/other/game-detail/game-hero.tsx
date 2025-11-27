import { Game } from "@/models/gaming/game.model";
import React, { useState } from "react";
import { PlatformIcons } from "@/core/components/other/platform-icons";
import { Calendar, Plus, Gift, Share2, MoreHorizontal, Loader2, Trash2, Check, ListPlus } from "lucide-react";
import { GameRatingBar } from "./game-rating-bar";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { checkWishlistStatus, toggleWishlist } from "@/api/list/list.api";
import { toast } from "sonner";
import { useAuth } from "@/core/hooks/use-auth";
import { GameAddToListDialog } from "./game-add-to-list-dialog";
import { createReview, getMyReview } from "@/api/review/review.api";

interface GameHeroProps {
    game: Game;
    onOpenReviewModal: () => void;
}

export const GameHero = ({ game, onOpenReviewModal }: GameHeroProps) => {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();

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
                description: data.isAdded ? "Oyun istek listenize eklendi." : "Oyun istek listenizden çıkarıldı."
            });
        },
        onError: (error) => {
            toast.error("İşlem başarısız oldu", {
                description: "Lütfen giriş yaptığınızdan emin olun."
            });
        }
    });

    const { data: myReview } = useQuery({
        queryKey: ["my-review", game.rawgId],
        queryFn: () => getMyReview(game.rawgId),
        enabled: !!isAuthenticated,
        retry: false
    });

    const isAdded = wishlistStatus?.isInWishlist ?? false;
    const isButtonLoading = isStatusLoading || isWishlistLoading;

    const handleWishlistClick = () => {
        if (!isAuthenticated) {
            toast.error("Giriş Yapmalısınız", { description: "Bu işlem için üye girişi gereklidir." });
            return;
        }
        mutateWishlist();
    };

    const handleShare = async () => {
        const url = window.location.href;
        try {
            await navigator.clipboard.writeText(url);
            toast.success("Link Kopyalandı", { description: "Oyun bağlantısı panoya kopyalandı." });
        } catch (err) {
            toast.error("Kopyalama Başarısız");
        }
    };

    const releaseDate = game.released
        ? new Date(game.released).toLocaleDateString("tr-TR", { month: "long", day: "numeric", year: "numeric" })
        : null;

    return (
        <div className="relative w-full min-h-[550px] overflow-hidden rounded-3xl shadow-2xl bg-background border border-white/5">
            {/* Arka Plan Görseli & Overlay */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 hover:scale-105"
                style={{ backgroundImage: `url(${game.backgroundImage || "/placeholder-game.jpg"})` }}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 via-30% to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
            </div>

            {/* İçerik Alanı */}s
            <div className="relative h-full flex flex-col justify-end pt-62 pb-0 md:px-12 md:pb-10 lg:px-16 lg:pb-12 z-10">

                {/* Meta Veriler */}
                <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-white/80 mb-4">
                    {releaseDate && (
                        <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                            <Calendar size={14} className="text-white/60" />
                            <span className="uppercase tracking-wide text-xs">{releaseDate}</span>
                        </div>
                    )}

                    {/* Platform İkonları Entegrasyonu */}
                    {game.platforms && game.platforms.length > 0 && (
                        <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                            <PlatformIcons platforms={game.platforms} />
                        </div>
                    )}
                </div>

                {/* Büyük Başlık */}
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-8 leading-[0.9] tracking-tight drop-shadow-2xl">
                    {game.name}
                </h1>

                {/* Ana Aksiyon Alanı (Grid) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:items-end">

                    {/* Sol Taraf: Butonlar */}
                    <div className="lg:col-span-7 flex flex-wrap gap-3">

                        {/* Add to List */}
                        <button
                            onClick={() => {
                                if (!isAuthenticated) {
                                    toast.error("Giriş Yapmalısınız");
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
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">EKLE</span>
                                <span className="text-lg font-bold">Liste Seç</span>
                            </div>
                        </button>

                        {/* İstek Listesine Ekle */}
                        <button
                            onClick={handleWishlistClick}
                            disabled={isButtonLoading}
                            className={`flex items-center gap-3 border px-6 py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${isAdded
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
                                    {isAdded ? "ÇIKAR" : "EKLE"}
                                </span>
                                <span className="text-base font-bold mt-1">İstek Listem</span>
                            </div>
                        </button>

                        {/* More Actions */}
                        <button
                            onClick={handleShare}
                            className="flex items-center justify-center w-14 bg-white/5 text-white border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer backdrop-blur-md"
                        >
                            <Share2 size={20} />
                        </button>
                    </div>

                    {/* Sağ Taraf: Rating Bar */}
                    <div className="lg:col-span-5 lg:flex lg:justify-end">
                        <GameRatingBar
                            rating={game.gghubRating || 0}
                            onRateClick={onOpenReviewModal}
                            actionLabel={myReview ? "Puanını Düzenle" : "Puan vermek için tıkla"}
                        />
                    </div>
                </div>
                <GameAddToListDialog
                    isOpen={isListDialogOpen}
                    onClose={() => setIsListDialogOpen(false)}
                    gameId={game.rawgId}
                />
            </div>
        </div>
    );
};