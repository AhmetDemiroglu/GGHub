"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/core/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { useDebounce } from "@/core/hooks/use-debounce";
import * as listApi from "@/api/list/list.api";
import { ListCategory, UserList, UserListForCreation, UserListForUpdate } from "@/models/list/list.model";
import { ListCard } from "@/core/components/other/list-card/";
import { ListCardSkeleton } from "@/core/components/other/list-card/skeleton";
import { Button } from "@/core/components/ui/button";
import { Plus, Edit, Trash2, Loader } from "lucide-react";
import { DeleteListDialog } from "@core/components/other/lists/delete-list-dialog";
import { Separator } from "@/core/components/ui/separator";
import { ListFormModal } from "@core/components/other/lists/list-form-modal";
import { toast } from "sonner";
import { UnauthorizedAccess } from "@core/components/other/unauthorized-access";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@core/components/ui/tabs";
import { DataPagination } from "@core/components/other/data-pagination";
import Link from "next/link";
import { useAuth } from "@core/hooks/use-auth";

const pageSizeOptions = [12, 24, 40];

const MY_LISTS_TAB = "my-lists";
const FOLLOWED_LISTS_TAB = "followed-lists";

const categoryOptions = [
    { value: "all", label: "Tüm Kategoriler" },
    ...Object.keys(ListCategory)
        .filter((v) => !isNaN(Number(v)))
        .map((key) => {
            const label = ListCategory[key as any];
            return {
                value: key,
                label: label === "Other" ? "Diğer" : label,
            };
        }),
];

const visibilityOptions = [
    { value: "all", label: "Tüm Görünümler" },
    { value: "0", label: "Herkese Açık" },
    { value: "1", label: "Sadece Takipçiler" },
    { value: "2", label: "Özel" },
];

