"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader } from "lucide-react";
import { toast } from "sonner";

import * as reviewCommentApi from "@/api/review-comment/review-comment.api";
import { Button } from "@core/components/ui/button";
import { useI18n } from "@/core/contexts/locale-context";
import { useLocalizedHref } from "@/core/hooks/use-localized-href";
import { useAuth } from "@core/hooks/use-auth";
import { cn } from "@core/lib/utils";
import type { PaginatedResponse } from "@/models/system/api.model";
import type { ReviewComment, ReviewCommentForCreation, ReviewCommentForUpdate } from "@/models/review/review-comment.model";

import { ReviewCommentForm } from "./review-comment-form";
import { ReviewCommentItem } from "./review-comment-item";

const COMMENTS_PAGE_SIZE = 10;

interface ReviewCommentSectionProps {
    reviewId: number;
    className?: string;
    /** Baslik gizlenebilir (ornegin inceleme kartinda katlanan gorunum). */
    hideTitle?: boolean;
}

export function ReviewCommentSection({ reviewId, className, hideTitle = false }: ReviewCommentSectionProps) {
    const t = useI18n();
    const localizeHref = useLocalizedHref();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [currentPage, setCurrentPage] = useState(1);

    const {
        data: commentsResult,
        isLoading: isLoadingComments,
        isFetching: isFetchingComments,
        error: commentsError,
    } = useQuery<PaginatedResponse<ReviewComment>>({
        queryKey: ["review-comments", reviewId, currentPage],
        queryFn: () =>
            reviewCommentApi.getReviewComments(reviewId, {
                page: currentPage,
                pageSize: COMMENTS_PAGE_SIZE,
            }),
        staleTime: 1000 * 30,
    });

    const totalComments = commentsResult?.totalCount ?? 0;

    const displayedComments = useMemo(() => {
        const allComments: ReviewComment[] = [];

        for (let page = 1; page <= currentPage; page++) {
            const cachedPage = queryClient.getQueryData<PaginatedResponse<ReviewComment>>(["review-comments", reviewId, page]);
            if (cachedPage?.items) {
                allComments.push(...cachedPage.items);
            }
        }

        return allComments;
    }, [currentPage, reviewId, queryClient]);

    const formRef = useRef<{ reset: () => void }>(null);

    const createCommentMutation = useMutation({
        mutationFn: (newComment: ReviewCommentForCreation) => reviewCommentApi.createReviewComment(reviewId, newComment),
        onSuccess: () => {
            toast.success(t("reviewComments.added"));
            formRef.current?.reset();
            queryClient.invalidateQueries({ queryKey: ["review-comments", reviewId] });
        },
        onError: (error) => {
            toast.error(t("reviewComments.addError", { message: error.message }));
        },
    });

    const voteCommentMutation = useMutation({
        mutationFn: ({ commentId, value }: { commentId: number; value: number }) => reviewCommentApi.voteOnReviewComment(commentId, { value }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["review-comments", reviewId] });
            toast.success(t("reviewComments.voteSaved"));
        },
        onError: (error) => {
            toast.error(t("reviewComments.voteError", { message: error.message }));
        },
    });

    const updateCommentMutation = useMutation({
        mutationFn: ({ commentId, data }: { commentId: number; data: ReviewCommentForUpdate }) => reviewCommentApi.updateReviewComment(commentId, data),
        onSuccess: () => {
            toast.success(t("reviewComments.updated"));
            queryClient.invalidateQueries({ queryKey: ["review-comments", reviewId] });
        },
        onError: (error) => {
            toast.error(t("reviewComments.updateError", { message: error.message }));
        },
    });

    const deleteCommentMutation = useMutation({
        mutationFn: (commentId: number) => reviewCommentApi.deleteReviewComment(commentId),
        onSuccess: (_, commentId) => {
            toast.success(t("reviewComments.deleted"));

            for (let page = 1; page <= currentPage; page++) {
                queryClient.setQueryData<PaginatedResponse<ReviewComment>>(["review-comments", reviewId, page], (oldData) => {
                    if (!oldData) return undefined;
                    return {
                        ...oldData,
                        items: oldData.items.filter((comment) => comment.id !== commentId),
                        totalCount: Math.max(0, oldData.totalCount - 1),
                    };
                });
            }
        },
        onError: (error) => {
            toast.error(t("reviewComments.deleteError", { message: error.message }));
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
        [voteCommentMutation]
    );

    const handleUpdateComment = useCallback(
        (commentId: number, content: string) => {
            updateCommentMutation.mutate({ commentId, data: { content } });
        },
        [updateCommentMutation]
    );

    const handleDelete = useCallback(
        (commentId: number) => {
            deleteCommentMutation.mutate(commentId);
        },
        [deleteCommentMutation]
    );

    const hasMoreComments = commentsResult ? commentsResult.totalCount > displayedComments.length : false;
    const isLoadingOrFetching = isLoadingComments || isFetchingComments;

    return (
        <div className={cn("mt-8 border-t pt-4 sm:pt-6", className)}>
            {/* Sayiyi her zaman bas: bos string gecmek basligi "Yorumlar ()" yapiyordu. */}
            {!hideTitle && <h2 className="mb-4 text-2xl font-bold">{t("reviewComments.title", { count: String(totalComments) })}</h2>}
            <div className="mb-6">
                {user ? (
                    <ReviewCommentForm onSubmit={createCommentMutation.mutate} isPending={createCommentMutation.isPending} ref={formRef} />
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {t("reviewComments.loginPrompt")}
                        <a href={localizeHref("/login")} className="ml-1 underline hover:text-primary">
                            {t("reviewComments.loginLink")}
                        </a>
                        .
                    </p>
                )}
            </div>

            <div className="space-y-3">
                {isLoadingComments && currentPage === 1 && (
                    <div className="flex items-center justify-center py-8">
                        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                )}
                {commentsError && <p className="text-center text-sm text-red-500">{t("reviewComments.loadError")}</p>}
                {!isLoadingComments && displayedComments.length === 0 && <p className="py-8 text-center text-muted-foreground">{t("reviewComments.empty")}</p>}

                {displayedComments.map((comment) => (
                    <ReviewCommentItem
                        key={comment.id}
                        comment={comment}
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
                        <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingOrFetching} className="cursor-pointer">
                            {isLoadingOrFetching ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {t("reviewComments.loadMore", {
                                shown: commentsResult?.totalCount ? String(displayedComments.length) : "...",
                                total: commentsResult?.totalCount ? String(commentsResult.totalCount) : "...",
                            })}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
