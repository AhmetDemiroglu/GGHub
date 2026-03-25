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
import { AxiosError } from "axios";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";

const pageSizeOptions = [12, 24, 40];
const MY_LISTS_TAB = "my-lists";
const FOLLOWED_LISTS_TAB = "followed-lists";

export default function MyListsPage() {
    const locale = useCurrentLocale();
    const t = useI18n();
    const [activeTab, setActiveTab] = useState<string>(MY_LISTS_TAB);
    const { user, isLoading } = useAuth();

    const categoryOptions = [
        { value: "all", label: t("lists.allCategories") },
        ...Object.keys(ListCategory)
            .filter((v) => !isNaN(Number(v)))
            .map((key) => {
                const label = String(ListCategory[Number(key) as ListCategory]);
                return {
                    value: key,
                    label: label === "Other" ? t("lists.other") : t(`lists.categories.${label.toLowerCase()}`),
                };
            }),
    ];

    const visibilityOptions = [
        { value: "all", label: t("lists.allVisibilities") },
        { value: "0", label: t("lists.public") },
        { value: "1", label: t("lists.followers") },
        { value: "2", label: t("lists.private") },
    ];

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
        queryFn: () => listApi.getMyLists(),
        enabled: !!user,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
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
        enabled: !!user && activeTab === FOLLOWED_LISTS_TAB,
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
            toast.success(t("lists.createSuccess", { name: createdList.name }));
            setIsModalOpen(false);
        },
        onError: (error: unknown) => {
            if (error instanceof AxiosError && (error.response as { isRateLimitError?: boolean } | undefined)?.isRateLimitError) return;
            toast.error(t("lists.createError", { message: (error as Error).message }));
        },
    });

    const updateListMutation = useMutation({
        mutationFn: ({ listId, data }: { listId: number; data: UserListForUpdate }) => listApi.updateList(listId, data),
        onSuccess: (_, variables) => {
            toast.success(t("lists.updateSuccess", { name: variables.data.name }));
            queryClient.invalidateQueries({ queryKey: ["my-lists"] });
            queryClient.invalidateQueries({ queryKey: ["list-detail", variables.listId] });
            setIsModalOpen(false);
            setListToEdit(null);
        },
        onError: (error: unknown) => {
            if (error instanceof AxiosError && (error.response as { isRateLimitError?: boolean } | undefined)?.isRateLimitError) return;
            toast.error(t("lists.updateError", { message: (error as Error).message }));
        },
    });

    const deleteListMutation = useMutation({
        mutationFn: (listId: number) => listApi.deleteList(listId),
        onSuccess: (_, deletedListId) => {
            toast.success(t("lists.deleteSuccess", { name: listToDelete?.name || "List" }));
            queryClient.setQueryData<UserList[]>(["my-lists"], (oldData) => oldData?.filter((list) => list.id !== deletedListId) ?? oldData);
            setIsDeleteDialogOpen(false);
            setListToDelete(null);
        },
        onError: (error: unknown) => {
            if (error instanceof AxiosError && (error.response as { isRateLimitError?: boolean } | undefined)?.isRateLimitError) return;
            toast.error(t("lists.deleteError", { message: (error as Error).message }));
        },
    });

    const filteredMyLists = useMemo(() => {
        const lists = myLists ?? [];

        return lists.filter((list: UserList) => {
            const searchMatch =
                debouncedSearchTerm === "" || list.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || list.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
            const categoryMatch = selectedCategory === "all" || list.category === Number(selectedCategory);
            const visibilityMatch = selectedVisibility_MyLists === "all" || list.visibility === Number(selectedVisibility_MyLists);

            return searchMatch && categoryMatch && visibilityMatch && list.type !== 1;
        });
    }, [myLists, debouncedSearchTerm, selectedCategory, selectedVisibility_MyLists]);

    const paginatedMyLists = useMemo(() => {
        const startIndex = (page_MyLists - 1) * pageSize_MyLists;
        return filteredMyLists.slice(startIndex, startIndex + pageSize_MyLists);
    }, [filteredMyLists, page_MyLists, pageSize_MyLists]);

    if (myListsError || followedListsError) {
        return <div className="p-5 text-red-500">{t("lists.loadError")}</div>;
    }

    const isFormPending = createListMutation.isPending || updateListMutation.isPending;

    if (isLoading) {
        return (
            <div className="w-full h-full overflow-y-auto p-5 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">{t("lists.loading")}</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <UnauthorizedAccess title={t("lists.unauthorizedTitle")} description={t("lists.unauthorizedDescription")} />;
    }

    const totalMyListsCount = filteredMyLists.length;

    return (
        <div className="w-full h-full p-5">
            <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-3xl font-bold">{t("lists.myListsTitle")}</h1>
                    <p className="mt-2 text-muted-foreground">{t("lists.myListsDescription")}</p>
                </div>
                {activeTab === MY_LISTS_TAB ? (
                    <Button onClick={() => setIsModalOpen(true)} className="cursor-pointer">
                        <Plus className="mr-1 h-4 w-4" />
                        {t("lists.createNew")}
                    </Button>
                ) : null}
            </div>

            <Separator />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                <div className="mb-5 flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                        <TabsTrigger className="cursor-pointer" value={MY_LISTS_TAB}>
                            {t("lists.myListsTab")}
                        </TabsTrigger>
                        <TabsTrigger className="cursor-pointer" value={FOLLOWED_LISTS_TAB}>
                            {t("lists.followedListsTab")}
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row">
                        <Input placeholder={t("lists.searchPlaceholder")} className="w-full sm:w-auto" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="min-w-[180px] w-full cursor-pointer sm:w-auto">
                                <SelectValue placeholder={t("lists.categoryPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                {categoryOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {activeTab === MY_LISTS_TAB ? (
                            <Select value={selectedVisibility_MyLists} onValueChange={setSelectedVisibility_MyLists}>
                                <SelectTrigger className="min-w-[180px] w-full cursor-pointer sm:w-auto">
                                    <SelectValue placeholder={t("lists.visibilityPlaceholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {visibilityOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : null}
                    </div>
                </div>

                <TabsContent value={MY_LISTS_TAB}>
                    {myListsLoading ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {Array.from({ length: pageSize_MyLists }).map((_, index) => (
                                <ListCardSkeleton key={index} />
                            ))}
                        </div>
                    ) : filteredMyLists.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            {debouncedSearchTerm || selectedCategory !== "all" || selectedVisibility_MyLists !== "all" ? t("lists.noListsForCriteria") : t("lists.noMyLists")}
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {paginatedMyLists.map((list: UserList) => {
                                    const cardFooter = (
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7 cursor-pointer"
                                                aria-label={t("lists.editAria")}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setListToEdit(list);
                                                    setIsModalOpen(true);
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7 cursor-pointer border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                aria-label={t("lists.deleteAria")}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setListToDelete(list);
                                                    setIsDeleteDialogOpen(true);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    );

                                    return (
                                        <Link key={list.id} href={buildLocalizedPathname(`/lists/${list.id}`, locale)} className="block cursor-pointer">
                                            <ListCard list={list} footer={cardFooter} />
                                        </Link>
                                    );
                                })}
                            </div>

                            {totalMyListsCount > 0 ? (
                                <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
                                    <div className="order-1 text-center text-sm text-muted-foreground sm:text-left">{t("lists.showingCount", { totalCount: totalMyListsCount, shownCount: paginatedMyLists.length })}</div>
                                    <div className="order-3 sm:order-2">
                                        <DataPagination page={page_MyLists} pageSize={pageSize_MyLists} totalCount={totalMyListsCount} onPageChange={setPage_MyLists} />
                                    </div>
                                    <div className="order-2 flex items-center gap-2 sm:order-3">
                                        <p className="whitespace-nowrap text-sm text-muted-foreground">{t("lists.perPage")}</p>
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
                            ) : null}
                        </>
                    )}
                </TabsContent>

                <TabsContent value={FOLLOWED_LISTS_TAB}>
                    {followedListsLoading ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {Array.from({ length: pageSize_Followed }).map((_, index) => (
                                <ListCardSkeleton key={index} />
                            ))}
                        </div>
                    ) : !followedListsResult || followedListsResult.items.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">{t("lists.noFollowedLists")}</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {followedListsResult.items.map((list) => (
                                    <Link href={buildLocalizedPathname(`/lists/${list.id}`, locale)} key={list.id} className="block">
                                        <ListCard list={list} />
                                    </Link>
                                ))}
                            </div>

                            <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
                                <div className="order-1 text-center text-sm text-muted-foreground sm:text-left">{t("lists.showingCount", { totalCount: followedListsResult.totalCount, shownCount: followedListsResult.items.length })}</div>
                                <div className="order-3 sm:order-2">
                                    <DataPagination page={page_Followed} pageSize={pageSize_Followed} totalCount={followedListsResult.totalCount} onPageChange={setPage_Followed} />
                                </div>
                                <div className="order-2 flex items-center gap-2 sm:order-3">
                                    <p className="whitespace-nowrap text-sm text-muted-foreground">{t("lists.perPage")}</p>
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

            <ListFormModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    if (!isFormPending) setListToEdit(null);
                }}
                onSubmit={(values) => {
                    if (listToEdit) {
                        updateListMutation.mutate({ listId: listToEdit.id, data: values });
                    } else {
                        createListMutation.mutate(values);
                    }
                }}
                isPending={isFormPending}
                defaultValues={listToEdit}
            />
            <DeleteListDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => {
                    setIsDeleteDialogOpen(false);
                    if (!deleteListMutation.isPending) setListToDelete(null);
                }}
                onConfirm={() => {
                    if (listToDelete) deleteListMutation.mutate(listToDelete.id);
                }}
                isPending={deleteListMutation.isPending}
                listName={listToDelete?.name}
            />
        </div>
    );
}
