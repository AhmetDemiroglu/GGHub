"use client";

import { useState, useEffect, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebounce } from "@core/hooks/use-debounce";
import * as listApi from "@/api/list/list.api";
import { ListCategory } from "@/models/list/list.model";
import { Input } from "@core/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@core/components/ui/select";
import { ListCard } from "@core/components/other/list-card";
import { ListCardSkeleton } from "@core/components/other/list-card/skeleton";
import { DataPagination } from "@core/components/other/data-pagination";
import Link from "next/link";
import { Separator } from "@core/components/ui/separator";
import { Switch } from "@core/components/ui/switch";
import { Label } from "@core/components/ui/label";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";

const pageSizeOptions = [12, 24, 40];

function ListDiscoverPageContent() {
    const locale = useCurrentLocale();
    const t = useI18n();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

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

            return listApi.getPublicLists({
                page: currentPage,
                pageSize: currentPageSize,
                searchTerm: currentSearch,
                category: currentCategory && currentCategory !== "all" ? Number(currentCategory) : undefined,
                followedByMe: currentFollowedByMe,
            });
        },
        placeholderData: (previousData) => previousData,
    });

    useEffect(() => {
        setPage(1);
    }, [debouncedSearchTerm, selectedCategory, followedByMe]);

    useEffect(() => {
        const params = new URLSearchParams();

        if (page !== 1) params.set("page", String(page));
        if (pageSize !== 12) params.set("pageSize", String(pageSize));
        if (debouncedSearchTerm) params.set("search", debouncedSearchTerm);
        if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory);
        if (followedByMe) params.set("followedByMe", "true");

        const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.replace(newUrl, { scroll: false });
    }, [page, pageSize, debouncedSearchTerm, selectedCategory, followedByMe, pathname, router]);

    if (error) {
        return <div className="p-5 text-red-500">{t("lists.loadError")}</div>;
    }

    const lists = data?.items ?? [];
    const totalCount = data?.totalCount ?? 0;

    return (
        <div className="w-full h-full p-5">
            <div className="space-y-4">
                <div>
                    <h1 className="text-3xl font-bold">{t("lists.discoverTitle")}</h1>
                    <p className="mt-2 text-muted-foreground">{t("lists.discoverDescription")}</p>
                </div>

                <Separator />

                <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
                    <Input placeholder={t("lists.searchPlaceholder")} className="w-full md:max-w-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />

                    <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center md:w-auto">
                        <div className="flex items-center justify-between space-x-2 sm:justify-start">
                            <Switch id="followedByMe-filter" checked={followedByMe} onCheckedChange={setFollowedByMe} className="cursor-pointer" />
                            <Label htmlFor="followedByMe-filter" className="text-sm text-muted-foreground">
                                {t("lists.followedByMeOnly")}
                            </Label>
                        </div>
                        <Select open={isCategoryMenuOpen} onOpenChange={setCategoryMenuOpen} value={selectedCategory || "all"} onValueChange={setSelectedCategory}>
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
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: pageSize }).map((_, index) => (
                        <ListCardSkeleton key={index} />
                    ))}
                </div>
            ) : lists.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">{t("lists.noListsForCriteria")}</div>
            ) : (
                <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {lists.map((list) => (
                        <Link href={buildLocalizedPathname(`/lists/${list.id}`, locale)} key={list.id} className="block">
                            <ListCard list={list} />
                        </Link>
                    ))}
                </div>
            )}

            {totalCount > 0 ? (
                <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <div className="order-1 text-center text-sm text-muted-foreground sm:text-left">{t("lists.showingCount", { totalCount, shownCount: lists.length })}</div>
                    <div className="order-3 sm:order-2">
                        <DataPagination page={page} pageSize={pageSize} totalCount={totalCount} onPageChange={setPage} />
                    </div>
                    <div className="order-2 flex items-center gap-2 sm:order-3">
                        <p className="whitespace-nowrap text-sm text-muted-foreground">{t("lists.perPage")}</p>
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
            ) : null}
        </div>
    );
}

export default function ListDiscoverPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ListDiscoverPageContent />
        </Suspense>
    );
}
