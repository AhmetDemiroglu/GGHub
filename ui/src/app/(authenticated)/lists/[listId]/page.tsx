"use client";
import type { UserListDetail, UserListForCreation, UserListForUpdate } from "@/models/list/list.model";
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
import { ListPlus, UserPlus, UserMinus, Edit, Loader, ArrowDown } from "lucide-react";
import { AddGameToListModal } from "@core/components/other/lists/add-game-to-list-modal";
import { ListCommentSection } from "@/core/components/other/lists/list-comment-section";

export default function ListDetailPage() {
    const params = useParams();
    const listId = Number(params.listId);

    const queryClient = useQueryClient();
    const { user } = useAuth();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [listToEdit, setListToEdit] = useState<UserListDetail | null>(null);

    const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false);
    const [visibleGameRows, setVisibleGameRows] = useState(2);

    const {
        data: listDetail,
        isLoading,
        error,
    } = useQuery<UserListDetail>({
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
            toast.success(`Puanınız (${newRating}) kaydedildi.`);
            queryClient.invalidateQueries({ queryKey: ["my-list-rating", listId, user?.id] });
            queryClient.invalidateQueries({ queryKey: ["list-detail", listId] });
            queryClient.invalidateQueries({ queryKey: ["my-lists"] });
        },
        onError: (error) => {
            toast.error(`Puan kaydedilemedi: ${error.message}`);
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
            toast.success(`'${variables.data.name}' listesi başarıyla güncellendi.`);
            queryClient.invalidateQueries({ queryKey: ["list-detail", variables.listId] });
            queryClient.invalidateQueries({ queryKey: ["my-lists"] });
            setIsModalOpen(false);
            setListToEdit(null);
        },
        onError: (error) => {
            toast.error(`Liste güncellenemedi: ${error.message}`);
        },
    });

    const addGameMutation = useMutation({
        mutationFn: (gameId: number) => listApi.addGameToList(listId, gameId),
        onMutate: async (gameId) => {
            await queryClient.cancelQueries({ queryKey: ["list-detail", listId] });

            const previousData = queryClient.getQueryData(["list-detail", listId]);

            queryClient.setQueryData(["list-detail", listId], (old: any) => {
                if (!old) return old;
                return old;
            });

            return { previousData };
        },
        onSuccess: () => {
            toast.success("Oyun listeye eklendi.");
            queryClient.refetchQueries({ queryKey: ["list-detail", listId] });
        },
        onError: (error, gameId, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(["list-detail", listId], context.previousData);
            }
            toast.error(`Hata: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["my-lists"] });
        },
    });

    const removeGameMutation = useMutation({
        mutationFn: (gameId: number) => listApi.removeGameFromList(listId, gameId),
        onSuccess: () => {
            toast.success("Oyun listeden çıkarıldı.");
            queryClient.invalidateQueries({ queryKey: ["list-detail", listId] });
            queryClient.invalidateQueries({ queryKey: ["my-lists"] });
        },
        onError: (error) => {
            toast.error(`Hata: ${error.message}`);
        },
    });

    const handleRemoveGame = useCallback(
        (gameId: number) => {
            removeGameMutation.mutate(gameId);
        },
        [removeGameMutation.mutate]
    );

    const followMutation = useMutation({
        mutationFn: () => listApi.followList(listId),
        onSuccess: () => {
            toast.success(`'${listDetail?.name || "Liste"}' takip edildi.`);
            queryClient.invalidateQueries({ queryKey: ["list-detail", listId] });
            queryClient.invalidateQueries({ queryKey: ["followed-lists-by-me"] });
        },
        onError: (error) => {
            toast.error(`Takip etme başarısız: ${error.message}`);
        },
    });

    const unfollowMutation = useMutation({
        mutationFn: () => listApi.unfollowList(listId),
        onSuccess: () => {
            toast.success(`'${listDetail?.name || "Liste"}' takipten çıkıldı.`);
            queryClient.invalidateQueries({ queryKey: ["list-detail", listId] });
            queryClient.invalidateQueries({ queryKey: ["followed-lists-by-me"] });
        },
        onError: (error) => {
            toast.error(`Takipten çıkma başarısız: ${error.message}`);
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
            toast.error("Liste verisi henüz yüklenmedi, lütfen tekrar deneyin.");
        }
    };

    const handleFollow = useCallback(() => {
        followMutation.mutate();
    }, [followMutation]);

    const handleUnfollow = useCallback(() => {
        unfollowMutation.mutate();
    }, [unfollowMutation]);

    if (isLoading) {
        return (
            <div className="w-full h-full overflow-y-auto p-5">
                <div className="animate-pulse">
                    <div className="h-20 w-3/4 bg-muted rounded mb-6"></div>
                </div>
                <Separator className="my-6" />
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">Listedeki Oyunlar</h2>
                    <span>(</span>
                    <Loader className="h-6 w-6" />
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
        return <div>Liste bulunamadı.</div>;
    }

    const isFormPending = updateListMutation.isPending;
    const currentUserId = user ? Number(user.id) : undefined;

    const headerActions = (
        <div className="flex items-center gap-2">
            {isOwner && (
                <>
                    <Button className="cursor-pointer" onClick={() => setIsAddGameModalOpen(true)}>
                        <ListPlus className="mr-2 h-4 w-4" />
                        Oyun Ekle
                    </Button>
                    <Button variant="outline" className="cursor-pointer" onClick={handleEditClick} disabled={isFormPending} title="Listeyi düzenle">
                        <Edit className="mr-2 h-4 w-4" /> Düzenle
                    </Button>
                </>
            )}
            {!isOwner &&
                (listDetail.isFollowing ? (
                    <Button variant="outline" onClick={handleUnfollow} disabled={unfollowMutation.isPending} title="Takipten Çık" className="cursor-pointer">
                        <UserMinus className="mr-2 h-4 w-4" /> Takipten Çık
                    </Button>
                ) : (
                    <Button variant="default" className="cursor-pointer" onClick={handleFollow} disabled={followMutation.isPending} title="Takip Et">
                        <UserPlus className="mr-2 h-4 w-4" /> Takip Et
                    </Button>
                ))}
        </div>
    );

    return (
        <div className="w-full h-full overflow-y-auto p-5">
            <ListDetailHeader
                list={listDetail}
                actions={headerActions}
                myRating={myRating}
                onSubmitRating={handleRatingSubmit}
                isRatingPending={submitRatingMutation.isPending}
                currentUserId={currentUserId}
            />
            <Separator className="my-6" />

            <h2 className="text-2xl font-bold mb-4">Listedeki Oyunlar ({listDetail.games.length})</h2>

            {listDetail.games.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">Bu listede henüz hiç oyun yok.</div>
            ) : (
                <div className="relative">
                    {/* Oyun Grid'i */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
                        {displayedGames.map((game) => (
                            <ListGameCard key={game.rawgId} game={game} showRemoveButton={isOwner} onRemove={handleRemoveGame} />
                        ))}
                    </div>

                    {hasMoreGames && (
                        <>
                            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
                            <div className="relative flex flex-col items-center gap-3 mt-6">
                                <span className="text-sm text-muted-foreground font-medium">Daha Fazla Oyun Göster ({listDetail.games.length - visibleGamesCount} adet)</span>
                                <button onClick={() => setVisibleGameRows((prev) => prev + ROWS_PER_LOAD)} className="group relative cursor-pointer" aria-label="Daha fazla oyun göster">
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
        </div>
    );
}
