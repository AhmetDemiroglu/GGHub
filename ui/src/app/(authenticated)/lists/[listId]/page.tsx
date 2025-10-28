"use client";
import type { UserListDetail, UserListForCreation, UserListForUpdate } from "@/models/list/list.model";
import { ListFormModal } from "@core/components/other/lists/list-form-modal";
import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@core/hooks/use-auth";
import { useParams } from "next/navigation";
import * as listApi from "@/api/list/list.api";
import { ListGameCard } from "@core/components/other/game-card/list-game-card";
import { GameCardSkeleton } from "@core/components/other/game-card/skeleton";
import { Separator } from "@core/components/ui/separator";
import { ListDetailHeader } from "@core/components/other/lists/list-detail-header";
import { toast } from "sonner";
import { Button } from "@core/components/ui/button";
import { ListPlus, UserPlus, UserMinus, Edit } from "lucide-react";
import { AddGameToListModal } from "@core/components/other/lists/add-game-to-list-modal";

export default function ListDetailPage() {
    const params = useParams();
    const listId = Number(params.listId);

    const queryClient = useQueryClient();
    const { user } = useAuth();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [listToEdit, setListToEdit] = useState<UserListDetail | null>(null);

    const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false);

    const {
        data: listDetail,
        isLoading,
        error,
    } = useQuery<UserListDetail>({
        queryKey: ["list-detail", listId],
        queryFn: () => listApi.getListDetail(listId),
        enabled: !isNaN(listId) && listId > 0,
    });

    const isOwner = useMemo(() => {
        if (!user || !listDetail) return false;
        return Number(user.id) === listDetail.owner.id;
    }, [user, listDetail]);

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
                <h2 className="text-2xl font-bold mb-4">Listedeki Oyunlar (...)</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 12 }).map((_, index) => (
                        <GameCardSkeleton key={index} />
                    ))}
                </div>
            </div>
        );
    }

    if (!listDetail) {
        return <div>Liste bulunamadı.</div>;
    }

    const isFormPending = updateListMutation.isPending;

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
            <ListDetailHeader list={listDetail} actions={headerActions} />
            <Separator className="my-6" />

            <h2 className="text-2xl font-bold mb-4">Listedeki Oyunlar ({listDetail.games.length})</h2>

            {listDetail.games.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">Bu listede henüz hiç oyun yok.</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
                    {listDetail.games.map((game) => (
                        <ListGameCard key={game.rawgId} game={game} showRemoveButton={isOwner} onRemove={handleRemoveGame} />
                    ))}
                </div>
            )}
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
