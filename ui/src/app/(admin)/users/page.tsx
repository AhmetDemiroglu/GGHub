"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PaginationState, SortingState } from "@tanstack/react-table";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { getUsers } from "@/api/admin/admin.api";
import type { UserFilterParams } from "@/models/admin/admin.model";
import { columns } from "@core/components/other/admin-users/column";
import { DataTable } from "@/core/components/admin/data-table";
import { DatePicker } from "@/core/components/ui/date-picker";
import { Input } from "@/core/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { Button } from "@/core/components/ui/button";
import { BrushCleaning } from "lucide-react";

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = React.useState(value);
    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

export default function UsersPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const initialPage = Number(searchParams.get("page")) || 1;
    const initialPageSize = Number(searchParams.get("pageSize")) || 10;
    const initialSearch = searchParams.get("search") || "";
    const initialStatus = searchParams.get("status") || "All";
    const initialSort = searchParams.get("sortBy") || "createdAt";
    const initialSortDir = searchParams.get("sortDir") || "desc";
    const initialStartDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : null;
    const initialEndDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : null;

    const [pagination, setPagination] = React.useState<PaginationState>({
        pageIndex: initialPage - 1,
        pageSize: initialPageSize,
    });
    const [sorting, setSorting] = React.useState<SortingState>([{ id: initialSort, desc: initialSortDir === "desc" }]);

    const [searchTerm, setSearchTerm] = React.useState(initialSearch);
    const [statusFilter, setStatusFilter] = React.useState<UserFilterParams["statusFilter"]>(initialStatus as UserFilterParams["statusFilter"]);
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
        from: initialStartDate ?? undefined,
        to: initialEndDate ?? undefined,
    });

    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    React.useEffect(() => {
        const params = new URLSearchParams(searchParams);
        params.set("page", (pagination.pageIndex + 1).toString());
        params.set("pageSize", pagination.pageSize.toString());

        if (sorting.length > 0) {
            params.set("sortBy", sorting[0].id);
            params.set("sortDir", sorting[0].desc ? "desc" : "asc");
        }

        if (debouncedSearchTerm) {
            params.set("search", debouncedSearchTerm);
        } else {
            params.delete("search");
        }

        if (statusFilter && statusFilter !== "All") {
            params.set("status", statusFilter);
        } else {
            params.delete("status");
        }

        if (dateRange?.from) {
            params.set("startDate", format(dateRange.from, "yyyy-MM-dd"));
        } else {
            params.delete("startDate");
        }
        if (dateRange?.to) {
            params.set("endDate", format(dateRange.to, "yyyy-MM-dd"));
        } else {
            params.delete("endDate");
        }

        if (params.toString() !== searchParams.toString()) {
            router.push(`${pathname}?${params.toString()}`);
        }
    }, [pagination, sorting, debouncedSearchTerm, statusFilter, dateRange, pathname, router, searchParams]);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["adminUsers", debouncedSearchTerm, statusFilter, dateRange?.from, dateRange?.to, pagination.pageIndex, pagination.pageSize, sorting],
        queryFn: async () => {
            const filterParams: UserFilterParams = {
                page: pagination.pageIndex + 1,
                pageSize: pagination.pageSize,
                searchTerm: debouncedSearchTerm || undefined,
                statusFilter: statusFilter === "All" ? undefined : statusFilter,
                startDate: dateRange?.from,
                endDate: dateRange?.to,
                sortBy: sorting.length > 0 ? sorting[0].id : "createdAt",
                sortDirection: sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : "desc",
            };
            const response = await getUsers(filterParams);
            return response.data;
        },
        placeholderData: (prevData) => prevData,
    });

    const tableData = data?.items ?? [];
    const totalCount = data?.totalCount ?? 0;

    const clearFilters = () => {
        setSearchTerm("");
        setStatusFilter("All");
        setDateRange(undefined);
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    };

    return (
        <div className="container flex flex-col gap-8 py-6 lg:py-8 px-6 lg:px-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Kullanıcı Yönetimi</h2>
                <p className="text-muted-foreground">Platformdaki tüm kullanıcıları arayın, filtreleyin ve yönetin.</p>
            </div>
            {/* 1. FİLTRE KONTROLLERİ */}
            <div className="flex flex-wrap items-center gap-4">
                {/* Arama Input'u */}
                <Input placeholder="Kullanıcı adı veya e-posta..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-auto sm:max-w-xs" />
                {/* Durum (Aktif/Banlı) Select */}
                <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value as UserFilterParams["statusFilter"])}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Durum Seçin" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">Tüm Durumlar</SelectItem>
                        <SelectItem value="Active">Aktif</SelectItem>
                        <SelectItem value="Banned">Askıda (Banlı)</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:gap-2">
                    <DatePicker date={dateRange?.from} onDateChange={(date) => setDateRange((prev) => ({ from: date, to: prev?.to }))} placeholder="Başlangıç Tarihi" className="w-full" />
                    <DatePicker date={dateRange?.to} onDateChange={(date) => setDateRange((prev) => ({ from: prev?.from, to: date }))} placeholder="Bitiş Tarihi" className="w-full" />
                </div>

                {/* Filtreleri Temizle */}
                <Button variant="ghost" onClick={clearFilters} className="sm:ml-auto border-2 cursor-pointer">
                    <BrushCleaning className="h-4 w-4" />
                </Button>
            </div>
            {/* 2. TABLO */}
            {isLoading && tableData.length === 0 ? (
                <p>Yükleniyor...</p>
            ) : isError ? (
                <p className="text-destructive">Kullanıcılar yüklenirken bir hata oluştu.</p>
            ) : (
                <DataTable
                    columns={columns}
                    data={tableData}
                    columnFilters={[]}
                    setColumnFilters={() => {}}
                    sorting={sorting}
                    setSorting={setSorting}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalCount={totalCount}
                />
            )}
        </div>
    );
}
