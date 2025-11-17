"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import * as listCommentApi from "@/api/list-comment/list-comment.api";
import { Button } from "@core/components/ui/button";
import { Loader } from "lucide-react";
import { toast } from "sonner";
import type { UserListCommentForUpdate } from "@/models/list/list.model";
import { ListCommentForm } from "./list-comment-form";
import { ListCommentItem } from "./list-comment-item";
import { useRef } from "react";
import { useMemo } from "react";

import type { PaginatedResponse } from "@/models/system/api.model";
import type { UserListComment, UserListCommentForCreation } from "@/models/list/list.model";
import { useAuth } from "@core/hooks/use-auth";

interface ListCommentSectionProps {
    listId: number;
}

const COMMENTS_PAGE_SIZE = 10;

export function ListCommentSection({ listId }: ListCommentSectionProps) {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [currentPage, setCurrentPage] = useState(1);

    const {
        data: commentsResult,
        isLoading: isLoadingComments,
        isFetching: isFetchingComments,
        error: commentsError,
    } = useQuery<PaginatedResponse<UserListComment>>({
        queryKey: ["list-comments", listId, currentPage],
        queryFn: () =>
            listCommentApi.getListComments(listId, {
                page: currentPage,
                pageSize: COMMENTS_PAGE_SIZE,
            }),
        staleTime: 1000 * 30,
    });

    const totalComments = commentsResult?.totalCount ?? 0;

    const displayedComments = useMemo(() => {
        const allComments: UserListComment[] = [];

        for (let page = 1; page <= currentPage; page++) {
            const cachedPage = queryClient.getQueryData<PaginatedResponse<UserListComment>>(["list-comments", listId, page]);
            if (cachedPage?.items) {
                allComments.push(...cachedPage.items);
            }
        }

        return allComments;
    }, [currentPage, listId, queryClient, commentsResult]);

    const formRef = useRef<{ reset: () => void }>(null);

    const createCommentMutation = useMutation({
        mutationFn: (newComment: UserListCommentForCreation) => listCommentApi.createListComment(listId, newComment),
        onSuccess: () => {
            toast.success("Yorumunuz eklendi.");
            formRef.current?.reset();

            queryClient.invalidateQueries({ queryKey: ["list-comments", listId] });
        },
        onError: (error) => {
            toast.error(`Yorum eklenemedi: ${error.message}`);
        },
    });

    const voteCommentMutation = useMutation({
        mutationFn: ({ commentId, value }: { commentId: number; value: number }) => {
            return listCommentApi.voteOnListComment(commentId, { value });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["list-comments", listId] });
            toast.success("Oyunuz kaydedildi.");
        },
        onError: (error) => {
            toast.error(`Oylama hatası: ${error.message}`);
        },
    });

    const updateCommentMutation = useMutation({
        mutationFn: ({ commentId, data }: { commentId: number; data: UserListCommentForUpdate }) => listCommentApi.updateListComment(commentId, data),
        onSuccess: () => {
            toast.success("Yorum güncellendi.");
            queryClient.invalidateQueries({ queryKey: ["list-comments", listId] });
        },
        onError: (error) => {
            toast.error(`Yorum güncellenemedi: ${error.message}`);
        },
    });

    const deleteCommentMutation = useMutation({
        mutationFn: (commentId: number) => listCommentApi.deleteListComment(commentId),
        onSuccess: (_, commentId) => {
            toast.success("Yorum silindi.");

            for (let page = 1; page <= currentPage; page++) {
                queryClient.setQueryData<PaginatedResponse<UserListComment>>(["list-comments", listId, page], (oldData) => {
                    if (!oldData) return undefined;
                    return {
                        ...oldData,
                        items: oldData.items.filter((c) => c.id !== commentId),
                        totalCount: Math.max(0, oldData.totalCount - 1),
                    };
                });
            }
        },
        onError: (error) => {
            toast.error(`Yorum silinemedi: ${error.message}`);
        },
    });

    const handleLoadMore = () => {
        if (commentsResult && commentsResult.totalCount > displayedComments.length) {
            setCurrentPage((prev) => prev + 1);
        }
    };

    const handleVote = useCallback(
        (commentId: number, value: number) => {
            voteCommentMutation.mutate({ commentId, value });
        },
        [voteCommentMutation.mutate]
    );

    const handleUpdateComment = useCallback(
        (commentId: number, content: string) => {
            updateCommentMutation.mutate({ commentId, data: { content } });
        },
        [updateCommentMutation.mutate]
    );

    const handleDelete = useCallback((commentId: number) => {
        deleteCommentMutation.mutate(commentId);
    }, []);

    const hasMoreComments = commentsResult ? commentsResult.totalCount > displayedComments.length : false;
    const isLoadingOrFetching = isLoadingComments || isFetchingComments;

    return (
        <div className="mt-8 pt-4 sm:pt-6 border-t">
            <h2 className="text-2xl font-bold mb-4">Yorumlar ({totalComments > 0 ? totalComments : ""})</h2>
            <div className="mb-6">
                {user ? (
                    <ListCommentForm onSubmit={createCommentMutation.mutate} isPending={createCommentMutation.isPending} ref={formRef} />
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Yorum yapmak için
                        <a href="/login" className="underline hover:text-primary ml-1">
                            giriş yapmalısınız
                        </a>
                        .
                    </p>
                )}
            </div>
            {/* Yorum Listesi */}
            <div className="space-y-3">
                {isLoadingComments && currentPage === 1 && (
                    <div className="flex justify-center items-center py-8">
                        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                )}
                {commentsError && <p className="text-red-500 text-sm text-center">Yorumlar yüklenirken hata oluştu.</p>}
                {!isLoadingComments && displayedComments.length === 0 && <p className="text-muted-foreground text-center py-8">Henüz hiç yorum yapılmamış.</p>}

                {displayedComments.map((comment) => (
                    <ListCommentItem
                        key={comment.id}
                        comment={comment}
                        listId={listId}
                        onVote={handleVote}
                        isVoting={voteCommentMutation.isPending && voteCommentMutation.variables?.commentId === comment.id}
                        onDelete={handleDelete}
                        isDeleting={deleteCommentMutation.isPending && deleteCommentMutation.variables === comment.id}
                        onSubmitComment={createCommentMutation.mutate}
                        isSubmittingComment={createCommentMutation.isPending}
                        onUpdateComment={handleUpdateComment}
                        isUpdatingComment={updateCommentMutation.isPending && updateCommentMutation.variables?.commentId === comment.id}
                    />
                ))}

                {hasMoreComments && (
                    <div className="flex justify-center pt-4">
                        <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingOrFetching}>
                            {isLoadingOrFetching ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Daha Fazla Yorum Yükle ({commentsResult?.totalCount ? displayedComments.length : "..."} / {commentsResult?.totalCount ?? "..."}) {/* Geri bildirim */}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
