"use client";

import type { UserListDetail, UserListForUpdate } from "@/models/list/list.model";
import { ListFormModal } from "@core/components/other/lists/list-form-modal";
import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@core/hooks/use-auth";
import { useParams } from "next/navigation";
import * as listApi from "@/api/list/list.api";
import * as listRatingApi from "@/api/list-rating/list-rating.api";
import { ListGameCard } from "@core/components/other/game-card/list-game-card";
import { ListGameCardSkeleton } from "@core/components/other/game-card/list-game-card-skeleton";
import { Separator } from "@core/components/ui/separator";
import { ListDetailHeader } from "@core/components/other/lists/list-detail-header";
import { toast } from "sonner";
import { Button } from "@core/components/ui/button";
import { ListPlus, Edit, Loader, ArrowDown, BookmarkPlus, BookmarkMinus, Flag } from "lucide-react";
import { AddGameToListModal } from "@core/components/other/lists/add-game-to-list-modal";
import { ListCommentSection } from "@/core/components/other/lists/list-comment-section";
import { AxiosError } from "axios";
import { ReportDialog } from "@core/components/base/report-dialog";
import { useI18n } from "@/core/contexts/locale-context";

export default function ListDetailPage() {
    const t = useI18n();
    const params = useParams();
    const listId = Number(params.listId);

    const queryClient = useQueryClient();
    const { user } = useAuth();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [listToEdit, setListToEdit] = useState<UserListDetail | null>(null);
    const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false);
    const [visibleGameRows, setVisibleGameRows] = useState(2);
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

    const { data: listDetail, isLoading } = useQuery<UserListDetail>({
        queryKey: ["list-detail", listId],
        queryFn: () => listApi.getListDetail(listId),
        enabled: !isNaN(listId) && listId > 0,
    });

    const { data: myRatingData } = useQuery({
        queryKey: ["my-list-rating", listId, user?.id],
        queryFn: () => listRatingApi.getMyListRating(listId),
        enabled: !!listDetail && !!user,
        staleTime: 1000 * 60 * 5,
    });

    const myRating = myRatingData?.value;

    const isOwner = useMemo(() => {
        if (!user || !listDetail) return false;
        return Number(user.id) === listDetail.owner.id;
    }, [user, listDetail]);

    const GAMES_PER_ROW = 3;
    const ROWS_PER_LOAD = 5;
    const visibleGamesCount = visibleGameRows * GAMES_PER_ROW;
    const displayedGames = useMemo(() => {
        if (!listDetail) return [];
        return listDetail.games.slice(0, visibleGamesCount);
    }, [listDetail, visibleGamesCount]);
    const hasMoreGames = listDetail ? listDetail.games.length > visibleGamesCount : false;

    const submitRatingMutation = useMutation({
        mutationFn: (rating: number) => listRatingApi.submitListRating(listId, { value: rating }),
        onSuccess: (_, newRating) => {
            toast.success(t("listDetail.ratingSaved", { rating: newRating }));
            queryClient.invalidateQueries({ queryKey: ["my-list-rating", listId, user?.id] });
            queryClient.invalidateQueries({ queryKey: ["list-detail", listId] });
            queryClient.invalidateQueries({ queryKey: ["my-lists"] });
        },
        onError: (error: unknown) => {
            if (error instanceof AxiosError && (error.response as { isRateLimitError?: boolean } | undefined)?.isRateLimitError) {
                return;
            }
            toast.error(t("listDetail.ratingSaveError", { message: (error as Error).message }));
        },
    });

    const handleRatingSubmit = useCallback(
        (rating: number) => {
            submitRatingMutation.mutate(rating);
        },
        [submitRatingMutation]
    );

    const updateListMutation = useMutation({
        mutationFn: ({ listId, data }: { listId: number; data: UserListForUpdate }) => listApi.updateList(listId, data),
        onSuccess: (_, variables) => {
            toast.success(t("listDetail.listUpdated", { name: variables.data.name }));
            queryClient.invalidateQueries({ queryKey: ["list-detail", variables.listId] });
            queryClient.invalidateQueries({ queryKey: ["my-lists"] });
            setIsModalOpen(false);
            setListToEdit(null);
        },
        onError: (error: unknown) => {
            if (error instanceof AxiosError && (error.response as { isRateLimitError?: boolean } | undefined)?.isRateLimitError) {
                return;
            }
            toast.error(t("listDetail.listUpdateError", { message: (error as Error).message }));
        },
    });

    const addGameMutation = useMutation({
        mutationFn: (gameId: number) => listApi.addGameToList(listId, gameId),
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ["list-detail", listId] });

            const previousData = queryClient.getQueryData(["list-detail", listId]);
            queryClient.setQueryData(["list-detail", listId], (old: unknown) => old);

            return { previousData };
        },
        onSuccess: () => {
            toast.success(t("listDetail.gameAdded"));
            queryClient.refetchQueries({ queryKey: ["list-detail", listId] });
        },
        onError: (error: unknown, _gameId, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(["list-detail", listId], context.previousData);
            }

            if (error instanceof AxiosError) {
                if ((error.response as { isRateLimitError?: boolean } | undefined)?.isRateLimitError) {
                    return;
                }

                const backendMessage = error.response?.data?.message || error.response?.data;
                const displayMessage = typeof backendMessage === "string" ? backendMessage : error.message;
                toast.error(displayMessage);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["my-lists"] });
        },
    });

    const removeGameMutation = useMutation({
        mutationFn: (gameId: number) => listApi.removeGameFromList(listId, gameId),
        onSuccess: () => {
            toast.success(t("listDetail.gameRemoved"));
            queryClient.invalidateQueries({ queryKey: ["list-detail", listId] });
            queryClient.invalidateQueries({ queryKey: ["my-lists"] });
        },
        onError: (error: unknown) => {
            if (error instanceof AxiosError && (error.response as { isRateLimitError?: boolean } | undefined)?.isRateLimitError) {
                return;
            }
            toast.error(`${(error as Error).message}`);
        },
    });

    const handleRemoveGame = useCallback(
        (gameId: number) => {
            removeGameMutation.mutate(gameId);
        },
        [removeGameMutation]
    );

    const followMutation = useMutation({
        mutationFn: () => listApi.followList(listId),
        onSuccess: () => {
            toast.success(t("listDetail.followSuccess", { name: listDetail?.name || t("listDetail.fallbackListName") }));
            queryClient.invalidateQueries({ queryKey: ["list-detail", listId] });
            queryClient.invalidateQueries({ queryKey: ["followed-lists-by-me"] });
        },
        onError: (error: unknown) => {
            if (error instanceof AxiosError && (error.response as { isRateLimitError?: boolean } | undefined)?.isRateLimitError) {
                return;
            }
            toast.error(t("listDetail.followError", { message: (error as Error).message }));
        },
    });

    const unfollowMutation = useMutation({
        mutationFn: () => listApi.unfollowList(listId),
        onSuccess: () => {
            toast.success(t("listDetail.unfollowSuccess", { name: listDetail?.name || t("listDetail.fallbackListName") }));
            queryClient.invalidateQueries({ queryKey: ["list-detail", listId] });
            queryClient.invalidateQueries({ queryKey: ["followed-lists-by-me"] });
        },
        onError: (error: unknown) => {
            if (error instanceof AxiosError && (error.response as { isRateLimitError?: boolean } | undefined)?.isRateLimitError) {
                return;
            }
            toast.error(t("listDetail.unfollowError", { message: (error as Error).message }));
        },
    });

    const handleFormSubmit = (values: UserListForUpdate) => {
        if (listToEdit) {
            updateListMutation.mutate({ listId: listToEdit.id, data: values });
        }
    };

    const handleEditClick = () => {
        if (listDetail) {
            setListToEdit(listDetail);
            setIsModalOpen(true);
        } else {
            toast.error(t("listDetail.listDataNotLoaded"));
        }
    };

    const handleFollow = useCallback(() => {
        if (!user) {
            toast.error(t("listDetail.loginRequiredToFollow"));
            return;
        }
        followMutation.mutate();
    }, [followMutation, t, user]);

    const handleUnfollow = useCallback(() => {
        if (!user) {
            toast.error(t("listDetail.loginRequiredAction"));
            return;
        }
        unfollowMutation.mutate();
    }, [t, unfollowMutation, user]);

    if (isLoading) {
        return (
            <div className="w-full h-full p-5">
                <div className="animate-pulse">
                    <div className="h-20 w-3/4 bg-muted rounded mb-6" />
                </div>
                <Separator className="my-6" />
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">{t("listDetail.loadingGames")}</h2>
                    <span>(</span>
                    <Loader className="h-6 w-6 animate-spin" />
                    <span>)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
                    {Array.from({ length: 12 }).map((_, index) => (
                        <ListGameCardSkeleton key={index} />
                    ))}
                </div>
            </div>
        );
    }

    if (!listDetail) {
        return <div>{t("listDetail.notFound")}</div>;
    }

    const isFormPending = updateListMutation.isPending;
    const currentUserId = user ? Number(user.id) : undefined;

    const headerActions = (
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 justify-start md:justify-end">
            {isOwner && (
                <>
                    <Button className="cursor-pointer" onClick={() => setIsAddGameModalOpen(true)}>
                        <ListPlus className="mr-0 sm:mr-1 h-4 w-4" /> <span>{t("listDetail.addGame")}</span>
                    </Button>
                    <Button variant="outline" className="cursor-pointer" onClick={handleEditClick} disabled={isFormPending} title={t("listDetail.editTitle")}>
                        <Edit className="mr-1 h-4 w-4" /> {t("listDetail.edit")}
                    </Button>
                </>
            )}
            {!isOwner && user && (
                <>
                    {listDetail.isFollowing ? (
                        <Button variant="outline" onClick={handleUnfollow} disabled={unfollowMutation.isPending} title={t("listDetail.unfollowTitle")} className="cursor-pointer">
                            <BookmarkMinus className="mr-0 h-4 w-4" /> {t("listDetail.unfollow")}
                        </Button>
                    ) : (
                        <Button variant="default" className="cursor-pointer" onClick={handleFollow} disabled={followMutation.isPending} title={t("listDetail.followTitle")}>
                            <BookmarkPlus className="mr-0 h-4 w-4" /> {t("listDetail.follow")}
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        className="cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setIsReportDialogOpen(true)}
                        title={t("listDetail.reportTitle")}
                    >
                        <Flag className="h-4 w-4" />
                        <span className="sm:inline ml-1">{t("listDetail.report")}</span>
                    </Button>
                </>
            )}
        </div>
    );

    return (
        <div className="w-full h-full p-5">
            <ListDetailHeader
                list={listDetail}
                actions={headerActions}
                myRating={myRating}
                onSubmitRating={handleRatingSubmit}
                isRatingPending={submitRatingMutation.isPending}
                currentUserId={currentUserId}
            />
            <Separator className="my-6" />
            <h2 className="text-2xl font-bold mb-4">{t("listDetail.gamesTitle", { count: listDetail.games.length })}</h2>
            {listDetail.games.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">{t("listDetail.empty")}</div>
            ) : (
                <div className="relative">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
                        {displayedGames.map((game) => (
                            <ListGameCard key={game.rawgId} game={game} showRemoveButton={isOwner} onRemove={handleRemoveGame} />
                        ))}
                    </div>

                    {hasMoreGames && (
                        <>
                            <div className="absolute bottom-0 left-0 right-0 h-40 bg-linear-to-t from-background via-background/80 to-transparent pointer-events-none" />
                            <div className="relative flex flex-col items-center gap-3 mt-6">
                                <span className="text-sm text-muted-foreground font-medium">
                                    {t("listDetail.showMoreGames", { count: listDetail.games.length - visibleGamesCount })}
                                </span>
                                <button onClick={() => setVisibleGameRows((prev) => prev + ROWS_PER_LOAD)} className="group relative cursor-pointer" aria-label={t("listDetail.showMoreGamesAria")}>
                                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                                    <div className="relative w-5 h-5 rounded-full border-2 border-primary/40 hover:border-primary bg-background/50 backdrop-blur-sm flex items-center justify-center transition-all duration-300 animate-bounce hover:animate-none group-hover:shadow-lg group-hover:shadow-primary/25">
                                        <ArrowDown className="h-3 w-3 text-primary" />
                                    </div>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
            <ListCommentSection listId={listId} />
            <AddGameToListModal
                isOpen={isAddGameModalOpen}
                onClose={() => setIsAddGameModalOpen(false)}
                onAddGame={(gameId) => addGameMutation.mutate(gameId)}
                isPending={addGameMutation.isPending}
                existingGameIds={listDetail.games.map((g) => g.rawgId)}
            />
            <ListFormModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    if (!isFormPending) {
                        setListToEdit(null);
                    }
                }}
                onSubmit={handleFormSubmit}
                isPending={isFormPending}
                defaultValues={listToEdit}
            />
            {!isOwner && user && <ReportDialog isOpen={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} entityType="List" entityId={listDetail.id} />}
        </div>
    );
}