export default function MyListsPage() {
    const [activeTab, setActiveTab] = useState<string>(MY_LISTS_TAB);
    const { user, isLoading } = useAuth();

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const [selectedVisibility_MyLists, setSelectedVisibility_MyLists] = useState("all");

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [listToDelete, setListToDelete] = useState<UserList | null>(null);
    const [listToEdit, setListToEdit] = useState<UserList | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const {
        data: myLists,
        isLoading: myListsLoading,
        error: myListsError,
    } = useQuery<UserList[]>({
        queryKey: ["my-lists"],
        queryFn: listApi.getMyLists,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
    });

    const [page_Followed, setPage_Followed] = useState(1);
    const [pageSize_Followed, setPageSize_Followed] = useState(12);
    const [page_MyLists, setPage_MyLists] = useState(1);
    const [pageSize_MyLists, setPageSize_MyLists] = useState(12);

    const {
        data: followedListsResult,
        isLoading: followedListsLoading,
        error: followedListsError,
    } = useQuery({
        queryKey: ["followed-lists-by-me", page_Followed, pageSize_Followed, debouncedSearchTerm, selectedCategory],
        queryFn: () =>
            listApi.getFollowedListsByMe({
                page: page_Followed,
                pageSize: pageSize_Followed,
                searchTerm: debouncedSearchTerm || undefined,
                category: selectedCategory !== "all" ? Number(selectedCategory) : undefined,
            }),
        placeholderData: (previousData) => previousData,
        staleTime: 1000 * 60,
    });

    useEffect(() => {
        setPage_Followed(1);
    }, [debouncedSearchTerm, selectedCategory]);

    useEffect(() => {
        setPage_MyLists(1);
    }, [debouncedSearchTerm, selectedCategory, selectedVisibility_MyLists]);

    const queryClient = useQueryClient();
    const createListMutation = useMutation({
        mutationFn: (newList: UserListForCreation) => listApi.createList(newList),
        onSuccess: (createdList) => {
            queryClient.invalidateQueries({ queryKey: ["my-lists"] });
            toast.success(`'${createdList.name}' listesi başarıyla oluşturuldu.`);
            setIsModalOpen(false);
        },
        onError: (error) => {
            toast.error(`Liste oluşturulamadı: ${error.message}`);
        },
    });

    const handleCreateList = (values: UserListForCreation) => {
        createListMutation.mutate(values);
    };

    const updateListMutation = useMutation({
        mutationFn: ({ listId, data }: { listId: number; data: UserListForUpdate }) => listApi.updateList(listId, data),
        onSuccess: (_, variables) => {
            toast.success(`'${variables.data.name}' listesi başarıyla güncellendi.`);
            queryClient.invalidateQueries({ queryKey: ["my-lists"] });
            queryClient.invalidateQueries({ queryKey: ["list-detail", variables.listId] });
            setIsModalOpen(false);
            setListToEdit(null);
        },
        onError: (error) => {
            toast.error(`Liste güncellenemedi: ${error.message}`);
        },
    });

    const handleFormSubmit = (values: UserListForCreation | UserListForUpdate) => {
        if (listToEdit) {
            updateListMutation.mutate({ listId: listToEdit.id, data: values });
        } else {
            createListMutation.mutate(values);
        }
    };

    const handleEditClick = (list: UserList) => {
        setListToEdit(list);
        setIsModalOpen(true);
    };

    const deleteListMutation = useMutation({
        mutationFn: (listId: number) => listApi.deleteList(listId),
        onSuccess: (data, deletedListId) => {
            toast.success(`'${listToDelete?.name || "Liste"}' başarıyla silindi.`);
            queryClient.setQueryData<UserList[]>(["my-lists"], (oldData) => {
                if (!oldData) {
                    return oldData;
                }
                return oldData.filter((list) => list.id !== deletedListId);
            });

            setIsDeleteDialogOpen(false);
            setListToDelete(null);
        },
        onError: (error) => {
            toast.error(`Liste silinemedi: ${error.message}`);
        },
    });

    const handleDeleteClick = (list: UserList) => {
        setListToDelete(list);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (listToDelete) {
            deleteListMutation.mutate(listToDelete.id);
        }
    };

    const filteredMyLists = useMemo(() => {
        if (!myLists) return [];
        return myLists.filter((list) => {
            const searchMatch =
                debouncedSearchTerm === "" || list.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || list.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
            const categoryMatch = selectedCategory === "all" || list.category === Number(selectedCategory);
            const visibilityMatch = selectedVisibility_MyLists === "all" || list.visibility === Number(selectedVisibility_MyLists);
            return searchMatch && categoryMatch && visibilityMatch;
        });
    }, [myLists, debouncedSearchTerm, selectedCategory, selectedVisibility_MyLists]);

    const paginatedMyLists = useMemo(() => {
        const startIndex = (page_MyLists - 1) * pageSize_MyLists;
        const endIndex = startIndex + pageSize_MyLists;
        return filteredMyLists.slice(startIndex, endIndex);
    }, [filteredMyLists, page_MyLists, pageSize_MyLists]);

    const totalMyListsCount = filteredMyLists.length;

    if (myListsError || followedListsError) {
        const errorMsg = myListsError?.message || followedListsError?.message;
        return <div className="p-5 text-red-500">Listeler yüklenirken bir hata oluştu: {errorMsg}</div>;
    }

    const isFormPending = createListMutation.isPending || updateListMutation.isPending;

    if (isLoading) {
        return (
            <div className="w-full h-full overflow-y-auto p-5 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Yükleniyor...</p>
                </div>
            </div>
        );
    }
    if (!user) {
        return <UnauthorizedAccess title="Listelerinizi görüntülemek için giriş yapın" description="Oyun listelerinizi yönetmek için bir hesaba sahip olmalısınız." />;
    }

    return (
        <div className="w-full h-full p-5">
            {/* Üst Kısım: Başlık ve Yeni Liste Butonu */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div>
                    <h1 className="text-3xl font-bold">Listelerim</h1>
                    <p className="text-muted-foreground mt-2">Oluşturduğun ve takip ettiğin oyun listelerini yönet.</p>
                </div>
                {activeTab === MY_LISTS_TAB && (
                    <Button onClick={() => setIsModalOpen(true)} className="cursor-pointer">
                        <Plus className="mr-1 h-4 w-4" />
                        Yeni Liste Oluştur
                    </Button>
                )}
            </div>

            <Separator />

            {/* Tabs Yapısı */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
                    <TabsList className="grid w-full sm:w-auto grid-cols-2">
                        <TabsTrigger className="cursor-pointer" value={MY_LISTS_TAB}>
                            Benim Listelerim
                        </TabsTrigger>
                        <TabsTrigger className="cursor-pointer" value={FOLLOWED_LISTS_TAB}>
                            Takip Ettiklerim
                        </TabsTrigger>
                    </TabsList>

                    {/* Sağ Taraf: Arama ve Filtreler */}
                    <div className="flex w-full sm:w-auto flex-col sm:flex-row items-center gap-2">
                        <Input placeholder="Listelerde ara..." className="w-full sm:w-auto" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        {/* Kategori Filtresi */}
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-full sm:w-auto min-w-[180px] cursor-pointer">
                                <SelectValue placeholder="Kategori" />
                            </SelectTrigger>
                            <SelectContent>
                                {categoryOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {/* Görünürlük Filtresi */}
                        {activeTab === MY_LISTS_TAB && (
                            <Select value={selectedVisibility_MyLists} onValueChange={setSelectedVisibility_MyLists}>
                                <SelectTrigger className="w-full sm:w-auto min-w-[180px] cursor-pointer">
                                    <SelectValue placeholder="Görünürlük" />
                                </SelectTrigger>
                                <SelectContent>
                                    {visibilityOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                {/* Tab İçerikleri */}
                <TabsContent value={MY_LISTS_TAB}>
                    {myListsLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {Array.from({ length: pageSize_MyLists }).map((_, index) => (
                                <ListCardSkeleton key={index} />
                            ))}
                        </div>
                    ) : filteredMyLists.length === 0 ? (
                        <div className="text-center text-muted-foreground py-12">
                            {debouncedSearchTerm || selectedCategory !== "all" || selectedVisibility_MyLists !== "all" ? "Bu kriterlere uygun liste bulunamadı." : "Henüz hiç liste oluşturmamışsın."}
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {paginatedMyLists.map((list) => {
                                    const cardFooter = (
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7 cursor-pointer"
                                                aria-label="Listeyi düzenle"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleEditClick(list);
                                                }}
                                                disabled={updateListMutation.isPending && listToEdit?.id === list.id}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7 cursor-pointer text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive"
                                                aria-label="Listeyi sil"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleDeleteClick(list);
                                                }}
                                                disabled={deleteListMutation.isPending && listToDelete?.id === list.id}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    );
                                    return (
                                        <Link key={list.id} href={`/lists/${list.id}`} className="block cursor-pointer">
                                            <ListCard list={list} footer={cardFooter} />
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* Sayfalama Kontrolleri */}
                            {totalMyListsCount > 0 && (
                                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-sm text-muted-foreground text-center sm:text-left order-1 sm:order-1">
                                        Toplam {totalMyListsCount} listeden {paginatedMyLists.length} tanesi gösteriliyor.
                                    </div>
                                    <div className="order-3 sm:order-2">
                                        <DataPagination page={page_MyLists} pageSize={pageSize_MyLists} totalCount={totalMyListsCount} onPageChange={setPage_MyLists} />
                                    </div>
                                    <div className="flex items-center gap-2 order-2 sm:order-3">
                                        <p className="text-sm text-muted-foreground whitespace-nowrap">Sayfa başına:</p>
                                        <Select value={String(pageSize_MyLists)} onValueChange={(value) => setPageSize_MyLists(Number(value))}>
                                            <SelectTrigger className="w-20 cursor-pointer">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {pageSizeOptions.map((size) => (
                                                    <SelectItem key={size} value={String(size)}>
                                                        {size}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </TabsContent>

                <TabsContent value={FOLLOWED_LISTS_TAB}>
                    {followedListsLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {Array.from({ length: pageSize_Followed }).map((_, index) => (
                                <ListCardSkeleton key={index} />
                            ))}
                        </div>
                    ) : !followedListsResult || followedListsResult.items.length === 0 ? (
                        <div className="text-center text-muted-foreground py-12">Takip ettiğin liste bulunamadı veya kriterlere uyan yok.</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {followedListsResult.items.map((list) => (
                                    <Link href={`/lists/${list.id}`} key={list.id} className="block">
                                        <ListCard list={list} />
                                    </Link>
                                ))}
                            </div>

                            {/* Sayfalama Kontrolleri */}
                            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-sm text-muted-foreground text-center sm:text-left order-1 sm:order-1">
                                    Toplam {followedListsResult.totalCount} listeden {followedListsResult.items.length} tanesi gösteriliyor.
                                </div>
                                <div className="order-3 sm:order-2">
                                    <DataPagination page={page_Followed} pageSize={pageSize_Followed} totalCount={followedListsResult.totalCount} onPageChange={setPage_Followed} />
                                </div>
                                <div className="flex items-center gap-2 order-2 sm:order-3">
                                    <p className="text-sm text-muted-foreground whitespace-nowrap">Sayfa başına:</p>
                                    <Select value={String(pageSize_Followed)} onValueChange={(value) => setPageSize_Followed(Number(value))}>
                                        <SelectTrigger className="w-20 cursor-pointer">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pageSizeOptions.map((size) => (
                                                <SelectItem key={size} value={String(size)}>
                                                    {size}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </>
                    )}
                </TabsContent>
            </Tabs>

            {/* Modallar */}
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
            <DeleteListDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => {
                    setIsDeleteDialogOpen(false);
                    if (!deleteListMutation.isPending) {
                        setListToDelete(null);
                    }
                }}
                onConfirm={handleConfirmDelete}
                isPending={deleteListMutation.isPending}
                listName={listToDelete?.name}
            />
        </div>
    );
}
