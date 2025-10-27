"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/core/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { useDebounce } from "@/core/hooks/use-debounce";
import * as listApi from "@/api/list/list.api";
import { ListCategory, ListVisibilitySetting, UserList, UserListForCreation } from "@/models/list/list.model";
import { ListCard } from "@/core/components/other/list-card/";
import { ListCardSkeleton } from "@/core/components/other/list-card/skeleton";
import { Button } from "@/core/components/ui/button";
import { Plus } from "lucide-react";
import { Separator } from "@/core/components/ui/separator";
import { ListFormModal } from "@core/components/other/lists/list-form-modal";
import { toast } from "sonner";
import Link from "next/link";

const categoryOptions = [
    { value: "all", label: "Tüm Kategoriler" },
    ...Object.keys(ListCategory)
        .filter((v) => !isNaN(Number(v)))
        .map((key) => ({
            value: key,
            label: ListCategory[key as any],
        })),
];

const visibilityOptions = [
    { value: "all", label: "Tüm Görünümler" },
    { value: "0", label: "Herkese Açık" },
    { value: "1", label: "Sadece Takipçiler" },
    { value: "2", label: "Özel" },
];

export default function MyListsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedVisibility, setSelectedVisibility] = useState("all");

    const [isModalOpen, setIsModalOpen] = useState(false);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const {
        data: lists,
        isLoading,
        error,
    } = useQuery<UserList[]>({
        queryKey: ["my-lists"],
        queryFn: listApi.getMyLists,
    });

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

    const filteredLists = useMemo(() => {
        if (!lists) return [];

        return lists.filter((list) => {
            const searchMatch =
                debouncedSearchTerm === "" || list.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || list.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

            const categoryMatch = selectedCategory === "all" || list.category === Number(selectedCategory);

            const visibilityMatch = selectedVisibility === "all" || list.visibility === Number(selectedVisibility);

            return searchMatch && categoryMatch && visibilityMatch;
        });
    }, [lists, debouncedSearchTerm, selectedCategory, selectedVisibility]);

    if (error) {
        return <div className="p-5 text-red-500">Listeler yüklenirken bir hata oluştu: {error.message}</div>;
    }

    return (
        <div className="w-full h-full overflow-y-auto p-5">
            <div className="space-y-4">
                {/* Başlık ve Yeni Liste Butonu */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Listelerim</h1>
                        <p className="text-muted-foreground mt-2">Kendi oluşturduğun oyun listelerini yönet.</p>
                    </div>
                    <Button onClick={() => setIsModalOpen(true)} className="cursor-pointer">
                        <Plus className="mr-1 h-4 w-4" />
                        Yeni Liste Oluştur
                    </Button>
                </div>

                <Separator />

                {/* Filtreleme Barı (DiscoverPage'e benzer) */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Input placeholder="Listelerimde ara..." className="w-full sm:max-w-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />

                    <div className="flex w-full sm:w-auto flex-col sm:flex-row items-center gap-2">
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

                        <Select value={selectedVisibility} onValueChange={setSelectedVisibility}>
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
                    </div>
                </div>

                {/* Liste Grid'i */}
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({ length: 12 }).map((_, index) => (
                            <ListCardSkeleton key={index} />
                        ))}
                    </div>
                ) : filteredLists.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                        {debouncedSearchTerm || selectedCategory !== "all" || selectedVisibility !== "all" ? "Bu kriterlere uygun liste bulunamadı." : "Henüz hiç liste oluşturmamışsın."}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredLists.map((list) => (
                            <Link href={`/lists/${list.id}`} key={list.id}>
                                <ListCard list={list} />
                            </Link>
                        ))}
                    </div>
                )}
            </div>
            <ListFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreateList} isPending={createListMutation.isPending} />
        </div>
    );
}
