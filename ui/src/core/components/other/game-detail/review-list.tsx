import { getGameReviews, voteReview, deleteReview, updateReview } from "@/api/review/review.api";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@core/components/base/providers";
import { Loader2, MessageSquare, Plus } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { ReviewCard } from "./review-card";
import { useAuth } from "@/core/hooks/use-auth";
import { Input } from "@core/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@core/components/ui/select";
import { Search, SortAsc } from "lucide-react";

interface ReviewListProps {
    gameId: number;
    gameName: string;
    gameSlug: string;
    onAddReview?: () => void;
}

export const ReviewList = ({ gameId, gameName, gameSlug, onAddReview }: ReviewListProps) => {
    const { isAuthenticated } = useAuth();

    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("newest");

    const { data: reviews, isLoading } = useQuery({
        queryKey: ["game-reviews", gameId],
        queryFn: () => getGameReviews(gameId),
    });

    const { mutate: submitVote } = useMutation({
        mutationFn: ({ reviewId, value }: { reviewId: number; value: number }) =>
            voteReview(reviewId, { value }),
        onSuccess: () => {
            toast.success("Geri bildiriminiz alındı");
        },
        onError: (error: any) => {
        }
    });

    const { mutate: mutateDelete } = useMutation({
        mutationFn: (reviewId: number) => deleteReview(reviewId),
        onSuccess: () => {
            toast.success("İnceleme silindi");
            queryClient.invalidateQueries({ queryKey: ["game-reviews", gameId] });
            queryClient.invalidateQueries({ queryKey: ["game", gameSlug] });
            queryClient.invalidateQueries({ queryKey: ["game", gameId.toString()] });
            queryClient.invalidateQueries({ queryKey: ["my-review", gameId] });
        },
        onError: () => toast.error("Silme işlemi başarısız")
    });

    const { mutate: mutateUpdate } = useMutation({
        mutationFn: ({ id, content }: { id: number, content: string }) =>
            updateReview(id, { content, rating: 0 })
        ,
        onSuccess: () => {
            toast.success("İnceleme güncellendi");
            queryClient.invalidateQueries({ queryKey: ["game-reviews", gameId] });
        },
        onError: () => toast.error("Güncelleme başarısız")
    });

    const filteredReviews = React.useMemo(() => {
        if (!reviews) return [];
        let result = [...reviews];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(r =>
                r.content.toLowerCase().includes(query) ||
                r.user.username.toLowerCase().includes(query)
            );
        }

        switch (sortBy) {
            case "newest":
                result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                break;
            case "helpful":
                result.sort((a, b) => (b.voteScore || 0) - (a.voteScore || 0));
                break;
            case "highest":
                result.sort((a, b) => b.rating - a.rating);
                break;
            case "lowest":
                result.sort((a, b) => a.rating - b.rating);
                break;
        }

        return result;
    }, [reviews, searchQuery, sortBy]);

    const handleDelete = (id: number) => mutateDelete(id);
    const handleUpdate = (id: number, content: string) => {
        const originalReview = reviews?.find(r => r.id === id);
        if (originalReview) {
            updateReview(id, { rating: originalReview.rating, content }).then(() => {
                toast.success("Güncellendi");
                queryClient.invalidateQueries({ queryKey: ["game-reviews", gameId] });
            });
        }
    };

    const handleVote = (reviewId: number, value: number) => {
        if (!isAuthenticated) {
            toast.error("Giriş Yapmalısınız");
            return;
        }
        submitVote({ reviewId, value });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 size={32} className="animate-spin text-zinc-500" />
            </div>
        );
    }

    if (!reviews || reviews.length === 0) {
        return (
            <div className="bg-muted/30 border border-border rounded-xl p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <MessageSquare size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Henüz İnceleme Yok</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    <span className="font-semibold text-foreground">{gameName}</span> hakkında ilk incelemeyi sen yaz ve topluluğa yön ver!
                </p>
                <button
                    onClick={onAddReview}
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-all flex items-center gap-2 cursor-pointer"
                >
                    <MessageSquare size={18} />
                    İlk İncelemeyi Yaz
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header ve Filtreler */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-bold text-foreground flex items-center gap-3"> {/* text-white -> text-foreground */}
                        Kullanıcı İncelemeleri
                        <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                            {filteredReviews.length}
                        </span>
                    </h3>

                    <button
                        onClick={onAddReview}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                        <Plus size={14} /> İnceleme Yaz
                    </button>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Arama */}
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="İncelemelerde ara..."
                            className="pl-9 bg-card/50 border-zinc-800"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Sıralama */}
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[180px] bg-card/50 border-zinc-800">
                            <div className="flex items-center gap-2">
                                <SortAsc className="h-4 w-4 text-muted-foreground" />
                                <SelectValue placeholder="Sıralama" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">En Yeniler</SelectItem>
                            <SelectItem value="helpful">En Yararlılar</SelectItem>
                            <SelectItem value="highest">En Yüksek Puan</SelectItem>
                            <SelectItem value="lowest">En Düşük Puan</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Liste */}
            <div className="grid gap-6">
                {filteredReviews.length > 0 ? (
                    filteredReviews.map((review) => (
                        <ReviewCard
                            key={review.id}
                            review={review}
                            onVote={handleVote}
                            onDelete={handleDelete}
                            onUpdate={handleUpdate}
                        />
                    ))
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        {searchQuery ? "Aradığınız kriterlere uygun inceleme bulunamadı." : "Henüz inceleme yok."}
                    </div>
                )}
            </div>
        </div>
    );
};