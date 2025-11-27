"use client";

import { gameApi } from "@/api/gaming/game.api";
import { GameAbout } from "@/core/components/other/game-detail/game-about";
import { GameHero } from "@/core/components/other/game-detail/game-hero";
import { GameSidebar } from "@/core/components/other/game-detail/game-sidebar";
import { ReviewList } from "@/core/components/other/game-detail/review-list";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { GameReviewDialog } from "@/core/components/other/game-detail/game-review-dialog";
import { useAuth } from "@/core/hooks/use-auth";
import { toast } from "sonner";
import { getMyReview } from "@/api/review/review.api";
import { GameSimilarSlider } from "@/core/components/other/game-detail/game-similar-slider"; // Slider ekli

interface GameDetailViewProps {
    idOrSlug: string;
}

export const GameDetailView = ({ idOrSlug }: GameDetailViewProps) => {
    const [isReviewDialogOpen, setIsReviewDialogOpen] = React.useState(false);
    const { isAuthenticated } = useAuth();

    const handleOpenReviewModal = () => {
        if (!isAuthenticated) {
            toast.error("Giriş Yapmalısınız");
            return;
        }
        setIsReviewDialogOpen(true);
    };

    const { data: game, isLoading, isError } = useQuery({
        queryKey: ["game", idOrSlug],
        queryFn: () => gameApi.getById(idOrSlug),
        enabled: !!idOrSlug,
    });

    const { data: myReview } = useQuery({
        queryKey: ["my-review", game?.rawgId],
        queryFn: () => getMyReview(game!.rawgId),
        enabled: !!game && !!isAuthenticated,
        retry: false
    });

    if (isLoading) return null;

    if (isError || !game) {
        return (
            <div className="w-full h-full p-10 flex flex-col items-center justify-center space-y-4">
                <h2 className="text-3xl font-bold text-foreground">Oyun Bulunamadı</h2>
                <p className="text-muted-foreground">Aradığınız oyun sistemde mevcut değil veya kaldırılmış.</p>
            </div>
        );
    }

    return (
        <div className="w-full min-h-full bg-background text-foreground pb-10">
            <div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-6 space-y-8">

                <GameHero
                    game={game}
                    onOpenReviewModal={handleOpenReviewModal}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
                    <div className="lg:col-span-2 space-y-12">
                        <GameAbout game={game} />

                        <div id="reviews" className="pt-8 border-t border-border">
                            <ReviewList
                                gameId={game.rawgId}
                                gameName={game.name}
                                gameSlug={game.slug}
                                onAddReview={handleOpenReviewModal}
                            />
                        </div>
                    </div>

                    <div className="space-y-8">
                        <GameSidebar game={game} />
                    </div>
                </div>

                <GameSimilarSlider rawgId={game.rawgId} />
            </div>

            {game && (
                <GameReviewDialog
                    isOpen={isReviewDialogOpen}
                    onClose={() => setIsReviewDialogOpen(false)}
                    gameId={game.rawgId}
                    gameSlug={game.slug}
                    gameName={game.name}
                    existingReview={myReview}
                />
            )}
        </div>
    );
};