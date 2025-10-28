"use client";

import type { UserListComment } from "@/models/list/list.model";
import { Avatar, AvatarFallback, AvatarImage } from "@core/components/ui/avatar";
import { Button } from "@core/components/ui/button";
import { useAuth } from "@core/hooks/use-auth";
import { cn } from "@core/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/tr";
import { ThumbsUp, ThumbsDown, MessageSquare, Trash2 } from "lucide-react";
import Link from "next/link";

dayjs.extend(relativeTime);
dayjs.locale("tr");

interface ListCommentItemProps {
    comment: UserListComment;
    listId: number;
    onVote: (commentId: number, value: number) => void;
    isVoting: boolean;
    onDelete: (commentId: number) => void;
    isDeleting: boolean;
}

export function ListCommentItem({ comment, listId, onVote, isVoting, onDelete, isDeleting }: ListCommentItemProps) {
    const { user } = useAuth();
    const currentUserId = user ? Number(user.id) : undefined;
    const isOwner = currentUserId === comment.owner.id;

    const getImageUrl = (path: string | null | undefined) => {
        if (!path) return undefined;
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
        return `${API_BASE}${path}`;
    };
    const avatarSrc = getImageUrl(comment.owner.profileImageUrl);

    const voteScore = comment.upvotes - comment.downvotes;
    const currentUserVote = comment.currentUserVote;
    const timeAgo = dayjs(comment.createdAt).fromNow();

    return (
        <div className="flex gap-3">
            {/* Avatar */}
            <Link href={`/profiles/${comment.owner.username}`} className="flex-shrink-0">
                <Avatar className="h-9 w-9">
                    <AvatarImage src={avatarSrc} />
                    <AvatarFallback>{comment.owner.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
            </Link>

            {/* Yorum İçeriği ve Aksiyonlar */}
            <div className="flex-1 space-y-1">
                {/* Kullanıcı Adı ve Zaman */}
                <div className="flex items-baseline gap-2 text-sm">
                    <Link href={`/profiles/${comment.owner.username}`} className="font-semibold hover:underline">
                        {comment.owner.username}
                    </Link>
                    <span className="text-xs text-muted-foreground">{timeAgo}</span>
                </div>

                {/* Yorum İçeriği */}
                <p className="text-sm">{comment.content}</p>

                {/* Aksiyonlar: Oylama, Yanıtla, Sil */}
                <div className="flex items-center gap-3 pt-1 text-muted-foreground">
                    {/* Oylama */}
                    <div className="flex items-center gap-0.5">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-7 w-7 text-xs hover:bg-emerald-500/10 hover:text-emerald-500",
                                currentUserVote === 1 && "text-emerald-500 bg-emerald-500/10",
                                isVoting || isOwner ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                            )}
                            onClick={() => {
                                if (!isVoting && !isOwner) {
                                    onVote(comment.id, 1);
                                }
                            }}
                            disabled={isVoting || isOwner}
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
                                isVoting || isOwner ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                            )}
                            onClick={() => {
                                if (!isVoting && !isOwner) {
                                    onVote(comment.id, -1);
                                }
                            }}
                            disabled={isVoting || isOwner}
                            aria-label="Aşağı oy ver"
                        >
                            <ThumbsDown className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Yanıtla Butonu (Şimdilik işlevsiz) */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-1 text-xs hover:bg-primary/10 hover:text-primary cursor-pointer"
                        // onClick={() => onReply(comment.id)}
                    >
                        <MessageSquare className="mr-1 h-3 w-3" /> Yanıtla
                    </Button>

                    {/* Sil Butonu */}
                    {isOwner && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2 py-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => onDelete(comment.id)}
                            disabled={isDeleting}
                        >
                            <Trash2 className="mr-1 h-3 w-3" /> Sil
                        </Button>
                    )}

                    {comment.updatedAt && <span className="text-xs italic">(düzenlendi)</span>}
                </div>

                {/* TODO: Yanıtlar buraya gelecek (Adım 10.5?) */}
            </div>
        </div>
    );
}
