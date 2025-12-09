"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getReviewsByUser } from "@/api/review/review.api";
import { Loader2, Star, MessageSquare, CircleArrowRight } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import { ReviewDetailDialog } from "./review-detail-dialog";
import { Review } from "@/models/review/review.model";
import placeholderGame from "@/core/assets/placeholder.png";

dayjs.locale("tr");

interface ProfileReviewsProps {
    username: string;
}

export default function ProfileReviews({ username }: ProfileReviewsProps) {
    const [selectedReview, setSelectedReview] = useState<Review | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { data: reviews, isLoading } = useQuery({
        queryKey: ["profile-reviews", username],
        queryFn: () => getReviewsByUser(username),
    });

    const handleReviewClick = (review: Review) => {
        setSelectedReview(review);
        setIsDialogOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!reviews || reviews.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed rounded-xl bg-muted/10">
                <div className="bg-muted/50 p-4 rounded-full mb-4">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Henüz inceleme yok</h3>
                <p className="text-muted-foreground mt-2 max-w-sm">
                    Bu kullanıcı henüz hiçbir oyun için inceleme yazmamış.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="grid gap-4">
                {reviews.map((review) => {
                    const imageSrc = review.game?.coverImage
                        || review.game?.backgroundImage
                        || placeholderGame.src;

                    return (
                        <div
                            key={review.id}
                            onClick={() => handleReviewClick(review)}
                            className="group relative flex flex-row overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/30 cursor-pointer h-40 md:h-48"
                        >
                            {/* Sol Taraf: Oyun Kapağı */}
                            <div className="w-28 md:w-36 shrink-0 bg-muted relative overflow-hidden">
                                <img
                                    src={imageSrc}
                                    alt={review.game?.name || "Oyun"}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />

                                {/* Puan Badge */}
                                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1 shadow-sm">
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                    {review.rating}
                                </div>
                            </div>

                            {/* Sağ Taraf: İçerik */}
                            <div className="flex-1 flex flex-col p-4 min-w-0">
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    <h3 className="font-bold text-base md:text-lg truncate group-hover:text-primary transition-colors">
                                        {review.game?.name}
                                    </h3>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
                                        {dayjs(review.createdAt).format("D MMM YYYY")}
                                    </span>
                                </div>

                                <p className="text-sm text-muted-foreground line-clamp-3 md:line-clamp-4 flex-1">
                                    {review.content}
                                </p>

                                <div className="flex items-center justify-end mt-auto pt-2 gap-2 text-xs font-medium text-primary">
                                    <span>Detayı Görüntüle</span>
                                    <CircleArrowRight className="h-3.5 w-3.5 animate-bounce-x" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <ReviewDetailDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                review={selectedReview}
            />
        </>
    );
}