"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { BrushCleaning } from "lucide-react";
import { getErrorGroups } from "@/api/admin/error-log.api";
import type { ErrorGroup, ErrorLogSource, ErrorLogStatus } from "@/models/admin/error-log.model";
import { errorEndpoint, shortTypeName } from "@/core/lib/error-log-format";
import { ErrorDetailDialog, errorStatusLabel, errorStatusVariant } from "@/core/components/admin/error-detail-dialog";
import { DataPagination } from "@/core/components/other/data-pagination";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";

const PAGE_SIZE = 25;

type StatusFilter = ErrorLogStatus | "all";
type SourceFilter = ErrorLogSource | "all";
type RangeFilter = "all" | "24h" | "7d" | "30d";

const RANGE_HOURS: Record<Exclude<RangeFilter, "all">, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = React.useState(value);
    React.useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

const sourceLabel = (t: ReturnType<typeof useI18n>, source: ErrorLogSource) => {
    switch (source) {
        case "job":
            return t("admin.errors.sourceJob");
        case "bot":
            return t("admin.errors.sourceBot");
        default:
            return t("admin.errors.sourceApi");
    }
};

export default function ErrorLogsPage() {
    const t = useI18n();
    const locale = useCurrentLocale();

    const [page, setPage] = React.useState(1);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [status, setStatus] = React.useState<StatusFilter>("open");
    const [source, setSource] = React.useState<SourceFilter>("all");
    const [range, setRange] = React.useState<RangeFilter>("all");
    const [selectedId, setSelectedId] = React.useState<number | null>(null);

    const debouncedSearch = useDebounce(searchTerm, 400);

    // Saat basina yuvarlanir: her render'da yeni bir "from" uretip sorguyu surekli yenilemesin.
    const from = React.useMemo(() => {
        if (range === "all") return undefined;
        const date = new Date();
        date.setMinutes(0, 0, 0);
        date.setHours(date.getHours() - RANGE_HOURS[range]);
        return date.toISOString();
    }, [range]);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["adminErrorGroups", page, debouncedSearch, status, source, from],
        queryFn: async () =>
            (
                await getErrorGroups({
                    page,
                    pageSize: PAGE_SIZE,
                    status,
                    source: source === "all" ? undefined : source,
                    search: debouncedSearch || undefined,
                    from,
                })
            ).data,
        placeholderData: (prev) => prev,
        refetchInterval: 60_000,
    });

    const rows: ErrorGroup[] = data?.items ?? [];
    const totalCount = data?.totalCount ?? 0;

    // Filtre sonucu kuculunce acik sayfa bos kalmasin.
    React.useEffect(() => {
        if (!data) return;
        const lastPage = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
        if (page > lastPage) setPage(lastPage);
    }, [data, totalCount, page]);

    const clearFilters = () => {
        setSearchTerm("");
        setStatus("open");
        setSource("all");
        setRange("all");
        setPage(1);
    };

    const formatDate = (value: string) => new Date(value).toLocaleString(locale === "tr" ? "tr-TR" : "en-US", { dateStyle: "short", timeStyle: "short" });

    return (
        // md ve ustu: sayfa KAYMAZ. Kok, ana alanin yuksekligini doldurur; kayma yalnizca tablo
        // kutusunun icindedir, sayfalama altta sabit kalir. Mobilde sayfa kayar, sayfalama alta yapisir.
        <div className="flex flex-col gap-4 px-6 py-6 md:h-full md:overflow-hidden lg:px-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">{t("admin.errors.title")}</h2>
                <p className="text-muted-foreground">{t("admin.errors.description")}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Input
                    placeholder={t("admin.errors.searchPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(1);
                    }}
                    className="w-full sm:w-[260px]"
                />

                <Select
                    value={status}
                    onValueChange={(value) => {
                        setStatus(value as StatusFilter);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-full cursor-pointer sm:w-[160px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="open" className="cursor-pointer">{t("admin.errors.statusOpen")}</SelectItem>
                        <SelectItem value="resolved" className="cursor-pointer">{t("admin.errors.statusResolved")}</SelectItem>
                        <SelectItem value="ignored" className="cursor-pointer">{t("admin.errors.statusIgnored")}</SelectItem>
                        <SelectItem value="all" className="cursor-pointer">{t("admin.errors.statusAll")}</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={source}
                    onValueChange={(value) => {
                        setSource(value as SourceFilter);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-full cursor-pointer sm:w-[170px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="cursor-pointer">{t("admin.errors.sourceAll")}</SelectItem>
                        <SelectItem value="api" className="cursor-pointer">{t("admin.errors.sourceApi")}</SelectItem>
                        <SelectItem value="job" className="cursor-pointer">{t("admin.errors.sourceJob")}</SelectItem>
                        <SelectItem value="bot" className="cursor-pointer">{t("admin.errors.sourceBot")}</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={range}
                    onValueChange={(value) => {
                        setRange(value as RangeFilter);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-full cursor-pointer sm:w-[160px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="cursor-pointer">{t("admin.errors.rangeAll")}</SelectItem>
                        <SelectItem value="24h" className="cursor-pointer">{t("admin.errors.range24h")}</SelectItem>
                        <SelectItem value="7d" className="cursor-pointer">{t("admin.errors.range7d")}</SelectItem>
                        <SelectItem value="30d" className="cursor-pointer">{t("admin.errors.range30d")}</SelectItem>
                    </SelectContent>
                </Select>

                <Button variant="ghost" onClick={clearFilters} className="cursor-pointer border-2 sm:ml-auto" aria-label={t("admin.reportsPageClearFilters")}>
                    <BrushCleaning className="h-4 w-4" />
                </Button>
            </div>

            {isLoading && rows.length === 0 ? (
                <p className="text-center text-muted-foreground">{t("admin.errors.loading")}</p>
            ) : isError ? (
                <p className="text-center text-destructive">{t("admin.errors.loadError")}</p>
            ) : (
                <>
                    {/* Ortak <Table> kendi overflow-x kutusunu acar; yapiskan baslik icin kayan kutu TEK olmali. */}
                    <div data-testid="errors-table-scroll" className="overflow-auto rounded-md border md:min-h-0 md:flex-1">
                        {/* table-fixed: uzun mesaj sutunu genisletmesin, tablo kutuya sigsin. Dar ekranda yatay kayma kutunun icinde. */}
                        <table className="w-full min-w-[680px] table-fixed caption-bottom text-sm">
                            <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_var(--border)]">
                                <TableRow>
                                    <TableHead className="w-[118px]">{t("admin.errors.colLastSeen")}</TableHead>
                                    <TableHead className="w-[104px]">{t("admin.errors.colSource")}</TableHead>
                                    <TableHead className="w-[30%]">{t("admin.errors.colEndpoint")}</TableHead>
                                    <TableHead>{t("admin.errors.colError")}</TableHead>
                                    <TableHead className="w-[64px] text-right">{t("admin.errors.colCount")}</TableHead>
                                    <TableHead className="w-[112px]">{t("admin.errors.colStatus")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.length ? (
                                    rows.map((row) => (
                                        <TableRow key={row.id} className="cursor-pointer" onClick={() => setSelectedId(row.id)}>
                                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(row.lastSeenAt)}</TableCell>
                                            <TableCell className="whitespace-nowrap text-xs">{sourceLabel(t, row.source)}</TableCell>
                                            <TableCell className="truncate font-mono text-xs" title={errorEndpoint(row)}>
                                                {errorEndpoint(row)}
                                            </TableCell>
                                            <TableCell className="min-w-0">
                                                <div className="truncate text-sm font-medium" title={row.exceptionType}>
                                                    {shortTypeName(row.exceptionType)}
                                                </div>
                                                <div className="truncate text-xs text-muted-foreground" title={row.message}>
                                                    {row.message}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">{row.count.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Badge variant={errorStatusVariant(row.status)}>{errorStatusLabel(t, row.status)}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            {t("admin.errors.empty")}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </table>
                    </div>

                    <div data-testid="errors-pagination" className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 bg-background py-2 md:static md:py-0">
                        <span className="text-xs text-muted-foreground">{t("admin.errors.total").replace("{count}", totalCount.toLocaleString())}</span>
                        <div>
                            <DataPagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={setPage} />
                        </div>
                    </div>
                </>
            )}

            <ErrorDetailDialog groupId={selectedId} onClose={() => setSelectedId(null)} />
        </div>
    );
}
