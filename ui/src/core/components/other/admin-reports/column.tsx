"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { AdminReport } from "@/models/admin/admin.model";
import { Badge } from "@/core/components/ui/badge";
import { format } from "date-fns";
import type { Locale } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/core/components/ui/tooltip";
import { getReportStatusVariant } from "@/core/lib/report.utils";
import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/core/components/ui/button";

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

export const createReportColumns = (t: TranslateFn, dateLocale: Locale): ColumnDef<AdminReport>[] => [
    {
        accessorKey: "reportedAt",
        header: t("admin.columns.reportDate"),
        cell: ({ row }) => <span className="whitespace-nowrap">{format(new Date(row.original.reportedAt), "dd MMM yyyy, HH:mm", { locale: dateLocale })}</span>,
    },
    {
        accessorKey: "entityType",
        header: t("admin.columns.reportType"),
        cell: ({ row }) => <Badge variant="outline">{t(`admin.entityTypes.${row.original.entityType.toLowerCase()}`)}</Badge>,
    },
    {
        accessorKey: "reporterUsername",
        header: t("admin.columns.reporter"),
        cell: ({ row }) => (
            <Link href={`/users/${row.original.reporterId}`} className="hover:underline text-primary font-medium">
                {row.original.reporterUsername}
            </Link>
        ),
    },
    {
        accessorKey: "reason",
        header: t("admin.columns.reason"),
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
    {
        accessorKey: "status",
        header: t("admin.columns.status"),
        cell: ({ row }) => <Badge variant={getReportStatusVariant(row.original.status)}>{t(`report.status.${row.original.status === 0 ? "open" : row.original.status === 1 ? "resolved" : "ignored"}`)}</Badge>,
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <div className="text-right">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/reports/${row.original.reportId}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        {t("admin.columns.inspect")}
                    </Link>
                </Button>
            </div>
        ),
    },
];
