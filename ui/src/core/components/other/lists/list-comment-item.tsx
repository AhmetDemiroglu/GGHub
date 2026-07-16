"use client";

import type { UserListComment, UserListCommentForCreation } from "@/models/list/list.model";
import { ListCommentForm } from "./list-comment-form";
import { Button } from "@core/components/ui/button";
import { useAuth } from "@core/hooks/use-auth";
import { cn } from "@core/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/tr";
import { ThumbsUp, ThumbsDown, MessageSquare, Trash2, Pencil, X, Check, Flag } from "lucide-react";
import { useEffect, useState } from "react";
import { Textarea } from "@core/components/ui/textarea";
import { toast } from "sonner";
import { MentionText } from "@core/components/base/mention-text";
import { UserLink } from "@core/components/base/user-link";
import { ReportDialog } from "@core/components/base/report-dialog";
import { displayName } from "@/core/lib/display-name";

dayjs.extend(relativeTime);
dayjs.locale("tr");

/** Bu derinlikten sonra yanit verilemez; girinti okunmaz hale geliyor. */
const MAX_REPLY_DEPTH = 2;
/** X modeli: az sayida yanit dogrudan gorunur, kalabaliksa katlanir. */
const AUTO_EXPAND_REPLY_LIMIT = 3;

interface ListCommentItemProps {
    comment: UserListComment;
    listId: number;
    onVote: (commentId: number, value: number) => void;
    /** Bekleyen islemler id ile tasinir; kokun bayragi yanitlara sizmasin diye. */
    votingCommentId: number | null;
    onDelete: (commentId: number) => void;
    deletingCommentId: number | null;
    onSubmitComment: (data: UserListCommentForCreation) => Promise<unknown>;
    /** Ucusta olan TUM yanit gonderimleri. Tek id yetmiyordu: es zamanli iki gonderimde
     * biri digerinin gostergesini sifirlayip cift gonderim penceresi aciyordu. */
    submittingParentIds: ReadonlySet<number | null>;
    onUpdateComment: (commentId: number, content: string) => Promise<unknown>;
    updatingCommentId: number | null;
    depth?: number;
}

