import { Review } from "@/models/gaming/game.model";
import { ThumbsUp, ThumbsDown, User as UserIcon, Trash2, Pencil, Flag, Check, X } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/core/hooks/use-auth";
import { getImageUrl } from "@/core/lib/get-image-url";
import { Avatar, AvatarFallback, AvatarImage } from "@core/components/ui/avatar";
import { ReportDialog } from "@core/components/base/report-dialog";
import { Button } from "@core/components/ui/button";
import { Textarea } from "@core/components/ui/textarea";
import { cn } from "@core/lib/utils";
import Link from "next/link";

interface ReviewCardProps {
    review: Review;
    onVote?: (reviewId: number, value: number) => void;
    onDelete?: (reviewId: number) => void;
    onUpdate?: (reviewId: number, content: string) => void;
}

export const ReviewCard = ({ review, onVote, onDelete, onUpdate }: ReviewCardProps) => {
    const { user } = useAuth();
    const currentUserId = user ? Number(user.id) : undefined;
    const isOwner = currentUserId === review.user.id;

    const [isExpanded, setIsExpanded] = useState(false);
    const isLongContent = review.content.length > 200;

    const handleSaveUpdate = () => {
        if (onUpdate && editContent.trim() !== "") {
            onUpdate(review.id, editContent);
            setIsEditing(false);
        } else {
            toast.warning("İçerik boş olamaz");
        }
    };

    const handleDelete = () => {
        if (confirm("Bu incelemeyi silmek istediğinize emin misiniz?")) {
            onDelete?.(review.id);
        }
    };

    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(review.content);
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

    const avatarSrc = getImageUrl(review.user.profileImageUrl);
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("tr-TR", {
            year: "numeric", month: "long", day: "numeric"
        });
    };

    const handleUpdate = () => {
        if (onUpdate) {
            onUpdate(review.id, editContent);
            setIsEditing(false);
        }
    };

    const [voteScore, setVoteScore] = useState(review.voteScore);
    const [currentUserVote, setCurrentUserVote] = useState<number | null>(review.currentUserVote);

    React.useEffect(() => {
        setVoteScore(review.voteScore);
        setCurrentUserVote(review.currentUserVote);
    }, [review.voteScore, review.currentUserVote]);

    const handleVote = (value: number) => {
        if (!onVote) return;
        if (currentUserVote === value) return;
        let diff = 0;
        if (currentUserVote === null) {
            diff = value;
        } else if (currentUserVote !== value) {
            diff = value * 2;
        }

        setVoteScore(prev => prev + diff);
        setCurrentUserVote(value);

        onVote(review.id, value);
    };

    return (
        <div className="bg-card/50 border border-border rounded-xl pt-4 px-4 hover:border-border/80 transition-colors">
            {/* Üst Kısım: Avatar ve Info */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Link href={`/profiles/${review.user.username}`}>
                        <Avatar className="h-10 w-10 border border-border cursor-pointer">
                            <AvatarImage src={avatarSrc} />
                            <AvatarFallback>{review.user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </Link>
                    <div>
                        <Link href={`/profiles/${review.user.username}`} className="text-sm font-bold text-foreground hover:underline">
                            {review.user.username}
                        </Link>
                        <div className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</div>
                    </div>
                </div>

                {/* Puan Badge */}
                <div className={`px-3 py-1 rounded-lg font-bold text-sm border ${review.rating >= 8 ? "bg-green-500/10 text-green-500 border-green-500/20" :
                    review.rating >= 5 ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                        "bg-red-500/10 text-red-500 border-red-500/20"
                    }`}>
                    {review.rating}/10
                </div>
            </div>

            {/* İnceleme İçeriği */}
            <div className="mb-4">
                {isEditing ? (
                    <div className="space-y-3">
                        <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[100px]"
                        />
                        <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveUpdate} className="gap-2 cursor-pointer">
                                <Check size={14} /> Kaydet
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="gap-2 cursor-pointer">
                                <X size={14} /> İptal
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className={cn(
                            "text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap transition-all",
                            !isExpanded && isLongContent && "line-clamp-3"
                        )}>
                            {review.content}
                        </p>
                        {isLongContent && (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="text-xs font-medium text-primary mt-1 hover:underline cursor-pointer"
                            >
                                {isExpanded ? "Daha Az Göster" : "Daha Fazla Göster"}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Alt Aksiyonlar */}
            <div className="flex items-center justify-between border-t border-border py-1">
                {/* Sol Taraf */}
                {!isOwner && (
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground font-medium italic tracking-wider">Bu incelemeyi yararlı buldunuz mu?</span>

                        <div className="flex items-center gap-0.5">
                            {/* Thumbs Up */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-7 w-7 text-xs hover:bg-emerald-500/10 hover:text-emerald-500 cursor-pointer",
                                    currentUserVote === 1 && "text-emerald-500 bg-emerald-500/10"
                                )}
                                onClick={() => handleVote(1)}
                            >
                                <ThumbsUp className="h-4 w-4" />
                            </Button>

                            {/* Score */}
                            <span className={cn(
                                "text-sm font-semibold tabular-nums min-w-[2ch] text-center",
                                voteScore > 0 && "text-emerald-600",
                                voteScore < 0 && "text-red-600",
                                voteScore === 0 && "text-muted-foreground"
                            )}>
                                {voteScore > 0 ? `+${voteScore}` : voteScore}
                            </span>

                            {/* Thumbs Down */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-7 w-7 text-xs hover:bg-red-500/10 hover:text-red-500 cursor-pointer",
                                    currentUserVote === -1 && "text-red-500 bg-red-500/10"
                                )}
                                onClick={() => handleVote(-1)}
                            >
                                <ThumbsDown className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Sağ Taraf */}
                <div className="flex items-center gap-2 ml-auto">
                    {isOwner ? (
                        <>
                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} disabled={isEditing} className="cursor-pointer h-8 text-xs">
                                <Pencil size={14} className="mr-1" /> Düzenle
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleDelete} className="cursor-pointer h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 size={14} className="mr-1" /> Sil
                            </Button>
                        </>
                    ) : (
                        // Başkasıysa Raporla Butonu
                        user && (
                            <Button variant="ghost" size="sm" onClick={() => setIsReportDialogOpen(true)} className="cursor-pointer h-8 text-xs text-muted-foreground hover:text-destructive">
                                <Flag size={14} className="mr-1" /> Raporla
                            </Button>
                        )
                    )}
                </div>
            </div>

            <ReportDialog isOpen={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} entityType="Review" entityId={review.id} />
        </div>
    );
}; 