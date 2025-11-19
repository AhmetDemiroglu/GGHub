"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PaginationState, SortingState } from "@tanstack/react-table";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { BrushCleaning } from "lucide-react";
import { getReports } from "@/api/admin/admin.api";
import type { ReportFilterParams } from "@/models/admin/admin.model";
import { ReportStatus } from "@/models/report/report.model";
import { translateEntityType } from "@/core/lib/report.utils";
import { DataTable } from "@/core/components/admin/data-table";
import { columns } from "@/core/components/other/admin-reports/column";
import { DatePicker } from "@/core/components/ui/date-picker";
import { Input } from "@/core/components/ui/input";
import { Button } from "@/core/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = React.useState(value);
    React.useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function ReportsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const initialPage = Number(searchParams.get("page")) || 1;
    const initialPageSize = Number(searchParams.get("pageSize")) || 15;
    const initialSearch = searchParams.get("search") || "";
    const initialSort = searchParams.get("sortBy") || "createdAt";
    const initialSortDir = searchParams.get("sortDir") || "desc";

    const statusParam = searchParams.get("status");
    const initialStatus = statusParam && !isNaN(Number(statusParam)) ? Number(statusParam) : "All";

    const initialEntityType = searchParams.get("type") || "All";

    const initialStartDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : null;
    const initialEndDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : null;

    const [pagination, setPagination] = React.useState<PaginationState>({
        pageIndex: initialPage - 1,
        pageSize: initialPageSize,
    });
    const [sorting, setSorting] = React.useState<SortingState>([{ id: initialSort, desc: initialSortDir === "desc" }]);

    const [searchTerm, setSearchTerm] = React.useState(initialSearch);
    const [statusFilter, setStatusFilter] = React.useState<ReportStatus | "All">(initialStatus as ReportStatus | "All");
    const [entityTypeFilter, setEntityTypeFilter] = React.useState(initialEntityType);
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

        if (debouncedSearchTerm) params.set("search", debouncedSearchTerm);
        else params.delete("search");

        if (statusFilter !== "All") params.set("status", statusFilter.toString());
        else params.delete("status");

        if (entityTypeFilter !== "All") params.set("type", entityTypeFilter);
        else params.delete("type");

        if (dateRange?.from) params.set("startDate", format(dateRange.from, "yyyy-MM-dd"));
        else params.delete("startDate");

        if (dateRange?.to) params.set("endDate", format(dateRange.to, "yyyy-MM-dd"));
        else params.delete("endDate");

        if (params.toString() !== searchParams.toString()) {
            router.push(`${pathname}?${params.toString()}`);
        }
    }, [pagination, sorting, debouncedSearchTerm, statusFilter, entityTypeFilter, dateRange, pathname, router, searchParams]);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["adminReports", debouncedSearchTerm, statusFilter, entityTypeFilter, dateRange?.from, dateRange?.to, pagination.pageIndex, pagination.pageSize, sorting],
        queryFn: async () => {
            const filterParams: ReportFilterParams = {
                page: pagination.pageIndex + 1,
                pageSize: pagination.pageSize,
                searchTerm: debouncedSearchTerm || undefined,
                statusFilter: statusFilter === "All" ? undefined : statusFilter,
                entityTypeFilter: entityTypeFilter === "All" ? undefined : entityTypeFilter,
                startDate: dateRange?.from,
                endDate: dateRange?.to,
                sortBy: sorting.length > 0 ? sorting[0].id : "createdAt",
                sortDirection: sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : "desc",
            };
            return (await getReports(filterParams)).data;
        },
        placeholderData: (prevData) => prevData,
    });

    const tableData = data?.items ?? [];
    const totalCount = data?.totalCount ?? 0;

    const clearFilters = () => {
        setSearchTerm("");
        setStatusFilter("All");
        setEntityTypeFilter("All");
        setDateRange(undefined);
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    };

    return (
        <div className="container flex flex-col gap-8 py-6 lg:py-8 px-6 lg:px-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Rapor Yönetimi</h2>
                <p className="text-muted-foreground">Platformdaki tüm içerik raporlarını inceleyin ve yönetin.</p>
            </div>

            <div className="flex flex-wrap items-center gap-4 justify-between">
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <Input placeholder="Sebep veya kullanıcı ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-[240px]" />

                    <Select value={statusFilter.toString()} onValueChange={(val) => setStatusFilter(val === "All" ? "All" : Number(val))}>
                        <SelectTrigger className="w-full sm:w-[160px] cursor-pointer">
                            <SelectValue placeholder="Durum" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All" className="cursor-pointer">
                                Tüm Durumlar
                            </SelectItem>
                            <SelectItem value={ReportStatus.Open.toString()} className="cursor-pointer">
                                Açık
                            </SelectItem>
                            <SelectItem value={ReportStatus.Resolved.toString()} className="cursor-pointer">
                                Çözüldü
                            </SelectItem>
                            <SelectItem value={ReportStatus.Ignored.toString()} className="cursor-pointer">
                                Reddedildi
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                        <SelectTrigger className="w-full sm:w-[160px] cursor-pointer">
                            <SelectValue placeholder="Tür" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All" className="cursor-pointer">
                                Tüm Türler
                            </SelectItem>
                            <SelectItem value="Review" className="cursor-pointer">
                                {translateEntityType("Review")}
                            </SelectItem>
                            <SelectItem value="Comment" className="cursor-pointer">
                                {translateEntityType("Comment")}
                            </SelectItem>
                            <SelectItem value="List" className="cursor-pointer">
                                {translateEntityType("List")}
                            </SelectItem>
                            <SelectItem value="User" className="cursor-pointer">
                                {translateEntityType("User")}
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <DatePicker date={dateRange?.from} onDateChange={(date) => setDateRange((prev) => ({ from: date, to: prev?.to }))} placeholder="Başlangıç Tarihi" className="w-full sm:w-[180px]" />
                        <DatePicker date={dateRange?.to} onDateChange={(date) => setDateRange((prev) => ({ from: prev?.from, to: date }))} placeholder="Bitiş Tarihi" className="w-full sm:w-[180px]" />
                    </div>
                </div>

                <Button variant="ghost" onClick={clearFilters} className="sm:ml-auto border-2 cursor-pointer">
                    <BrushCleaning className="h-4 w-4" />
                </Button>
            </div>

            {isLoading && tableData.length === 0 ? (
                <p className="text-center text-muted-foreground">Raporlar yükleniyor...</p>
            ) : isError ? (
                <p className="text-center text-destructive">Raporlar yüklenirken bir hata oluştu.</p>
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
