"use client";

import { useMemo, useState } from "react";
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
import { ListPlus, Trash2 } from "lucide-react";
import { AddGameToListModal } from "@core/components/other/lists/add-game-to-list-modal";
export default function ListDetailPage() {
    const params = useParams();
    const listId = Number(params.listId);

    const queryClient = useQueryClient();
    const { user } = useAuth();

    const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false);

    const {
        data: listDetail,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["list-detail", listId],
        queryFn: () => listApi.getListDetail(listId),
        enabled: !isNaN(listId) && listId > 0,
        placeholderData: (previousData) => previousData,
    });

    const isOwner = useMemo(() => {
        if (!user || !listDetail) return false;
        return Number(user.id) === listDetail.owner.id;
    }, [user, listDetail]);

    const addGameMutation = useMutation({
        mutationFn: (gameId: number) => listApi.addGameToList(listId, gameId),
        onSuccess: () => {
            toast.success("Oyun listeye eklendi.");
            queryClient.invalidateQueries({ queryKey: ["list-detail", listId] });
            queryClient.invalidateQueries({ queryKey: ["my-lists"] });
        },
        onError: (error) => {
            toast.error(`Hata: ${error.message}`);
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

    const headerActions = (
        <>
            {isOwner && (
                <Button onClick={() => setIsAddGameModalOpen(true)} className="cursor-pointer">
                    <ListPlus className="mr-1 h-4 w-4" />
                    Oyun Ekle
                </Button>
            )}
        </>
    );

    return (
        <div className="w-full h-full overflow-y-auto p-5">
            <ListDetailHeader list={listDetail} actions={headerActions} />
            <Separator className="my-6" />

            <h2 className="text-2xl font-bold mb-4">Listedeki Oyunlar ({listDetail.games.length})</h2>

            {listDetail.games.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">Bu listede henüz hiç oyun yok.</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {listDetail.games.map((game) => (
                        <ListGameCard key={game.rawgId} game={game} showRemoveButton={isOwner} onRemove={() => removeGameMutation.mutate(game.rawgId)} isRemoving={removeGameMutation.isPending} />
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
        </div>
    );
}
