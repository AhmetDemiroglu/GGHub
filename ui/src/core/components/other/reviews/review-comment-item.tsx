"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";
import "dayjs/locale/tr";
import { Check, Flag, MessageSquare, Pencil, ThumbsDown, ThumbsUp, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { MentionText } from "@core/components/base/mention-text";
import { ReportDialog } from "@core/components/base/report-dialog";
import { UserLink } from "@core/components/base/user-link";
import { Button } from "@core/components/ui/button";
import { Textarea } from "@core/components/ui/textarea";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { useAuth } from "@core/hooks/use-auth";
import { displayName } from "@/core/lib/display-name";
import { cn } from "@core/lib/utils";
import type { ReviewComment, ReviewCommentForCreation } from "@/models/review/review-comment.model";

import { ReviewCommentForm } from "./review-comment-form";

dayjs.extend(relativeTime);

/** Bu derinlikten sonra yanit verilemez; girinti okunmaz hale geliyor. */
const MAX_REPLY_DEPTH = 2;
/** X modeli: az sayida yanit dogrudan gorunur, kalabaliksa katlanir. */
const AUTO_EXPAND_REPLY_LIMIT = 3;

interface ReviewCommentItemProps {
    comment: ReviewComment;
    onVote: (commentId: number, value: number) => void;
    /** Bekleyen islemler id ile tasinir; kokun bayragi yanitlara sizmasin diye. */
    votingCommentId: number | null;
    onDelete: (commentId: number) => void;
    deletingCommentId: number | null;
    onSubmitComment: (data: ReviewCommentForCreation) => Promise<unknown>;
    /** Ucusta olan TUM yanit gonderimleri. Tek id yetmiyordu: es zamanli iki gonderimde
     * biri digerinin gostergesini sifirlayip cift gonderim penceresi aciyordu. */
    submittingParentIds: ReadonlySet<number | null>;
    onUpdateComment: (commentId: number, content: string) => Promise<unknown>;
    updatingCommentId: number | null;
    depth?: number;
}

export function ReviewCommentItem({
    comment,
    onVote,
    votingCommentId,
    onDelete,
    deletingCommentId,
    onSubmitComment,
    submittingParentIds,
    onUpdateComment,
    updatingCommentId,
    depth = 0,
}: ReviewCommentItemProps) {
    const t = useI18n();
    const locale = useCurrentLocale();
    const { user } = useAuth();
    const currentUserId = user ? Number(user.id) : undefined;
    const isOwner = currentUserId === comment.owner.id;

    const replyCount = comment.replies?.length ?? 0;

    /**
     * null = kullanici henuz ac/kapa karari vermedi, otomatik davran.
     *
     * Eskiden useState(replyCount > 0 && ...) idi ve useState BASLANGIC degerini
     * yalnizca ilk mount'ta hesaplar: 0 yanitla acilan bir yorum showReplies=false
     * kaliyordu, sonra yanit yazinca yanit gelmesine ragmen GIZLI kaliyordu ve
     * kullanicinin "Yanitlari Goster"e basmasi gerekiyordu.
     */
    const [repliesOverride, setRepliesOverride] = useState<boolean | null>(null);
    const showReplies = repliesOverride ?? (replyCount > 0 && replyCount <= AUTO_EXPAND_REPLY_LIMIT);
    const [isReplying, setIsReplying] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

    // Duzenleme kapaliyken tampon sunucudaki icerikle senkron kalsin.
    useEffect(() => {
        if (!isEditing) {
            setEditContent(comment.content);
        }
    }, [comment.content, isEditing]);

    const isVoting = votingCommentId === comment.id;
    const isDeleting = deletingCommentId === comment.id;
    const isUpdatingComment = updatingCommentId === comment.id;
    const isSubmittingReply = submittingParentIds.has(comment.id);

    const voteScore = comment.upvotes - comment.downvotes;
    const currentUserVote = comment.currentUserVote;
    const timeAgo = dayjs(comment.createdAt).locale(locale === "tr" ? "tr" : "en").fromNow();
    const ownerName = displayName(comment.owner);
    const canVote = !isVoting && !isOwner;

    const handleVoteClick = (value: number) => {
        if (!user) {
            toast.error(t("reviewComments.loginToVote"));
            return;
        }
        if (canVote) {
            onVote(comment.id, value);
        }
    };

    const handleSaveEdit = async () => {
        try {
            await onUpdateComment(comment.id, editContent);
            setIsEditing(false);
        } catch {
            // Basarisizsa duzenleyici acik kalir; hata mesajini bolum toast ile gosterir.
        }
    };

    return (
        <div
            className={cn(
                "flex flex-col gap-2 sm:flex-row sm:gap-3",
                depth === 0 &&
                    "rounded-lg border border-border bg-card p-3 transition-all duration-200 hover:bg-card/80 hover:shadow-[0_0_10px_1px_rgba(255,255,255,0.2)] sm:p-4"
            )}
        >
            {/* Avatar */}
            <div className="flex items-center gap-2 sm:block sm:gap-0">
                <UserLink user={comment.owner} variant="avatar" className="flex-shrink-0" avatarClassName="h-8 w-8 sm:h-9 sm:w-9" />
                {/* Mobilde kullanici adi avatarin yaninda */}
                <div className="flex items-baseline gap-2 text-sm sm:hidden">
                    <UserLink user={comment.owner} variant="name" className="font-semibold hover:underline" />
                    <span className="text-xs text-muted-foreground">{timeAgo}</span>
                </div>
            </div>

            <div className="flex-1 space-y-1">
                {/* Kullanici adi ve zaman (masaustu) */}
                <div className="hidden items-baseline gap-2 text-sm sm:flex">
                    <UserLink user={comment.owner} variant="name" className="font-semibold hover:underline" />
                    <span className="text-xs text-muted-foreground">{timeAgo}</span>
                </div>

                {/* Icerik */}
                {!isEditing ? (
                    <p className="whitespace-pre-wrap text-sm">
                        <MentionText text={comment.content} />
                    </p>
                ) : (
                    <div className="space-y-2">
                        <Textarea
                            value={editContent}
                            onChange={(event) => setEditContent(event.target.value)}
                            className="min-h-[80px] resize-none text-sm"
                            disabled={isUpdatingComment}
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <Button size="sm" variant="default" className="cursor-pointer" onClick={handleSaveEdit} disabled={isUpdatingComment || editContent.trim().length === 0}>
                                <Check className="mr-1 h-3 w-3" /> {t("reviewComments.save")}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="cursor-pointer"
                                onClick={() => {
                                    setIsEditing(false);
                                    setEditContent(comment.content);
                                }}
                                disabled={isUpdatingComment}
                            >
                                <X className="mr-1 h-3 w-3" /> {t("reviewComments.cancel")}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Aksiyonlar */}
                <div className="flex flex-wrap items-center gap-1 pt-1 text-muted-foreground sm:gap-3">
                    <div className="flex items-center gap-0.5">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-6 w-6 text-xs hover:bg-emerald-500/10 hover:text-emerald-500 sm:h-7 sm:w-7",
                                currentUserVote === 1 && "bg-emerald-500/10 text-emerald-500",
                                isVoting || isOwner || !user ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                            )}
                            onClick={() => handleVoteClick(1)}
                            disabled={isVoting || isOwner || !user}
                            aria-label={t("reviewComments.upvoteAria")}
                        >
                            <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <span
                            className={cn(
                                "min-w-[2ch] text-center text-sm font-semibold tabular-nums",
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
                            className={cn(
                                "h-7 w-7 text-xs hover:bg-red-500/10 hover:text-red-500",
                                currentUserVote === -1 && "bg-red-500/10 text-red-500",
                                isVoting || isOwner || !user ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                            )}
                            onClick={() => handleVoteClick(-1)}
                            disabled={isVoting || isOwner || !user}
                            aria-label={t("reviewComments.downvoteAria")}
                        >
                            <ThumbsDown className="h-4 w-4" />
                        </Button>
                    </div>

                    {user && depth < MAX_REPLY_DEPTH && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto cursor-pointer px-2 py-1 text-xs hover:bg-primary/10 hover:text-primary"
                            onClick={() => setIsReplying(!isReplying)}
                        >
                            <MessageSquare className="mr-1 h-3 w-3" /> {isReplying ? t("reviewComments.cancel") : t("reviewComments.reply")}
                        </Button>
                    )}

                    {isOwner && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto cursor-pointer px-2 py-1 text-xs hover:bg-primary/10 hover:text-primary"
                                onClick={() => {
                                    setIsEditing(true);
                                    setEditContent(comment.content);
                                }}
                                disabled={isEditing || isUpdatingComment}
                            >
                                <Pencil className="mr-1 h-3 w-3" /> {t("reviewComments.edit")}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto cursor-pointer px-2 py-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => onDelete(comment.id)}
                                disabled={isDeleting || isEditing}
                            >
                                <Trash2 className="mr-1 h-3 w-3" /> {t("reviewComments.delete")}
                            </Button>
                        </>
                    )}

                    {user && !isOwner && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto cursor-pointer px-2 py-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setIsReportDialogOpen(true)}
                            disabled={isEditing || isDeleting}
                        >
                            <Flag className="mr-1 h-3 w-3" /> {t("reviewComments.report")}
                        </Button>
                    )}

                    {comment.updatedAt && <span className="text-xs italic">{t("reviewComments.edited")}</span>}
                </div>

                {/* Satir ici yanit formu */}
                {isReplying && (
                    <div className="pt-2">
                        <ReviewCommentForm
                            onSubmit={async (values) => {
                                await onSubmitComment(values);
                                setIsReplying(false);
                                // Yanit kokun replies dizisine gomulu doner; katli kalirsa kullanici hicbir sey gormez.
                                setRepliesOverride(true);
                            }}
                            isPending={isSubmittingReply}
                            parentCommentId={comment.id}
                            onCancelReply={() => setIsReplying(false)}
                            placeholder={t("reviewComments.replyPlaceholder", { name: ownerName })}
                        />
                    </div>
                )}

                {/* Yanitlari goster/gizle: yalnizca katlanacak kadar cok yanit varsa anlamli */}
                {replyCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 h-auto cursor-pointer px-2 py-1 text-xs text-muted-foreground hover:text-primary"
                        onClick={() => setRepliesOverride(!showReplies)}
                        aria-expanded={showReplies}
                    >
                        {showReplies ? t("reviewComments.hideReplies") : t("reviewComments.showReplies", { count: replyCount })}
                    </Button>
                )}

                {/* Ozyinelemeli yanitlar */}
                {showReplies && replyCount > 0 && (
                    <div className="mt-2 space-y-3">
                        {comment.replies.map((reply) => (
                            <div key={reply.id} className="ml-2 border-l-2 border-border/40 pl-1 sm:ml-6 sm:pl-3 md:ml-8 md:pl-4">
                                <ReviewCommentItem
                                    comment={reply}
                                    onVote={onVote}
                                    votingCommentId={votingCommentId}
                                    onDelete={onDelete}
                                    deletingCommentId={deletingCommentId}
                                    onSubmitComment={onSubmitComment}
                                    submittingParentIds={submittingParentIds}
                                    onUpdateComment={onUpdateComment}
                                    updatingCommentId={updatingCommentId}
                                    depth={depth + 1}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ReportDialog isOpen={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} entityType="ReviewComment" entityId={comment.id} />
        </div>
    );
}
