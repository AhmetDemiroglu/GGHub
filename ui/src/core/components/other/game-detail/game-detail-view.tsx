"use client";

import { gameApi } from "@/api/gaming/game.api";
import { GameAbout } from "@/core/components/other/game-detail/game-about";
import { GameHero } from "@/core/components/other/game-detail/game-hero";
import { GameSidebar } from "@/core/components/other/game-detail/game-sidebar";
import { ReviewList } from "@/core/components/other/game-detail/review-list";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { AxiosError } from "axios";
import { GameReviewDialog } from "@/core/components/other/game-detail/game-review-dialog";
import { useAuth } from "@/core/hooks/use-auth";
import { useI18n } from "@/core/contexts/locale-context";
import { toast } from "sonner";
import { getMyReview } from "@/api/review/review.api";
import { GameSimilarSlider } from "@/core/components/other/game-detail/game-similar-slider";
import { Button } from "@/core/components/ui/button";
import type { Game } from "@/models/gaming/game.model";
import type { Review } from "@/models/review/review.model";
import { isUnreleased } from "@/core/lib/game-release";

interface GameDetailViewProps {
    idOrSlug: string;
    /** Sunucuda cekilen oyun (page.tsx). null: API'ye ulasilamadi, istemci kendi istegini atar. */
    initialGame?: Game | null;
    initialReviews?: Review[] | null;
}

export const GameDetailView = ({ idOrSlug, initialGame = null, initialReviews = null }: GameDetailViewProps) => {
    const [isReviewDialogOpen, setIsReviewDialogOpen] = React.useState(false);
    const { isAuthenticated } = useAuth();
    const t = useI18n();

    const { data: game, isLoading, isError, error, refetch } = useQuery({
        queryKey: ["game", idOrSlug],
        queryFn: () => gameApi.getById(idOrSlug),
        enabled: !!idOrSlug,
        // Sunucudan gelen oyun ilk HTML'de cizilir. Sayfa Vercel CDN'inde gunlerce onbellekli
        // (next.config.ts headers), bu yuzden veri bayat sayilir ve istemci acilista bir kez tazeler.
        initialData: initialGame ?? undefined,
        initialDataUpdatedAt: 0,
        // Hata durumu bu sayfada kendi ekranıyla gösteriliyor; global toast çift bildirim olur.
        meta: { suppressGlobalToast: true },
        retry: 1,
    });

    const { data: myReview } = useQuery({
        queryKey: ["my-review", game?.rawgId],
        queryFn: () => getMyReview(game!.rawgId),
        enabled: !!game && !!isAuthenticated,
        retry: false
    });

    // Cikmamis oyuna inceleme yok: butonlar kilit metni gosterir, tiklayan aciklama gorur.
    const reviewLocked = isUnreleased(game?.released);

    const handleOpenReviewModal = () => {
        if (!isAuthenticated) {
            toast.error("Giriş Yapmalısınız");
            return;
        }
        if (reviewLocked) {
            toast.info(t("reviewList.lockedUntilRelease"));
            return;
        }
        setIsReviewDialogOpen(true);
    };

    if (isLoading) return null;

    if (isError || !game) {
        // 404 = oyun gerçekten yok; diğer her şey (timeout, 503 catalog_unavailable, ağ hatası)
        // geçicidir ve "bulunamadı" yalanı yerine tekrar dene seçeneği gösterilir.
        const status = error instanceof AxiosError ? error.response?.status : undefined;
        const isTransient = isError && status !== 404;

        return (
            <div className="w-full h-full p-10 flex flex-col items-center justify-center space-y-4">
                <h2 className="text-3xl font-bold text-foreground">
                    {t(isTransient ? "gameDetail.unavailableTitle" : "gameDetail.notFoundTitle")}
                </h2>
                <p className="text-muted-foreground">
                    {t(isTransient ? "gameDetail.unavailableDescription" : "gameDetail.notFoundDescription")}
                </p>
                {isTransient ? (
                    <Button variant="outline" className="cursor-pointer" onClick={() => refetch()}>
                        {t("gameDetail.retry")}
                    </Button>
                ) : null}
            </div>
        );
    }

    return (
        <div className="w-full min-h-full bg-background text-foreground pb-5">
            <div className="max-w-[1600px] mx-auto px-4 md:px-5 pt-5 space-y-8">

                <GameHero
                    game={game}
                    onOpenReviewModal={handleOpenReviewModal}
                    reviewLocked={reviewLocked}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
                    <div className="lg:col-span-2 space-y-12">
                        <GameAbout game={game} />

                        <div id="reviews" className="pt-8 border-t border-border">
                            <ReviewList
                                gameId={game.rawgId}
                                gameName={game.name}
                                gameSlug={game.slug}
                                initialReviews={initialReviews}
                                onAddReview={handleOpenReviewModal}
                                reviewLocked={reviewLocked}
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
