import { createReview, updateReview } from "@/api/review/review.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { Review } from "@/models/gaming/game.model";

interface GameReviewDialogProps {
    isOpen: boolean;
    onClose: () => void;
    gameId: number;
    gameSlug: string;
    gameName: string;
    existingReview?: Review | null;
}

export const GameReviewDialog = ({ isOpen, onClose, gameId, gameSlug, gameName, existingReview }: GameReviewDialogProps) => {
    const queryClient = useQueryClient();
    const [rating, setRating] = useState(existingReview?.rating || 0);
    const [content, setContent] = useState(existingReview?.content || "");

    React.useEffect(() => {
        if (isOpen) {
            setRating(existingReview?.rating || 0);
            setContent(existingReview?.content || "");
        }
    }, [isOpen, existingReview]);

    const { mutate: submitReview, isPending } = useMutation({
        mutationFn: () => {
            if (existingReview) {
                return updateReview(existingReview.id, { rating, content });
            }
            return createReview({ gameId, rating, content });
        },
        onSuccess: () => {
            toast.success(existingReview ? "İnceleme Güncellendi" : "İnceleme Kaydedildi");

            queryClient.invalidateQueries({ queryKey: ["game", gameSlug] });
            queryClient.invalidateQueries({ queryKey: ["game", gameId.toString()] });
            queryClient.invalidateQueries({ queryKey: ["my-review", gameId] });
            queryClient.invalidateQueries({ queryKey: ["game-reviews", gameId] });
            onClose();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            toast.warning("Puan Vermediniz", { description: "Lütfen 1-10 arası bir puan seçin." });
            return;
        }
        if (!content.trim()) {
            toast.warning("Yorum Yazmadınız", { description: "Lütfen kısa da olsa düşüncelerinizi paylaşın." });
            return;
        }
        submitReview();
    };

    if (!isOpen) return null;

    const getRatingButtonClasses = (num: number, currentRating: number) => {
        const isActive = num <= currentRating;
        if (!isActive) {
            return "bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300";
        }
        if (num >= 9) {
            return "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]";
        }

        if (num >= 7) {
            return "bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]";
        }

        if (num >= 5) {
            return "bg-yellow-500 border-yellow-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]";
        }

        return "bg-red-500 border-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]";
    };
    const renderRatingButtons = () => {
        return (
            <div className="flex flex-wrap gap-2 justify-center mb-6">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                    <button
                        key={num}
                        type="button"
                        onClick={() => setRating(num)}
                        className={`w-8 h-10 rounded-md font-bold text-sm transition-all flex items-center justify-center border ${getRatingButtonClasses(num, rating)}`}
                    >
                        {num}
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-[#151515] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/50">
                    <div>
                        <h3 className="font-bold text-white text-lg">İnceleme Yaz</h3>
                        <p className="text-xs text-zinc-400">{gameName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} className="text-zinc-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6">
                    {/* Puanlama Alanı */}
                    <div className="mb-6 text-center">
                        <label className="block text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">
                            Puanınız ({rating}/10)
                        </label>
                        {renderRatingButtons()}
                        <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                            <span>Zayıf</span>
                            <div className="h-px w-20 bg-zinc-800"></div>
                            <span>Ortalama</span>
                            <div className="h-px w-20 bg-zinc-800"></div>
                            <span>Efsane</span>
                        </div>
                    </div>

                    {/* Yorum Alanı */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-zinc-400 mb-2 uppercase tracking-wider">
                            Düşünceleriniz
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Bu oyun hakkında ne düşünüyorsun? Hikaye, oynanış, grafikler..."
                            className="w-full h-32 bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none"
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="cursor-pointer px-5 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="cursor-pointer px-6 py-2.5 bg-white text-black rounded-lg text-sm font-bold hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isPending && <Loader2 size={16} className="animate-spin" />}
                            Gönder
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};