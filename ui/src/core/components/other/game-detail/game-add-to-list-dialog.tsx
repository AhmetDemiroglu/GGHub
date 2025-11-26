import { getMyLists, addGameToList } from "@/api/list/list.api";
import { UserList } from "@/models/list/list.model";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Loader2, Lock, Globe, Users } from "lucide-react";
import React from "react";
import { toast } from "sonner";

interface GameAddToListDialogProps {
    isOpen: boolean;
    onClose: () => void;
    gameId: number;
}

export const GameAddToListDialog = ({ isOpen, onClose, gameId }: GameAddToListDialogProps) => {
    const queryClient = useQueryClient();

    const { data: myLists, isLoading } = useQuery({
        queryKey: ["my-lists"],
        queryFn: getMyLists,
        enabled: isOpen,
    });

    const { mutate: addGame, isPending } = useMutation({
        mutationFn: (listId: number) => addGameToList(listId, gameId),
        onSuccess: () => {
            toast.success("Oyun listeye eklendi");
            onClose();
        },
        onError: (error: any) => {
            toast.error("Ekleme başarısız", {
                description: error.response?.data?.message || "Bir hata oluştu"
            });
        }
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#151515] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <h3 className="font-bold text-white">Listeye Ekle</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
                        <X size={20} className="text-zinc-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-10 text-zinc-500">
                            <Loader2 size={30} className="animate-spin mb-2" />
                            <span className="text-sm">Listeler yükleniyor...</span>
                        </div>
                    ) : myLists && myLists.length > 0 ? (
                        <div className="space-y-1">
                            {myLists.map((list: UserList) => (
                                <button
                                    key={list.id}
                                    disabled={isPending}
                                    onClick={() => addGame(list.id)}
                                    className="w-full flex items-center gap-4 p-3 hover:bg-zinc-800/50 rounded-lg transition-colors group text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {/* Liste İkonu / Thumbnail */}
                                    <div className="w-12 h-12 bg-zinc-900 rounded-md flex items-center justify-center border border-zinc-800 group-hover:border-zinc-700">
                                        <span className="text-xl font-bold text-zinc-600 group-hover:text-zinc-400">
                                            {list.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Liste Bilgisi */}
                                    <div className="flex-1">
                                        <h4 className="font-medium text-zinc-200 group-hover:text-white transition-colors line-clamp-1">
                                            {list.name}
                                        </h4>
                                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                                            <span className="flex items-center gap-1">
                                                {list.visibility === 0 && <Globe size={10} />}
                                                {list.visibility === 1 && <Users size={10} />}
                                                {list.visibility === 2 && <Lock size={10} />}
                                                {list.gameCount || 0} Oyun
                                            </span>
                                        </div>
                                    </div>

                                    {/* Ekle Butonu */}
                                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/40 group-hover:bg-green-500 group-hover:text-white group-hover:rotate-90 cursor-pointer transition-all">
                                        <Plus size={16} strokeWidth={3} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 px-6">
                            <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-3 cursor-pointer">
                                <Plus size={24} className="text-zinc-600" />
                            </div>
                            <h4 className="text-white font-medium mb-1">Listen Yok</h4>
                            <p className="text-zinc-500 text-sm mb-4">Henüz hiç liste oluşturmamışsın.</p>
                            <button className="text-sm bg-white text-black font-bold px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                                Yeni Liste Oluştur
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};