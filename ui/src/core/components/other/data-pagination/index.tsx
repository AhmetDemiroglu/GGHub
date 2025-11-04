import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious, PaginationLink, PaginationEllipsis } from "@core/components/ui/pagination";
import { DOTS, usePagination } from "@core/hooks/use-pagination";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DataPaginationProps {
    page: number;
    pageSize: number;
    totalCount: number;
    onPageChange: (page: number) => void;
    siblingCount?: number;
}

export function DataPagination({ page, pageSize, totalCount, onPageChange, siblingCount = 1 }: DataPaginationProps) {
    const paginationRange = usePagination({
        currentPage: page,
        totalCount,
        siblingCount,
        pageSize,
    });

    if (page === 0 || paginationRange.length < 2) {
        return null;
    }

    const onNext = () => onPageChange(page + 1);
    const onPrevious = () => onPageChange(page - 1);

    let lastPage = paginationRange[paginationRange.length - 1];

    return (
        <Pagination>
            <PaginationContent className="flex-wrap gap-1">
                {/* Önceki Butonu */}
                <PaginationItem>
                    <PaginationPrevious onClick={onPrevious} className={`cursor-pointer ${page === 1 ? "pointer-events-none opacity-50" : ""}`}>
                        {/* Mobilde sadece icon */}
                        <span className="hidden sm:inline">Önceki</span>
                        <ChevronLeft className="h-4 w-4 sm:hidden" />
                    </PaginationPrevious>
                </PaginationItem>

                {/* Sayfa Numaraları - Mobilde gizle bazılarını */}
                <div className="hidden sm:flex items-center gap-1">
                    {paginationRange.map((pageNumber, index) => {
                        if (pageNumber === DOTS) {
                            return (
                                <PaginationItem key={`dots-${index}`}>
                                    <PaginationEllipsis />
                                </PaginationItem>
                            );
                        }
                        return (
                            <PaginationItem key={`page-${pageNumber}`} className="cursor-pointer">
                                <PaginationLink isActive={pageNumber === page} onClick={() => onPageChange(pageNumber as number)}>
                                    {pageNumber}
                                </PaginationLink>
                            </PaginationItem>
                        );
                    })}
                </div>

                {/* Mobilde sadece mevcut sayfa */}
                <div className="flex sm:hidden items-center px-3 py-1 text-sm">
                    <span className="font-medium">{page}</span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-muted-foreground">{lastPage}</span>
                </div>

                {/* Sonraki Butonu */}
                <PaginationItem className="cursor-pointer">
                    <PaginationNext onClick={onNext} className={page === lastPage ? "pointer-events-none opacity-50" : ""}>
                        {/* Mobilde sadece icon */}
                        <span className="hidden sm:inline">Sonraki</span>
                        <ChevronRight className="h-4 w-4 sm:hidden" />
                    </PaginationNext>
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
}
