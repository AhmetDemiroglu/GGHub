import { getMyLists, addGameToList } from "@/api/list/list.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Loader2, Lock, Globe, Users } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { ListFormModal } from "@/core/components/other/lists/list-form-modal";
import { createList } from "@/api/list/list.api";
import type { UserList, UserListForCreation } from "@/models/list/list.model";
import Link from "next/link";

interface GameAddToListDialogProps {
    isOpen: boolean;
    onClose: () => void;
    gameId: number;
}

export const GameAddToListDialog = ({ isOpen, onClose, gameId }: GameAddToListDialogProps) => {
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { data: myLists, isLoading } = useQuery({
        queryKey: ["my-lists", gameId],
        queryFn: () => getMyLists(gameId),
        enabled: isOpen,
    });

    const filteredLists = myLists?.filter(list => list.type !== 1 && list.type !== 2);

    const { mutate: addGame, isPending: isAdding } = useMutation({
        mutationFn: (listId: number) => addGameToList(listId, gameId),
        onSuccess: (_data, variables) => {
            const targetListId = variables;
            queryClient.setQueryData<UserList[]>(["my-lists", gameId], (oldData) => {
                if (!oldData) return [];
                return oldData.map((list) => {
                    if (list.id === targetListId) {
                        return {
                            ...list,
                            gameCount: (list.gameCount || 0) + 1,
                            containsCurrentGame: true
                        };
                    }
                    return list;
                });
            });
            queryClient.setQueryData<UserList[]>(["my-lists"], (oldData) => {
                if (!oldData) return [];
                return oldData.map((list) => {
                    if (list.id === targetListId) {
                        return {
                            ...list,
                            gameCount: (list.gameCount || 0) + 1
                        };
                    }
                    return list;
                });
            });
            queryClient.invalidateQueries({ queryKey: ["my-lists"] });
            toast.success("Oyun listeye eklendi");
        },
    });

    const { mutateAsync: createNewListAsync, isPending: isCreating } = useMutation({
        mutationFn: (newList: UserListForCreation) => createList(newList),
        onSuccess: (createdList) => {
            queryClient.invalidateQueries({ queryKey: ["my-lists"] });
            toast.success(`'${createdList.name}' oluşturuldu.`);
            setIsCreateModalOpen(false);
        },
        onError: (error: any) => {
            toast.error("Liste oluşturulamadı", { description: error.response?.data?.message });
        }
    });

    if (!isOpen) return null;

    return (
        <>
            {/* MODAL 1: Liste Seçim Ekranı */}
            <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 ${isCreateModalOpen ? "hidden" : "flex"}`}>
                <div className="w-full max-w-md bg-background border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <h3 className="font-bold text-foreground">Listeye Ekle</h3>
                        <button onClick={onClose} className="p-1 hover:bg-secondary rounded-full transition-colors cursor-pointer">
                            <X size={20} className="text-muted-foreground" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="max-h-[60vh] overflow-y-auto p-2">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                                <Loader2 size={30} className="animate-spin mb-2" />
                                <span className="text-sm">Listeler yükleniyor...</span>
                            </div>
                        ) : filteredLists && filteredLists.length > 0 ? (
                            <div className="space-y-1">
                                {filteredLists.map((list: UserList) => {
                                    const isAdded = list.containsCurrentGame;

                                    return (
                                        <div
                                            key={list.id}
                                            className={`w-full flex items-center gap-4 p-3 rounded-lg transition-colors group text-left border border-transparent relative ${!isAdded ? "hover:bg-accent/50 cursor-pointer" : "bg-accent/20 cursor-default"
                                                }`}
                                            onClick={() => !isAdded && addGame(list.id)}
                                        >
                                            {/* Sol: İkon (Sabit) */}
                                            <div className="w-10 h-10 bg-zinc-900 rounded flex items-center justify-center border border-zinc-800 font-bold text-zinc-500 group-hover:text-zinc-300 shrink-0">
                                                {list.name.charAt(0).toUpperCase()}
                                            </div>

                                            {/* Orta: Bilgi ve Link */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                {isAdded ? (
                                                    // EKLİYSE: İsim Link Olur
                                                    <Link
                                                        href={`/lists/${list.id}`}
                                                        onClick={onClose}
                                                        className="font-medium text-primary hover:underline hover:text-primary/80 truncate w-fit"
                                                    >
                                                        {list.name}
                                                    </Link>
                                                ) : (
                                                    // EKLİ DEĞİLSE: İsim Düz Yazı
                                                    <h4 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                                        {list.name}
                                                    </h4>
                                                )}

                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                    {/* Meta Veriler */}
                                                    <span className="flex items-center gap-1">
                                                        {list.visibility === 0 && <Globe size={10} />}
                                                        {list.visibility === 1 && <Users size={10} />}
                                                        {list.visibility === 2 && <Lock size={10} />}
                                                        {list.gameCount || 0} Oyun
                                                    </span>

                                                    {isAdded && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
                                                            <span className="text-[10px] italic text-muted-foreground/70">
                                                                Bu listede ekli
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Sağ: Ekle Butonu */}
                                            {!isAdded && (
                                                <button
                                                    disabled={isLoading}
                                                    className="w-8 h-8 flex items-center justify-center cursor-pointer rounded-full bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all shrink-0"
                                                >
                                                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={18} />}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-10 px-6">
                                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Plus size={24} className="text-muted-foreground" />
                                </div>
                                <h4 className="text-foreground font-medium mb-1">Listen Yok</h4>
                                <p className="text-muted-foreground text-sm mb-4">Henüz hiç liste oluşturmamışsın.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer / Create Button */}
                    <div className="p-4 border-t border-border">
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="w-full py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Plus size={16} /> Yeni Liste Oluştur
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL 2: Liste Oluşturma Formu */}
            {isCreateModalOpen && (
                <ListFormModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSubmit={async (values) => {
                        await createNewListAsync(values as UserListForCreation);
                    }}
                    isPending={isCreating}
                />
            )}
        </>
    );
};