export function ListCommentItem({
    comment,
    listId,
    onVote,
    votingCommentId,
    onDelete,
    deletingCommentId,
    onSubmitComment,
    submittingParentIds,
    onUpdateComment,
    updatingCommentId,
    depth = 0,
}: ListCommentItemProps) {
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

    // Düzenleme kapalıyken tampon sunucudaki içerikle senkron kalsın.
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
    const timeAgo = dayjs(comment.createdAt).fromNow();

    const handleSaveEdit = async () => {
        try {
            await onUpdateComment(comment.id, editContent);
            setIsEditing(false);
        } catch {
            // Başarısızsa düzenleyici açık kalır; hata mesajını bölüm toast ile gösterir.
        }
    };

    return (
        <div
            className={cn(
                "flex flex-col sm:flex-row gap-2 sm:gap-3",
                depth === 0 && "p-3 sm:p-4 rounded-lg border border-border bg-card hover:bg-card/80 hover:shadow-[0_0_10px_1px_rgba(255,255,255,0.2)] transition-all duration-200"
            )}
        >
            {/* Avatar */}
            <div className="flex sm:block items-center gap-2 sm:gap-0">
                <UserLink user={comment.owner} variant="avatar" className="flex-shrink-0" avatarClassName="h-8 w-8 sm:h-9 sm:w-9" />
                {/* Sadece mobilde kullanıcı adını avatar yanında göster */}
                <div className="flex sm:hidden items-baseline gap-2 text-sm">
                    <UserLink user={comment.owner} variant="name" className="font-semibold hover:underline" />
                    <span className="text-xs text-muted-foreground">{timeAgo}</span>
                </div>
            </div>
            {/* Yorum İçeriği ve Aksiyonlar */}
            <div className="flex-1 space-y-1">
                {/* Kullanıcı Adı ve Zaman */}
                <div className="hidden sm:flex items-baseline gap-2 text-sm">
                    <UserLink user={comment.owner} variant="name" className="font-semibold hover:underline" />
                    <span className="text-xs text-muted-foreground">{timeAgo}</span>
                </div>

                {/* Yorum İçeriği */}
                {!isEditing ? (
                    <p className="text-sm whitespace-pre-wrap">
                        <MentionText text={comment.content} />
                    </p>
                ) : (
                    <div className="space-y-2">
                        <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="text-sm min-h-[80px] resize-none" disabled={isUpdatingComment} autoFocus />
                        <div className="flex gap-2">
                            <Button size="sm" variant="default" className="cursor-pointer" onClick={handleSaveEdit} disabled={isUpdatingComment || editContent.trim().length === 0}>
                                <Check className="mr-1 h-3 w-3" /> Kaydet
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
                                <X className="mr-1 h-3 w-3" /> İptal
                            </Button>
                        </div>
                    </div>
                )}

                {/* Aksiyonlar: Oylama, Yanıtla, Sil */}
                <div className="flex items-center gap-1 sm:gap-3 pt-1 text-muted-foreground flex-wrap">
                    {/* Oylama */}
                    <div className="flex items-center gap-0.5">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-6 w-6 sm:h-7 sm:w-7 text-xs hover:bg-emerald-500/10 hover:text-emerald-500",
                                currentUserVote === 1 && "text-emerald-500 bg-emerald-500/10",
                                isVoting || isOwner || !user ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                            )}
                            onClick={() => {
                                if (!user) {
                                    toast.error("Oy vermek için giriş yapmalısınız.");
                                    return;
                                }
                                if (!isVoting && !isOwner) {
                                    onVote(comment.id, 1);
                                }
                            }}
                            disabled={isVoting || isOwner || !user}
                            aria-label="Yukarı oy ver"
                        >
                            <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <span
                            className={cn(
                                "text-sm font-semibold tabular-nums min-w-[2ch] text-center",
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
                                currentUserVote === -1 && "text-red-500 bg-red-500/10",
                                isVoting || isOwner || !user ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                            )}
                            onClick={() => {
                                if (!user) {
                                    toast.error("Oy vermek için giriş yapmalısınız.");
                                    return;
                                }
                                if (!isVoting && !isOwner) {
                                    onVote(comment.id, -1);
                                }
                            }}
                            disabled={isVoting || isOwner || !user}
                            aria-label="Aşağı oy ver"
                        >
                            <ThumbsDown className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Yanıtla Butonu */}
                    {user && depth < MAX_REPLY_DEPTH && (
                        <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs hover:bg-primary/10 hover:text-primary cursor-pointer" onClick={() => setIsReplying(!isReplying)}>
                            <MessageSquare className="mr-1 h-3 w-3" /> {isReplying ? "İptal" : "Yanıtla"}
                        </Button>
                    )}

                    {/* Sil Butonu */}
                    {isOwner && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto px-2 py-1 text-xs hover:bg-primary/10 hover:text-primary cursor-pointer"
                                onClick={() => {
                                    setIsEditing(true);
                                    setEditContent(comment.content);
                                }}
                                disabled={isEditing || isUpdatingComment}
                            >
                                <Pencil className="mr-1 h-3 w-3" /> Düzenle
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto px-2 py-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                                onClick={() => onDelete(comment.id)}
                                disabled={isDeleting || isEditing}
                            >
                                <Trash2 className="mr-1 h-3 w-3" /> Sil
                            </Button>
                        </>
                    )}

                    {/* Raporla Butonu */}
                    {user && !isOwner && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2 py-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                            onClick={() => setIsReportDialogOpen(true)}
                            disabled={isEditing || isDeleting}
                        >
                            <Flag className="mr-1 h-3 w-3" /> Raporla
                        </Button>
                    )}

                    {comment.updatedAt && <span className="text-xs italic">(düzenlendi)</span>}
                </div>

                {/* Inline Reply Form */}
                {isReplying && (
                    <div className="pt-2">
                        <ListCommentForm
                            onSubmit={async (values) => {
                                await onSubmitComment(values);
                                setIsReplying(false);
                                // Yanıt kökün replies dizisine gömülü döner; katlı kalırsa kullanıcı hiçbir şey görmez.
                                setRepliesOverride(true);
                            }}
                            isPending={isSubmittingReply}
                            parentCommentId={comment.id}
                            onCancelReply={() => setIsReplying(false)}
                            placeholder={`${displayName(comment.owner)} kullanıcısına yanıt yazın...`}
                        />
                    </div>
                )}

                {/* Yanıtları Göster/Gizle Butonu */}
                {replyCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-primary mt-1 cursor-pointer"
                        onClick={() => setRepliesOverride(!showReplies)}
                        aria-expanded={showReplies}
                    >
                        {showReplies ? "Yanıtları Gizle" : `${replyCount} Yanıtı Göster`}
                    </Button>
                )}

                {/* Recursive Replies Render */}
                {showReplies && comment.replies && replyCount > 0 && (
                    <div className="mt-2 space-y-3">
                        {comment.replies.map((reply) => (
                            <div key={reply.id} className="ml-2 sm:ml-6 md:ml-8 pl-1 sm:pl-3 md:pl-4 border-l-2 border-border/40">
                                <ListCommentItem
                                    comment={reply}
                                    listId={listId}
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
            <ReportDialog isOpen={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} entityType="Comment" entityId={comment.id} />
        </div>
    );
}
