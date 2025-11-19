"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { AdminReport } from "@/models/admin/admin.model";
import { Badge } from "@/core/components/ui/badge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/core/components/ui/tooltip";
import { translateReportStatus, getReportStatusVariant, translateEntityType } from "@/core/lib/report.utils";
import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/core/components/ui/button";

export const columns: ColumnDef<AdminReport>[] = [
    // 1. Sütun: Tarih
    {
        accessorKey: "reportedAt",
        header: "Tarih",
        cell: ({ row }) => {
            return (
                <span className="whitespace-nowrap">
                    {format(new Date(row.original.reportedAt), "dd MMM yyyy, HH:mm", {
                        locale: tr,
                    })}
                </span>
            );
        },
    },

    // 2. Sütun: Tür
    {
        accessorKey: "entityType",
        header: "Tür",
        cell: ({ row }) => <Badge variant="outline">{translateEntityType(row.original.entityType)}</Badge>,
    },

    // 3. Sütun: Raporlayan
    {
        accessorKey: "reporterUsername",
        header: "Raporlayan",
        cell: ({ row }) => (
            // Raporlayan kullanıcının detayına gitmek için link
            <Link href={`/users/${row.original.reporterId}`} className="hover:underline text-primary font-medium">
                {row.original.reporterUsername}
            </Link>
        ),
    },

    // 4. Sütun: Sebep (Tooltip ile)
    {
        accessorKey: "reason",
        header: "Sebep",
        cell: ({ row }) => (
            <TooltipProvider>
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <span className="max-w-[200px] truncate block cursor-default">{row.original.reason}</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                        <p>{row.original.reason}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        ),
    },

    // 5. Sütun: Durum
    {
        accessorKey: "status",
        header: "Durum",
        cell: ({ row }) => <Badge variant={getReportStatusVariant(row.original.status)}>{translateReportStatus(row.original.status)}</Badge>,
    },

    // 6. Sütun: Eylemler (Detay Butonu)
    {
        id: "actions",
        cell: ({ row }) => {
            return (
                <div className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={`/reports/${row.original.reportId}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            İncele
                        </Link>
                    </Button>
                </div>
            );
        },
    },
];
