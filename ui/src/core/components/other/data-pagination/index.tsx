import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious, PaginationLink, PaginationEllipsis } from "@core/components/ui/pagination";
import { DOTS, usePagination } from "@core/hooks/use-pagination";

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
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious onClick={onPrevious} className={page === 1 ? "pointer-events-none opacity-50" : undefined}>
                        Önceki
                    </PaginationPrevious>
                </PaginationItem>

                {paginationRange.map((pageNumber, index) => {
                    if (pageNumber === DOTS) {
                        return (
                            <PaginationItem key={`dots-${index}`} className="cursor-pointer">
                                <PaginationEllipsis />
                            </PaginationItem>
                        );
                    }
                    return (
                        <PaginationItem className="cursor-pointer">
                            <PaginationLink isActive={pageNumber === page} onClick={() => onPageChange(pageNumber as number)}>
                                {pageNumber}
                            </PaginationLink>
                        </PaginationItem>
                    );
                })}

                <PaginationItem className="cursor-pointer">
                    <PaginationNext onClick={onNext} className={page === lastPage ? "pointer-events-none opacity-50" : undefined}>
                        Sonraki
                    </PaginationNext>
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
}
