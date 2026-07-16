"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dayjs from "dayjs";
import "dayjs/locale/en";
import "dayjs/locale/tr";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Check, Flag, Loader, Loader2, Pencil, Quote, Star, ThumbsDown, ThumbsUp, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { deleteReview, getReviewById, updateReview, voteReview } from "@/api/review/review.api";
import placeholderGame from "@/core/assets/placeholder.png";
import { MentionText } from "@/core/components/base/mention-text";
import { ReportDialog } from "@/core/components/base/report-dialog";
import { UserLink } from "@/core/components/base/user-link";
import { ReviewCommentSection } from "@/core/components/other/reviews/review-comment-section";
import { Button } from "@/core/components/ui/button";
import { Textarea } from "@/core/components/ui/textarea";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { useLocalizedHref } from "@/core/hooks/use-localized-href";
import { useAuth } from "@/core/hooks/use-auth";
import { cn } from "@/core/lib/utils";
import type { Review } from "@/models/review/review.model";

export default function ReviewDetailPage() {
    const params = useParams();
    const reviewId = Number(params.reviewId);
    const t = useI18n();
    const locale = useCurrentLocale();
    const localizeHref = useLocalizedHref();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const currentUserId = user ? Number(user.id) : undefined;

    const [voteScore, setVoteScore] = useState(0);
    const [currentUserVote, setCurrentUserVote] = useState<number | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState("");
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

    const {
        data: review,
        isLoading,
        isError,
    } = useQuery<Review>({
        queryKey: ["review", reviewId],
        queryFn: () => getReviewById(reviewId),
        enabled: Number.isFinite(reviewId) && reviewId > 0,
        retry: false,
    });

    useEffect(() => {
        dayjs.locale(locale === "tr" ? "tr" : "en");
    }, [locale]);

    useEffect(() => {
        if (!review) return;
        setVoteScore(review.voteScore);
        setCurrentUserVote(review.currentUserVote);
        setEditContent(review.content);
        setIsEditing(false);
    }, [review]);

    const voteMutation = useMutation({
        mutationFn: ({ id, value }: { id: number; value: number }) => voteReview(id, { value }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["review", reviewId] });
        },
        onError: () => toast.error(t("reviewList.voteError")),
    });

    const updateMutation = useMutation({
        mutationFn: () => {
            if (!review) return Promise.reject(new Error("review yok"));
            return updateReview(review.id, { content: editContent, rating: review.rating });
        },
        onSuccess: () => {
            toast.success(t("reviewList.updateSuccess"));
            setIsEditing(false);
            queryClient.invalidateQueries({ queryKey: ["review", reviewId] });
        },
        onError: () => toast.error(t("reviewList.updateError")),
    });

    const deleteMutation = useMutation({
        mutationFn: () => {
            if (!review) return Promise.reject(new Error("review yok"));
            return deleteReview(review.id);
        },
        onSuccess: () => {
            toast.success(t("reviewList.deleteSuccess"));
            queryClient.invalidateQueries({ queryKey: ["review", reviewId] });
        },
        onError: () => toast.error(t("reviewList.deleteError")),
    });

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center p-10">
                <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (isError || !review) {
        return (
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
                <h1 className="text-2xl font-bold">{t("reviewDetail.notFoundTitle")}</h1>
                <p className="text-sm text-muted-foreground">{t("reviewDetail.notFoundDescription")}</p>
                <Button asChild variant="outline" className="mt-2 cursor-pointer">
                    <Link href={localizeHref("/")}>{t("reviewDetail.backHome")}</Link>
                </Button>
            </div>
        );
    }

    const isOwner = currentUserId === review.user.id;
    const game = review.game;
    const imageSrc = game?.coverImage || game?.backgroundImage || placeholderGame.src;

    const handleVote = (value: number) => {
        if (!user) {
            toast.error(t("reviewComments.loginToVote"));
            return;
        }
        if (currentUserVote === value) return;

        const diff = currentUserVote === null ? value : value * 2;
        setVoteScore((prev) => prev + diff);
        setCurrentUserVote(value);
        voteMutation.mutate({ id: review.id, value });
    };

    const handleSaveUpdate = () => {
        if (editContent.trim() === "") {
            toast.warning(t("reviewComments.emptyError"));
            return;
        }
        updateMutation.mutate();
    };

    return (
        <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
            <article className="overflow-hidden rounded-xl border border-border bg-card/50">
                {/* Baslik: oyun kapagi + ad + puan + tarih */}
                <div className="border-b p-4 sm:p-6">
                    <div className="flex items-start gap-4">
                        {game && (
                            <Link href={localizeHref(`/games/${game.slug}`)} className="group shrink-0">
                                <div className="relative h-24 w-16 overflow-hidden rounded-md bg-muted shadow-sm md:h-32 md:w-24">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={imageSrc} alt={game.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                                </div>
                            </Link>
                        )}

                        <div className="flex-1 space-y-2 pt-1">
                            <h1 className="text-xl font-bold leading-tight md:text-2xl">
                                {game ? (
                                    <Link href={localizeHref(`/games/${game.slug}`)} className="transition-colors hover:text-primary">
                                        {game.name}
                                    </Link>
                                ) : (
                                    t("reviewDetail.notFoundTitle")
                                )}
                            </h1>

                            <div className="flex flex-wrap items-center gap-3">
                                <div
                                    className={cn(
                                        "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-bold",
                                        review.rating >= 8
                                            ? "border-green-500/20 bg-green-500/10 text-green-600"
                                            : review.rating >= 5
                                              ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-600"
                                              : "border-red-500/20 bg-red-500/10 text-red-600"
                                    )}
                                >
                                    <Star className="h-3.5 w-3.5 fill-current" />
                                    {review.rating}/10
                                </div>
                                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {dayjs(review.createdAt).format("D MMMM YYYY HH:mm")}
                                </span>
                            </div>

                            {/* Kalici sayfada inceleme sahibi acikca gosterilir (dialog'da ortuluydu). */}
                            <div className="flex items-center gap-2 pt-1">
                                <UserLink user={review.user} variant="avatar" avatarClassName="h-7 w-7 border border-border" />
                                <UserLink user={review.user} variant="name" className="text-sm font-semibold hover:underline" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Icerik */}
                <div className="p-4 sm:p-6">
                    {isEditing ? (
                        <div className="space-y-4">
                            <Textarea value={editContent} onChange={(event) => setEditContent(event.target.value)} className="min-h-[200px] text-base leading-relaxed" />
                            <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} disabled={updateMutation.isPending} className="cursor-pointer">
                                    <X className="mr-1 h-4 w-4" /> {t("reviewComments.cancel")}
                                </Button>
                                <Button size="sm" onClick={handleSaveUpdate} disabled={updateMutation.isPending} className="cursor-pointer">
                                    {updateMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                                    {t("reviewComments.save")}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="relative border-l-4 border-muted/50 pl-4 md:pl-6">
                            <Quote className="absolute -left-2.5 -top-2 h-5 w-5 bg-background p-0.5 text-muted-foreground/30" />
                            <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
                                <MentionText text={review.content} />
                            </p>
                        </div>
                    )}
                </div>

                {/* Aksiyonlar */}
                <div className="flex items-center justify-between border-t bg-muted/30 p-2 pl-4">
                    {!isOwner && (
                        <div className="flex items-center gap-1 rounded-full border bg-background px-1 py-0.5 shadow-sm">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-8 w-8 cursor-pointer rounded-full hover:bg-emerald-500/10 hover:text-emerald-600", currentUserVote === 1 && "bg-emerald-500/10 text-emerald-600")}
                                onClick={() => handleVote(1)}
                                aria-label={t("reviewComments.upvoteAria")}
                            >
                                <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <span
                                className={cn(
                                    "min-w-[2ch] px-1 text-center text-sm font-bold tabular-nums",
                                    voteScore > 0 && "text-emerald-600",
                                    voteScore < 0 && "text-red-600",
                                    voteScore === 0 && "text-muted-foreground"
                                )}
                            >
                                {voteScore > 0 ? `+${voteScore}` : voteScore}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-8 w-8 cursor-pointer rounded-full hover:bg-red-500/10 hover:text-red-600", currentUserVote === -1 && "bg-red-500/10 text-red-600")}
                                onClick={() => handleVote(-1)}
                                aria-label={t("reviewComments.downvoteAria")}
                            >
                                <ThumbsDown className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    <div className="ml-auto flex items-center gap-2">
                        {isOwner ? (
                            <>
                                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} disabled={isEditing} className="h-8 cursor-pointer text-xs">
                                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> {t("reviewComments.edit")}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteMutation.mutate()}
                                    disabled={deleteMutation.isPending}
                                    className="h-8 cursor-pointer text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> {t("reviewComments.delete")}
                                </Button>
                            </>
                        ) : (
                            user && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsReportDialogOpen(true)}
                                    className="h-8 cursor-pointer text-xs text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
                                >
                                    <Flag className="mr-1.5 h-3.5 w-3.5" /> {t("reviewComments.report")}
                                </Button>
                            )
                        )}
                    </div>
                </div>
            </article>

            <ReviewCommentSection reviewId={review.id} />

            <ReportDialog isOpen={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} entityType="Review" entityId={review.id} />
        </div>
    );
}
