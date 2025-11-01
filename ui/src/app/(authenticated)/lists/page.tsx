"use client";

import { useState, useEffect, Suspense } from "react"; 
import { useQuery } from "@tanstack/react-query";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebounce } from "@core/hooks/use-debounce";
import * as listApi from "@/api/list/list.api";
import { ListCategory, UserListPublic } from "@/models/list/list.model";
import { Input } from "@core/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@core/components/ui/select";
import { ListCard } from "@core/components/other/list-card";
import { ListCardSkeleton } from "@core/components/other/list-card/skeleton";
import { DataPagination } from "@core/components/other/data-pagination";
import Link from "next/link";
import { Separator } from "@core/components/ui/separator";
import { Switch } from "@core/components/ui/switch";
import { Label } from "@core/components/ui/label";

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

const pageSizeOptions = [12, 24, 40];

function ListDiscoverPageContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
    const [pageSize, setPageSize] = useState(pageSizeOptions.includes(Number(searchParams.get("pageSize"))) ? Number(searchParams.get("pageSize")) : 12);
    const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
    const [followedByMe, setFollowedByMe] = useState(searchParams.get("followedByMe") === "true");
    const [isCategoryMenuOpen, setCategoryMenuOpen] = useState(false);

    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const { data, isLoading, error } = useQuery({
        queryKey: ["public-lists", searchParams.toString()],
        queryFn: () => {
            const currentPage = Number(searchParams.get("page")) || 1;
            const currentPageSize = Number(searchParams.get("pageSize")) || 12;
            const currentSearch = searchParams.get("search") || undefined;
            const currentCategory = searchParams.get("category");
            const currentFollowedByMe = searchParams.get("followedByMe") === "true" ? true : undefined;

            const apiParams = {
                page: currentPage,
                pageSize: currentPageSize,
                searchTerm: currentSearch,
                category: currentCategory && currentCategory !== "all" ? Number(currentCategory) : undefined,
                followedByMe: currentFollowedByMe,
            };

            return listApi.getPublicLists(apiParams);
        },
        placeholderData: (previousData) => previousData,
    });

    useEffect(() => {
        setPage(1);
    }, [debouncedSearchTerm, selectedCategory, followedByMe]);

    useEffect(() => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }, [data]);

    useEffect(() => {
        const params = new URLSearchParams();

        if (page !== 1) params.set("page", String(page));
        if (pageSize !== 12) params.set("pageSize", String(pageSize));
        if (debouncedSearchTerm) params.set("search", debouncedSearchTerm);
        if (selectedCategory && selectedCategory !== "all") {
            params.set("category", selectedCategory);
        }
        if (followedByMe) {
            params.set("followedByMe", "true");
        }

        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.replace(newUrl, { scroll: false });
    }, [page, pageSize, debouncedSearchTerm, selectedCategory, followedByMe, pathname, router]);
    if (error) {
        return <div className="p-5 text-red-500">Listeler yüklenirken bir hata oluştu: {error.message}</div>;
    }

    const lists = data?.items ?? [];
    const totalCount = data?.totalCount ?? 0;

    return (
        <div className="w-full h-full overflow-y-auto p-5">
            <div className="space-y-4">
                {/* Başlık */}
                <div>
                    <h1 className="text-3xl font-bold">Listeleri Keşfet</h1>
                    <p className="text-muted-foreground mt-2">Diğer kullanıcıların oluşturduğu herkese açık listelere göz at.</p>
                </div>

                <Separator />

                {/* Arama ve Kategori Filtre Barı */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
                    <Input placeholder="Listelerde ara..." className="w-full sm:max-w-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />

                    <div className="flex w-full sm:w-auto items-center gap-4">
                        <div className="flex items-center space-x-2">
                            <Switch id="followedByMe-filter" checked={followedByMe} onCheckedChange={setFollowedByMe} className="cursorPointer" />
                            <Label htmlFor="followedByMe-filter" className="text-sm text-muted-foreground whitespace-nowrap">
                                Yalnızca Takip Edilen Kişiler
                            </Label>
                        </div>
                        <Select open={isCategoryMenuOpen} onOpenChange={setCategoryMenuOpen} value={selectedCategory || "all"} onValueChange={setSelectedCategory}>
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
                        {/* TODO: Sıralama (Ordering) Sonra*/}
                    </div>
                </div>
            </div>

            {/* Liste Grid'i */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: pageSize }).map((_, index) => (
                        <ListCardSkeleton key={index} />
                    ))}
                </div>
            ) : lists.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">Bu kriterlere uygun liste bulunamadı.</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {lists.map((list) => (
                        <Link href={`/lists/${list.id}`} key={list.id} className="block">
                            <ListCard list={list} />
                        </Link>
                    ))}
                </div>
            )}

            {totalCount > 0 && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                        Toplam {totalCount} listeden {lists.length} tanesi gösteriliyor.
                    </div>

                    <DataPagination page={page} pageSize={pageSize} totalCount={totalCount} onPageChange={setPage} />

                    <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground whitespace-nowrap">Sayfa başına:</p>
                        <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
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
        </div>
    );
}
export default function ListDiscoverPage() {
    return (
        <Suspense fallback={<div>Yükleniyor...</div>}>
            <ListDiscoverPageContent />
        </Suspense>
    );
}