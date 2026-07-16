"use client";

import { useCallback, useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { Loader } from "lucide-react";
import { toast } from "sonner";

import * as listCommentApi from "@/api/list-comment/list-comment.api";
import { Button } from "@core/components/ui/button";
import { useI18n } from "@/core/contexts/locale-context";
import { useAuth } from "@core/hooks/use-auth";
import { commentErrorReason, isNotFoundError, removeCommentFromList } from "@core/lib/comment-tree";
import type { PaginatedResponse } from "@/models/system/api.model";
import type { UserListComment, UserListCommentForCreation, UserListCommentForUpdate } from "@/models/list/list.model";

import { ListCommentForm } from "./list-comment-form";
import { ListCommentItem } from "./list-comment-item";

const COMMENTS_PAGE_SIZE = 10;

type CommentPage = PaginatedResponse<UserListComment>;
type CommentPages = InfiniteData<CommentPage, number>;

interface ListCommentSectionProps {
    listId: number;
}

export function ListCommentSection({ listId }: ListCommentSectionProps) {
    const t = useI18n();
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const commentsQueryKey = useMemo(() => ["list-comments", listId], [listId]);

    /**
     * useInfiniteQuery tek bir anahtar altinda TUM sayfalari tutar ve invalidate
     * edildiginde yuklu olan her sayfayi yeniden ceker. Eski kod sayfalari
     * queryClient.getQueryData ile elle tariyordu; useMemo bagimliliklarindaki
     * queryClient sabit oldugu icin veri degistiginde memo hic yeniden hesaplanmiyor,
     * yeni yorumlar ekrana gelmiyordu.
     */
    const {
        data,
        isLoading: isLoadingComments,
        error: commentsError,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: commentsQueryKey,
        queryFn: ({ pageParam }) =>
            listCommentApi.getListComments(listId, {
                page: pageParam,
                pageSize: COMMENTS_PAGE_SIZE,
            }),
        initialPageParam: 1,
        getNextPageParam: (lastPage: CommentPage, allPages: CommentPage[]) => {
            const loaded = allPages.reduce((sum, page) => sum + page.items.length, 0);
            return loaded < lastPage.totalCount ? allPages.length + 1 : undefined;
        },
        staleTime: 1000 * 30,
    });

    /** items yalnizca KOK yorumlari tasir; yanitlar her kokun replies dizisinde gelir. */
    const comments = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
    /** Backend de yalnizca kokleri sayar, dolayisiyla comments.length ile ayni birim. */
    const totalComments = data?.pages[data.pages.length - 1]?.totalCount ?? 0;

    const reasonText = useCallback((error: unknown) => t(`commentsSection.reason.${commentErrorReason(error)}`), [t]);

    /**
     * Ucusta olan gonderimler, ust yorum id'sine gore (kok icin null).
     *
     * Neden set: tek bir createCommentMutation ornegini hem kok formu hem her yanit
     * formu paylasiyor, ve mutation.variables REACT QUERY'DE yalnizca EN SON mutate
     * cagrisini yansitiyor. A'ya yanit gonderirken koke de gonderince variables
     * uzerine yaziliyor, A'nin formu ucus ortasinda yeniden aktiflesiyor ve tekrar
     * basinca CIFT yanit gidiyordu.
     */
    const [submittingParentIds, setSubmittingParentIds] = useState<ReadonlySet<number | null>>(new Set());

    const createCommentMutation = useMutation({
        mutationFn: (newComment: UserListCommentForCreation) => listCommentApi.createListComment(listId, newComment),
        onMutate: (newComment: UserListCommentForCreation) => {
            const parentKey = newComment.parentCommentId ?? null;
            setSubmittingParentIds((prev) => new Set(prev).add(parentKey));
        },
        onSuccess: () => {
            toast.success(t("commentsSection.added"));
            // Yanitlar kokun replies dizisine gomulu geldigi icin kok listesi yeniden cekilmeli.
            queryClient.invalidateQueries({ queryKey: commentsQueryKey });
        },
        onError: (error) => {
            toast.error(t("commentsSection.addError", { message: reasonText(error) }));
        },
        onSettled: (_data, _error, newComment) => {
            const parentKey = newComment.parentCommentId ?? null;
            setSubmittingParentIds((prev) => {
                const next = new Set(prev);
                next.delete(parentKey);
                return next;
            });
        },
    });

    const voteCommentMutation = useMutation({
        mutationFn: async ({ commentId, value }: { commentId: number; value: number }) => {
            try {
                await listCommentApi.voteOnListComment(commentId, { value });
                return { gone: false };
            } catch (error) {
                // Yorum arada silinmisse oy verilemez; bu korkutucu bir hata degil.
                if (isNotFoundError(error)) return { gone: true };
                throw error;
            }
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: commentsQueryKey });
            if (!result.gone) {
                toast.success(t("commentsSection.voteSaved"));
            }
        },
        onError: (error) => {
            toast.error(t("commentsSection.voteError", { message: reasonText(error) }));
        },
    });

    const updateCommentMutation = useMutation({
        mutationFn: ({ commentId, data: payload }: { commentId: number; data: UserListCommentForUpdate }) => listCommentApi.updateListComment(commentId, payload),
        onSuccess: () => {
            toast.success(t("commentsSection.updated"));
            queryClient.invalidateQueries({ queryKey: commentsQueryKey });
        },
        onError: (error) => {
            toast.error(t("commentsSection.updateError", { message: reasonText(error) }));
        },
    });

    const deleteCommentMutation = useMutation({
        mutationFn: async (commentId: number) => {
            try {
                await listCommentApi.deleteListComment(commentId);
            } catch (error) {
                // 404: yorum zaten silinmis. Islem basarili sayilir, satir kaldirilir.
                if (!isNotFoundError(error)) throw error;
            }
        },
        // Iyimser silme: satir aninda kalksin, kullanici ikinci kez "sil" demeye kalkmasin.
        onMutate: async (commentId: number) => {
            await queryClient.cancelQueries({ queryKey: commentsQueryKey });
            const previous = queryClient.getQueryData<CommentPages>(commentsQueryKey);

            queryClient.setQueryData<CommentPages>(commentsQueryKey, (oldData) => {
                if (!oldData) return oldData;

                let removedRoot = false;
                const pages = oldData.pages.map((page) => {
                    const result = removeCommentFromList(page.items, commentId);
                    if (result.removedRoot) removedRoot = true;
                    return result.removed ? { ...page, items: result.items } : page;
                });

                // totalCount yalnizca kokleri sayar; yanit silmek onu DUSURMEMELI.
                const nextPages = removedRoot ? pages.map((page) => ({ ...page, totalCount: Math.max(0, page.totalCount - 1) })) : pages;

                return { ...oldData, pages: nextPages };
            });

            return { previous };
        },
        onSuccess: () => {
            toast.success(t("commentsSection.deleted"));
        },
        onError: (error, _commentId, context) => {
            if (context?.previous) {
                queryClient.setQueryData<CommentPages>(commentsQueryKey, context.previous);
            }
            toast.error(t("commentsSection.deleteError", { message: reasonText(error) }));
        },
        onSettled: () => {
            // Sunucu yanit agacini cascade siliyor ve sayfa sinirlari kayiyor: gercegi sunucudan al.
            queryClient.invalidateQueries({ queryKey: commentsQueryKey });
        },
    });

    const handleVote = useCallback(
        (commentId: number, value: number) => {
            voteCommentMutation.mutate({ commentId, value });
        },
        [voteCommentMutation]
    );

    const handleUpdateComment = useCallback(
        (commentId: number, content: string) => updateCommentMutation.mutateAsync({ commentId, data: { content } }),
        [updateCommentMutation]
    );

    const handleDelete = useCallback(
        (commentId: number) => {
            deleteCommentMutation.mutate(commentId);
        },
        [deleteCommentMutation]
    );

    const handleSubmitComment = useCallback((values: UserListCommentForCreation) => createCommentMutation.mutateAsync(values), [createCommentMutation]);

    // Bekleme durumlari yoruma OZEL: eskiden kokun bayragi tum yanitlara aynen geciyordu.
    const votingCommentId = voteCommentMutation.isPending ? voteCommentMutation.variables?.commentId ?? null : null;
    const deletingCommentId = deleteCommentMutation.isPending ? deleteCommentMutation.variables ?? null : null;
    const updatingCommentId = updateCommentMutation.isPending ? updateCommentMutation.variables?.commentId ?? null : null;
    const isSubmittingRootComment = submittingParentIds.has(null);

    return (
        <div className="mt-6 border-t border-border pt-5 pb-1">
            {/* Sayiyi her zaman bas: bos string gecmek basligi "Yorumlar ()" yapiyordu. */}
            <h2 className="mb-4 text-xl font-bold sm:text-2xl">{t("commentsSection.title", { count: String(totalComments) })}</h2>

            {user ? (
                <ListCommentForm onSubmit={handleSubmitComment} isPending={isSubmittingRootComment} />
            ) : (
                <p className="text-sm text-muted-foreground">
                    {t("commentsSection.loginPrompt")}
                    <a href="/login" className="ml-1 underline hover:text-primary">
                        {t("commentsSection.loginLink")}
                    </a>
                    .
                </p>
            )}

            <div className="mt-5 space-y-3">
                {isLoadingComments && (
                    <div className="flex items-center justify-center py-6">
                        <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                )}
                {commentsError && <p className="py-3 text-center text-sm text-red-500">{t("commentsSection.loadError")}</p>}
                {!isLoadingComments && !commentsError && comments.length === 0 && <p className="py-3 text-center text-sm text-muted-foreground">{t("commentsSection.empty")}</p>}

                {comments.map((comment) => (
                    <ListCommentItem
                        key={comment.id}
                        comment={comment}
                        listId={listId}
                        onVote={handleVote}
                        votingCommentId={votingCommentId}
                        onDelete={handleDelete}
                        deletingCommentId={deletingCommentId}
                        onSubmitComment={handleSubmitComment}
                        submittingParentIds={submittingParentIds}
                        onUpdateComment={handleUpdateComment}
                        updatingCommentId={updatingCommentId}
                    />
                ))}

                {/* Sadece gercekten daha fazla sayfa varsa; "(0 / 1)" gibi bir sayac artik olusamaz. */}
                {hasNextPage && (
                    <div className="flex justify-center pt-3">
                        <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="cursor-pointer">
                            {isFetchingNextPage ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {t("commentsSection.loadMore", {
                                shown: String(comments.length),
                                total: String(totalComments),
                            })}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
