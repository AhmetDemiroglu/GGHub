"use client";

import * as React from "react";
import { ColumnDef, ColumnFiltersState, SortingState, flexRender, getCoreRowModel, useReactTable, PaginationState } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table";
import { DataPagination } from "@/core/components/other/data-pagination";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];

    columnFilters: ColumnFiltersState;
    setColumnFilters: React.Dispatch<React.SetStateAction<ColumnFiltersState>>;

    sorting: SortingState;
    setSorting: React.Dispatch<React.SetStateAction<SortingState>>;

    totalCount: number;
    pagination: PaginationState;
    setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
}

export function DataTable<TData, TValue>({ columns, data, columnFilters, setColumnFilters, sorting, setSorting, totalCount, pagination, setPagination }: DataTableProps<TData, TValue>) {
    const pageCount = Math.ceil(totalCount / pagination.pageSize);

    const table = useReactTable({
        data,
        columns,
        pageCount: pageCount,

        state: {
            columnFilters,
            pagination,
            sorting,
        },

        onPaginationChange: setPagination,
        onColumnFiltersChange: setColumnFilters,
        onSortingChange: setSorting,

        getCoreRowModel: getCoreRowModel(),

        manualPagination: true,
        manualFiltering: true,
        manualSorting: true,
    });
    const onPageChange = (page: number) => {
        setPagination((prev) => ({ ...prev, pageIndex: page - 1 }));
    };

    return (
        <div className="w-full space-y-4">
            {/* 1. Tablo */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="cursor-pointer" onClick={header.column.getToggleSortingHandler()}>
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                            {{
                                                asc: " ▾",
                                                desc: " ▴",
                                            }[header.column.getIsSorted() as string] ?? null}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    Sonuç bulunamadı.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* 2. Pagination */}
            <div className="flex items-center justify-end py-4">
                <DataPagination page={pagination.pageIndex + 1} pageSize={pagination.pageSize} totalCount={totalCount} onPageChange={onPageChange} />
            </div>
        </div>
    );
}
