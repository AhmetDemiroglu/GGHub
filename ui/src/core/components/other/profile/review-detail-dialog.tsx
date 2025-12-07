"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/core/components/ui/dialog";
import { Review } from "@/models/review/review.model";
import { Star, Calendar, Quote, ThumbsUp, ThumbsDown, Trash2, Pencil, Flag, Check, X, Loader2 } from "lucide-react";
import dayjs from "dayjs";
import Link from "next/link";
import placeholderGame from "@/core/assets/placeholder.png";
import { useState, useEffect } from "react";
import { useAuth } from "@/core/hooks/use-auth";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/lib/utils";
import { Textarea } from "@/core/components/ui/textarea";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { voteReview, deleteReview, updateReview } from "@/api/review/review.api";
import { ReportDialog } from "@/core/components/base/report-dialog";

interface ReviewDetailDialogProps {
    isOpen: boolean;
    onClose: () => void;
    review: Review | null;
}

export function ReviewDetailDialog({ isOpen, onClose, review }: ReviewDetailDialogProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const currentUserId = user ? Number(user.id) : undefined;
    const [voteScore, setVoteScore] = useState(0);
    const [currentUserVote, setCurrentUserVote] = useState<number | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState("");
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

    useEffect(() => {
        if (review) {
            setVoteScore(review.voteScore);
            setCurrentUserVote(review.currentUserVote);
            setEditContent(review.content);
            setIsEditing(false);
        }
    }, [review, isOpen]);

    if (!review || !review.game) return null;

    const isOwner = currentUserId === review.user.id;
    const imageSrc = review.game.coverImage || review.game.backgroundImage || placeholderGame.src;

    const voteMutation = useMutation({
        mutationFn: ({ id, val }: { id: number, val: number }) => voteReview(id, { value: val }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["profile-reviews"] });
        },
        onError: () => {
            toast.error("Oy verilirken hata oluştu");
        }
    });

    const updateMutation = useMutation({
        mutationFn: () => updateReview(review.id, { content: editContent, rating: review.rating }),
        onSuccess: () => {
            toast.success("İnceleme güncellendi");
            setIsEditing(false);
            queryClient.invalidateQueries({ queryKey: ["profile-reviews"] });
            onClose();
        },
        onError: () => toast.error("Güncelleme başarısız")
    });

    const deleteMutation = useMutation({
        mutationFn: () => deleteReview(review.id),
        onSuccess: () => {
            toast.success("İnceleme silindi");
            onClose();
            queryClient.invalidateQueries({ queryKey: ["profile-reviews"] });
        },
        onError: () => toast.error("Silme işlemi başarısız")
    });

    const handleVote = (value: number) => {
        if (!user) {
            toast.error("Oy vermek için giriş yapmalısınız");
            return;
        }
        if (currentUserVote === value) return;

        let diff = 0;
        if (currentUserVote === null) diff = value;
        else if (currentUserVote !== value) diff = value * 2;

        setVoteScore(prev => prev + diff);
        setCurrentUserVote(value);

        voteMutation.mutate({ id: review.id, val: value });
    };

    const handleDelete = () => {
        if (confirm("Bu incelemeyi silmek istediğinize emin misiniz?")) {
            deleteMutation.mutate();
        }
    };

    const handleSaveUpdate = () => {
        if (editContent.trim() === "") {
            toast.warning("İçerik boş olamaz");
            return;
        }
        updateMutation.mutate();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent size="xl" className="max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col gap-0 p-0">
                {/* HEADER */}
                <div className="p-6 pb-4 border-b">
                    <DialogHeader className="flex flex-row items-start gap-4 space-y-0">
                        {/* Oyun Kapağı */}
                        <Link href={`/games/${review.game.slug}`} className="shrink-0 group">
                            <div className="h-24 w-16 md:h-32 md:w-24 rounded-md overflow-hidden bg-muted relative shadow-sm">
                                <img
                                    src={imageSrc}
                                    alt={review.game.name}
                                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                />
                            </div>
                        </Link>

                        <div className="flex-1 space-y-2 pt-1">
                            <DialogTitle className="text-xl md:text-2xl font-bold leading-tight">
                                <Link href={`/games/${review.game.slug}`} className="hover:text-primary transition-colors">
                                    {review.game.name}
                                </Link>
                            </DialogTitle>

                            <div className="flex items-center gap-3 flex-wrap">
                                <div className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-bold border",
                                    review.rating >= 8 ? "bg-green-500/10 text-green-600 border-green-500/20" :
                                        review.rating >= 5 ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" :
                                            "bg-red-500/10 text-red-600 border-red-500/20"
                                )}>
                                    <Star className="h-3.5 w-3.5 fill-current" />
                                    {review.rating}/10
                                </div>
                                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {dayjs(review.createdAt).format("D MMMM YYYY HH:mm")}
                                </span>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                {/* CONTENT */}
                <div className="p-6 py-4 flex-1">
                    {isEditing ? (
                        <div className="space-y-4">
                            <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="min-h-[200px] text-base leading-relaxed"
                            />
                            <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} disabled={updateMutation.isPending}>
                                    <X className="h-4 w-4 mr-1" /> İptal
                                </Button>
                                <Button size="sm" onClick={handleSaveUpdate} disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                                    Kaydet
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="relative pl-4 md:pl-6 border-l-4 border-muted/50">
                            <Quote className="absolute -left-2.5 -top-2 h-5 w-5 text-muted-foreground/30 bg-background p-0.5" />
                            <p className="text-base md:text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap">
                                {review.content}
                            </p>
                        </div>
                    )}
                </div>

                {/* FOOTER / ACTIONS */}
                <div className="p-2 pl-4 bg-muted/30 border-t flex items-center justify-between mt-auto">
                    {/* Sol: Oylama */}
                    {!isOwner && (
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground font-medium italic hidden sm:inline">Bu incelemeyi yararlı buldunuz mu?</span>
                            <div className="flex items-center gap-1 bg-background rounded-full border shadow-sm px-1 py-0.5">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-8 w-8 rounded-full hover:bg-emerald-500/10 hover:text-emerald-600 cursor-pointer",
                                        currentUserVote === 1 && "text-emerald-600 bg-emerald-500/10"
                                    )}
                                    onClick={() => handleVote(1)}
                                >
                                    <ThumbsUp className="h-4 w-4" />
                                </Button>

                                <span className={cn(
                                    "text-sm font-bold tabular-nums min-w-[2ch] text-center px-1",
                                    voteScore > 0 && "text-emerald-600",
                                    voteScore < 0 && "text-red-600",
                                    voteScore === 0 && "text-muted-foreground"
                                )}>
                                    {voteScore > 0 ? `+${voteScore}` : voteScore}
                                </span>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-8 w-8 rounded-full hover:bg-red-500/10 hover:text-red-600 cursor-pointer",
                                        currentUserVote === -1 && "text-red-600 bg-red-500/10"
                                    )}
                                    onClick={() => handleVote(-1)}
                                >
                                    <ThumbsDown className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Sağ: Yönetim (Edit/Delete/Report) */}
                    <div className="flex items-center gap-2 ml-auto">
                        {isOwner ? (
                            <>
                                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} disabled={isEditing} className="h-8 text-xs cursor-pointer">
                                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Düzenle
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDelete}
                                    disabled={deleteMutation.isPending}
                                    className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Sil
                                </Button>
                            </>
                        ) : (
                            user && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsReportDialogOpen(true)}
                                    className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 cursor-pointer"
                                >
                                    <Flag className="h-3.5 w-3.5 mr-1.5" /> Raporla
                                </Button>
                            )
                        )}
                    </div>
                </div>
            </DialogContent>

            <ReportDialog
                isOpen={isReportDialogOpen}
                onOpenChange={setIsReportDialogOpen}
                entityType="Review"
                entityId={review.id}
            />
        </Dialog>
    );
}