"use client";

import { useState, useEffect } from "react";
import { Star, Sparkles } from "lucide-react";
import { cn } from "@core/lib/utils";
import { Button } from "@core/components/ui/button";

interface ListRatingProps {
    myRating: number | null | undefined;
    onSubmitRating: (rating: number) => void;
    isPending: boolean;
    listOwnerId: number;
    currentUserId: number | undefined;
}

export function ListRating({ myRating, onSubmitRating, isPending, listOwnerId, currentUserId }: ListRatingProps) {
    const canRate = listOwnerId !== currentUserId;
    const [hoverRating, setHoverRating] = useState<number | null>(null);
    const [isEditingRating, setIsEditingRating] = useState(false);

    const totalStars = 5;

    useEffect(() => {
        setIsEditingRating(false);
    }, [myRating]);

    if (!canRate) {
        return <div className="text-sm text-muted-foreground italic"></div>;
    }

    if (myRating && !isEditingRating) {
        return (
            <div className="space-y-1">
                <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    <p className="text-sm font-medium">Sizin Puanınız</p>
                </div>
                <div className="flex items-center gap-1 py-2 px-2 bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/20 rounded-lg">
                    {[...Array(totalStars)].map((_, index) => {
                        const starValue = index + 1;
                        return (
                            <Star
                                key={starValue}
                                className={cn(
                                    "h-5 w-5 transition-all duration-200",
                                    starValue <= myRating ? "fill-yellow-500 text-yellow-500 drop-shadow-[0_0_6px_rgba(234,179,8,0.5)]" : "text-muted-foreground/30"
                                )}
                            />
                        );
                    })}
                </div>
                <Button
                    size="xs"
                    className="text-xs cursor-pointer underline decoration-slate-500 underline-offset-4 text-muted-foreground pl-0 h-auto"
                    variant="ghost"
                    onClick={() => setIsEditingRating(true)}
                    disabled={isPending}
                >
                    Değiştir
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <div className="flex items-center gap-1.5 mb-1">
                <Star className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">{isEditingRating ? "Yeni Puanınız:" : "Bu listeyi puanlayın:"}</p>
            </div>
            <div className="relative">
                <div
                    className="flex items-center gap-1 py-2 px-2 bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-dashed border-primary/30 rounded-lg hover:border-primary/50 transition-all duration-300"
                    onMouseLeave={() => setHoverRating(null)}
                >
                    {[...Array(totalStars)].map((_, index) => {
                        const starValue = index + 1;
                        const ratingToShow = hoverRating ?? (isEditingRating ? myRating : null);
                        const isFilled = ratingToShow ? starValue <= ratingToShow : false;
                        const isHovering = hoverRating === starValue;

                        return (
                            <Button
                                key={starValue}
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-5 w-5 p-0 hover:bg-transparent transition-all duration-200",
                                    isPending ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                                    isHovering && "scale-110"
                                )}
                                onMouseEnter={() => !isPending && setHoverRating(starValue)}
                                onClick={() => {
                                    if (!isPending) {
                                        onSubmitRating(starValue);
                                    }
                                }}
                                disabled={isPending}
                                aria-label={`${starValue} yıldız ver`}
                            >
                                <Star
                                    className={cn(
                                        "h-5 w-5 transition-all duration-200",
                                        isFilled ? "fill-yellow-500 text-yellow-500 drop-shadow-[0_0_6px_rgba(234,179,8,0.4)]" : "text-muted-foreground/40 hover:text-muted-foreground",
                                        isHovering && "scale-110"
                                    )}
                                />
                            </Button>
                        );
                    })}
                </div>

                {hoverRating && (
                    <div className="absolute -bottom-7 left-1/2 transform -translate-x-1/2 text-center">
                        <span className="text-[11px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">{hoverRating} / 5</span>
                    </div>
                )}
            </div>

            {isEditingRating && (
                <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setIsEditingRating(false)}
                    disabled={isPending}
                    className="text-xs cursor-pointer underline decoration-red-500 underline-offset-4 text-muted-foreground pl-0 h-auto"
                >
                    İptal
                </Button>
            )}
        </div>
    );
}
