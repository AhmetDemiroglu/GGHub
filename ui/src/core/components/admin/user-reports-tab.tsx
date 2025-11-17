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
import { tr } from "date-fns/locale";
import { FileSearch } from "lucide-react";
import { translateReportStatus, getReportStatusVariant } from "@/core/lib/report.utils";

interface UserReportsTabProps {
    userId: number;
}

const translateEntityType = (type: string) => {
    switch (type) {
        case "Comment":
            return "Yorum";
        case "Review":
            return "İnceleme";
        case "List":
            return "Liste";
        case "User":
            return "Kullanıcı";
        default:
            return type;
    }
};

const getStatusVariant = (status: ReportStatus) => {
    switch (status) {
        case ReportStatus.Open:
            return "destructive";
        case ReportStatus.Resolved:
            return "default";
        case ReportStatus.Ignored:
            return "secondary";
        default:
            return "outline";
    }
};

export const UserReportsTab = ({ userId }: UserReportsTabProps) => {
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
        return <p className="text-center text-muted-foreground">Kullanıcının raporları yükleniyor...</p>;
    }

    if (isError) {
        return <p className="text-destructive">Raporlar yüklenirken bir hata oluştu.</p>;
    }

    if (!reports || reports.length === 0) {
        return <p className="text-center text-muted-foreground">Bu kullanıcının yaptığı herhangi bir rapor bulunmamaktadır.</p>;
    }

    return (
        <TooltipProvider>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tarih</TableHead>
                            <TableHead>Raporlanan İçerik</TableHead>
                            <TableHead>Sebep</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="text-right">Eylem</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reports.map((report) => (
                            <TableRow key={report.reportId}>
                                <TableCell>
                                    {format(new Date(report.reportedAt), "dd MMM yyyy", {
                                        locale: tr,
                                    })}
                                </TableCell>
                                <TableCell className="font-medium">{translateEntityType(report.entityType)}</TableCell>

                                <TableCell className="max-w-xs truncate">
                                    <Tooltip delayDuration={0}>
                                        <TooltipTrigger className="cursor-default">{report.reason}</TooltipTrigger>
                                        <TooltipContent className="max-w-md">
                                            <p>{report.reason}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TableCell>

                                <TableCell>
                                    <Badge variant={getReportStatusVariant(report.status)}>{translateReportStatus(report.status)}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Link href={`/reports/${report.reportId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                                        <FileSearch className="h-3.5 w-3.5" />
                                        Raporu İncele
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
