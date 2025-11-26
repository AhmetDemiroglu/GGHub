import { Review } from "@/models/gaming/game.model";
import { ThumbsUp, ThumbsDown, User as UserIcon } from "lucide-react";
import React from "react";
import { ScoreBadge } from "../score-badge";

interface ReviewCardProps {
    review: Review;
    onVote?: (reviewId: number, value: number) => void;
}

export const ReviewCard = ({ review, onVote }: ReviewCardProps) => {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("tr-TR", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    };

    return (
        <div className="bg-card/50 border border-border rounded-xl p-6 hover:border-border/80 transition-colors">
            {/* Üst Kısım: Kullanıcı ve Puan */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    {/* Avatar (Placeholder) */}
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border overflow-hidden">
                        <UserIcon size={20} className="text-muted-foreground" />
                        {/* İleride gerçek avatar eklenebilir: <img src={review.user.avatarUrl} ... /> */}
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-foreground">{review.user.username}</h4>
                        <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                    </div>
                </div>

                {/* Puan Badge */}
                {/* ScoreBadge bileşeni 10 üzerinden puanı destekliyorsa kullan, yoksa manuel badge yap */}
                <div className={`px-3 py-1 rounded-lg font-bold text-sm border ${review.rating >= 8 ? "bg-green-500/10 text-green-500 border-green-500/20" :
                        review.rating >= 5 ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                            "bg-red-500/10 text-red-500 border-red-500/20"
                    }`}>
                    {review.rating}/10
                </div>
            </div>

            {/* İnceleme Metni */}
            <div className="mb-6">
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                    {review.content}
                </p>
            </div>

            {/* Alt Kısım: Etkileşim Butonları */}
            <div className="flex items-center gap-4 border-t border-border pt-4">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Bu inceleme yararlı mı?</span>

                <div className="flex gap-2">
                    <button
                        onClick={() => onVote?.(review.id, 1)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-xs font-medium text-foreground transition-colors cursor-pointer"
                    >
                        <ThumbsUp size={14} />
                        <span>Evet</span>
                    </button>

                    <button
                        onClick={() => onVote?.(review.id, -1)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-xs font-medium text-foreground transition-colors cursor-pointer"
                    >
                        <ThumbsDown size={14} />
                        <span>Hayır</span>
                    </button>
                </div>
            </div>
        </div>
    );
};