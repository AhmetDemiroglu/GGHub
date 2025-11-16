"use client";

import type { UserListComment, UserListCommentForCreation } from "@/models/list/list.model";
import { ListCommentForm } from "./list-comment-form";
import { Avatar, AvatarFallback, AvatarImage } from "@core/components/ui/avatar";
import { Button } from "@core/components/ui/button";
import { useAuth } from "@core/hooks/use-auth";
import { cn } from "@core/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/tr";
import { ThumbsUp, ThumbsDown, MessageSquare, Trash2, Pencil, X, Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Textarea } from "@core/components/ui/textarea";
import { toast } from "sonner";
import { getImageUrl } from "@/core/lib/get-image-url";

dayjs.extend(relativeTime);
dayjs.locale("tr");

interface ListCommentItemProps {
    comment: UserListComment;
    listId: number;
    onVote: (commentId: number, value: number) => void;
    isVoting: boolean;
    onDelete: (commentId: number) => void;
    isDeleting: boolean;
    onSubmitComment: (data: UserListCommentForCreation) => void;
    isSubmittingComment: boolean;
    onUpdateComment: (commentId: number, content: string) => void;
    isUpdatingComment: boolean;
    depth?: number;
}

export function ListCommentItem({
    comment,
    listId,
    onVote,
    isVoting,
    onDelete,
    isDeleting,
    onSubmitComment,
    isSubmittingComment,
    onUpdateComment,
    isUpdatingComment,
    depth = 0,
}: ListCommentItemProps) {
    const { user } = useAuth();
    const currentUserId = user ? Number(user.id) : undefined;
    const isOwner = currentUserId === comment.owner.id;

    const [showReplies, setShowReplies] = useState(false);
    const [isReplying, setIsReplying] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);

    const avatarSrc = getImageUrl(comment.owner.profileImageUrl);

    const voteScore = comment.upvotes - comment.downvotes;
    const currentUserVote = comment.currentUserVote;
    const timeAgo = dayjs(comment.createdAt).fromNow();

    return (
        <div
            className={cn(
                "flex flex-col sm:flex-row gap-2 sm:gap-3",
                depth === 0 && "p-3 sm:p-4 rounded-lg border border-border bg-card hover:bg-card/80 hover:shadow-[0_0_10px_1px_rgba(255,255,255,0.2)] transition-all duration-200"
            )}
        >
            {/* Avatar */}
            <div className="flex sm:block items-center gap-2 sm:gap-0">
                <Link href={`/profiles/${comment.owner.username}`} className="flex-shrink-0">
                    <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                        <AvatarImage src={avatarSrc} />
                        <AvatarFallback>{comment.owner.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </Link>
                {/* Sadece mobilde kullanıcı adını avatar yanında göster */}
                <div className="flex sm:hidden items-baseline gap-2 text-sm">
                    <Link href={`/profiles/${comment.owner.username}`} className="font-semibold hover:underline">
                        {comment.owner.username}
                    </Link>
                    <span className="text-xs text-muted-foreground">{timeAgo}</span>
                </div>
            </div>
            {/* Yorum İçeriği ve Aksiyonlar */}
            <div className="flex-1 space-y-1">
                {/* Kullanıcı Adı ve Zaman */}
                <div className="hidden sm:flex items-baseline gap-2 text-sm">
                    <Link href={`/profiles/${comment.owner.username}`} className="font-semibold hover:underline">
                        {comment.owner.username}
                    </Link>
                    <span className="text-xs text-muted-foreground">{timeAgo}</span>
                </div>

                {/* Yorum İçeriği */}
                {!isEditing ? (
                    <p className="text-sm">{comment.content}</p>
                ) : (
                    <div className="space-y-4">
                        <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="text-sm min-h-[80px] resize-none" disabled={isUpdatingComment} autoFocus />
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="default"
                                className="cursor-pointer"
                                onClick={() => {
                                    onUpdateComment(comment.id, editContent);
                                    setIsEditing(false);
                                }}
                                disabled={isUpdatingComment || editContent.trim().length === 0}
                            >
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
                    {user && depth < 2 && (
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

                    {comment.updatedAt && <span className="text-xs italic">(düzenlendi)</span>}
                </div>

                {/* Inline Reply Form */}
                {isReplying && (
                    <div className="mt-3">
                        <ListCommentForm
                            onSubmit={(values) => {
                                onSubmitComment({
                                    content: values.content,
                                    parentCommentId: comment.id,
                                });
                                setIsReplying(false);
                            }}
                            isPending={isSubmittingComment}
                            parentCommentId={comment.id}
                            onCancelReply={() => setIsReplying(false)}
                            placeholder={`${comment.owner.username} kullanıcısına yanıt yazın...`}
                        />
                    </div>
                )}

                {/* Yanıtları Göster/Gizle Butonu */}
                {comment.replies && comment.replies.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-primary mt-2 cursor-pointer" onClick={() => setShowReplies(!showReplies)}>
                        {showReplies ? "Yanıtları Gizle" : `${comment.replies.length} Yanıtı Göster`}
                    </Button>
                )}

                {/* Recursive Replies Render */}
                {showReplies && comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 space-y-4">
                        {comment.replies.map((reply) => (
                            <div key={reply.id} className="ml-2 sm:ml-6 md:ml-8 pl-1 sm:pl-3 md:pl-4 border-l-2 border-border/40">
                                <ListCommentItem
                                    comment={reply}
                                    listId={listId}
                                    onVote={onVote}
                                    isVoting={isVoting}
                                    onDelete={onDelete}
                                    isDeleting={isDeleting}
                                    onSubmitComment={onSubmitComment}
                                    isSubmittingComment={isSubmittingComment}
                                    onUpdateComment={onUpdateComment}
                                    isUpdatingComment={isUpdatingComment}
                                    depth={depth + 1}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
