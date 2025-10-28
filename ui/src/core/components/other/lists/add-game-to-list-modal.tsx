"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { gameApi } from "@/api/gaming/game.api";
import { Button } from "@core/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@core/components/ui/dialog";
import { Input } from "@core/components/ui/input";
import { Loader2, Check, Search } from "lucide-react";
import type { Game } from "@/models/gaming/game.model";
import { useDebounce } from "@core/hooks/use-debounce";

interface AddGameToListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddGame: (gameId: number) => void;
    isPending: boolean;
    existingGameIds: number[];
}

export function AddGameToListModal({ isOpen, onClose, onAddGame, isPending, existingGameIds }: AddGameToListModalProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [submittedSearchTerm, setSubmittedSearchTerm] = useState("");

    const {
        data: searchResults,
        isLoading: isSearchLoading,
        error: searchError,
    } = useQuery({
        queryKey: ["game-search-for-list", submittedSearchTerm, page],
        queryFn: () =>
            submittedSearchTerm
                ? gameApi.paginate({
                      page: page,
                      pageSize: 20,
                      search: submittedSearchTerm,
                  })
                : Promise.resolve(null),
        placeholderData: (previousData) => previousData, 
    });

    const handleSearch = () => {
        if (searchTerm.trim()) {
            setSubmittedSearchTerm(searchTerm.trim());
            setPage(1); 
        }
    };

    const games = searchResults?.items ?? [];
    const showLoading = isSearchLoading;

    return (
        <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Listeye Oyun Ekle</DialogTitle>
                    <DialogDescription>Eklemek istediğin oyunu ara ve seç.</DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Oyun adı ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleSearch();
                                }
                            }}
                        />
                        <Button onClick={handleSearch} disabled={!searchTerm.trim() || isSearchLoading}>
                            {isSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                <div className="max-h-[400px] border rounded-md overflow-y-auto p-4">
                    {isSearchLoading && submittedSearchTerm && (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    {searchError && <p className="text-red-500 text-sm text-center">Arama sırasında hata: {searchError.message}</p>}
                    {!isSearchLoading && submittedSearchTerm && games.length === 0 && <p className="text-muted-foreground text-sm text-center">"{submittedSearchTerm}" için sonuç bulunamadı.</p>}
                    {!submittedSearchTerm && !isSearchLoading && <p className="text-muted-foreground text-sm text-center">Eklemek için bir oyun arayın ve 'Ara' butonuna basın.</p>}
                    <div className="space-y-3">
                        {games.map((game: Game) => {
                            const isAlreadyInList = existingGameIds.includes(game.rawgId);
                            return (
                                <div key={game.rawgId} className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-accent">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <img
                                            src={game.backgroundImage || "/placeholder.png"}
                                            alt={game.name}
                                            className="h-12 w-10 object-cover rounded flex-shrink-0"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.onerror = null;
                                                target.src = "https://placehold.co/40x48/27272a/71717a?text=?";
                                            }}
                                        />
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-sm font-medium truncate">{game.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{game.released ? `(${new Date(game.released).getFullYear()})` : ""}</p>
                                        </div>
                                    </div>
                                    {isAlreadyInList ? (
                                        <span className="text-xs text-green-500 flex items-center flex-shrink-0">
                                            <Check className="h-4 w-4 mr-1" /> Listede
                                        </span>
                                    ) : (
                                        <Button size="sm" onClick={() => onAddGame(game.rawgId)} disabled={isPending} className="flex-shrink-0 cursor-pointer">
                                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ekle"}
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {/* Pagination Butonları */}
                    {searchResults && searchResults.totalCount > 20 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || isSearchLoading}>
                                Önceki
                            </Button>

                            <span className="text-sm text-muted-foreground">
                                Sayfa {page} / {Math.ceil(searchResults.totalCount / 20)}
                            </span>

                            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(searchResults.totalCount / 20) || isSearchLoading}>
                                Sonraki
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
