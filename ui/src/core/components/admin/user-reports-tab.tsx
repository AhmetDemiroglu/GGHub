"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdminUserReportSummary } from "@/models/admin/admin.model";
import { ReportStatus } from "@/models/report/report.model";
import { getReportsMadeByUser } from "@/api/admin/admin.api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/core/components/ui/tooltip";
import { Badge } from "@/core/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";
import { enUS, tr } from "date-fns/locale";
import { FileSearch } from "lucide-react";
import { getReportStatusVariant } from "@/core/lib/report.utils";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";

interface UserReportsTabProps {
    userId: number;
}

const getEntityTypeLabel = (t: ReturnType<typeof useI18n>, type: string) => {
    switch (type) {
        case "Comment":
            return t("admin.entityTypes.comment");
        case "Review":
            return t("admin.entityTypes.review");
        case "List":
            return t("admin.entityTypes.list");
        case "User":
            return t("admin.entityTypes.user");
        default:
            return type;
    }
};

const getStatusLabel = (t: ReturnType<typeof useI18n>, status: ReportStatus) => {
    switch (status) {
        case ReportStatus.Open:
            return t("report.status.open");
        case ReportStatus.Resolved:
            return t("report.status.resolved");
        case ReportStatus.Ignored:
            return t("report.status.ignored");
        default:
            return t("report.status.unknown");
    }
};

export const UserReportsTab = ({ userId }: UserReportsTabProps) => {
    const t = useI18n();
    const locale = useCurrentLocale();
    const dateLocale = locale === "tr" ? tr : enUS;

    const {
        data: reports,
        isLoading,
        isError,
    } = useQuery<AdminUserReportSummary[]>({
        queryKey: ["adminUserReports", userId],
        queryFn: async () => (await getReportsMadeByUser(userId)).data,
        enabled: !!userId,
    });

    if (isLoading) {
        return <p className="text-center text-muted-foreground">{t("admin.userReportsLoading")}</p>;
    }

    if (isError) {
        return <p className="text-destructive">{t("admin.userReportsError")}</p>;
    }

    if (!reports || reports.length === 0) {
        return <p className="text-center text-muted-foreground">{t("admin.userReportsEmpty")}</p>;
    }

    return (
        <TooltipProvider>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("admin.userReportsColumns.date")}</TableHead>
                            <TableHead>{t("admin.userReportsColumns.entityType")}</TableHead>
                            <TableHead>{t("admin.userReportsColumns.reason")}</TableHead>
                            <TableHead>{t("admin.userReportsColumns.status")}</TableHead>
                            <TableHead className="text-right">{t("admin.userReportsColumns.action")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reports.map((report) => (
                            <TableRow key={report.reportId}>
                                <TableCell>
                                    {format(new Date(report.reportedAt), "dd MMM yyyy", {
                                        locale: dateLocale,
                                    })}
                                </TableCell>
                                <TableCell className="font-medium">{getEntityTypeLabel(t, report.entityType)}</TableCell>

                                <TableCell className="max-w-xs truncate">
                                    <Tooltip delayDuration={0}>
                                        <TooltipTrigger className="cursor-default">{report.reason}</TooltipTrigger>
                                        <TooltipContent className="max-w-md">
                                            <p>{report.reason}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TableCell>

                                <TableCell>
                                    <Badge variant={getReportStatusVariant(report.status)}>{getStatusLabel(t, report.status)}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Link href={`/reports/${report.reportId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                                        <FileSearch className="h-3.5 w-3.5" />
                                        {t("admin.userReportsViewReport")}
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </TooltipProvider>
    );
};
