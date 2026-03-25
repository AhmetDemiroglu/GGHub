"use client";

import { useQuery } from "@tanstack/react-query";
import { type MyReportSummary, ReportStatus } from "@/models/report/report.model";
import { getMyReports } from "@/api/report/report.api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table";
import { Badge } from "@/core/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/core/components/ui/tooltip";
import { format } from "date-fns";
import { enUS, tr } from "date-fns/locale";
import { getReportStatusVariant } from "@/core/lib/report.utils";
import { ReportResultDialog } from "@/core/components/admin/report-result-dialog";
import { useState } from "react";
import { MessageSquareText, Clock } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";

const getEntityTypeLabel = (t: ReturnType<typeof useI18n>, type: string) => {
    switch (type) {
        case "Comment":
            return t("report.entityTypes.comment");
        case "Review":
            return t("report.entityTypes.review");
        case "List":
            return t("report.entityTypes.list");
        case "User":
            return t("report.entityTypes.user");
        default:
            return type;
    }
};

const getReportStatusLabel = (t: ReturnType<typeof useI18n>, status: ReportStatus) => {
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

export default function MyReportsPage() {
    const t = useI18n();
    const locale = useCurrentLocale();
    const dateLocale = locale === "tr" ? tr : enUS;

    const {
        data: reports,
        isLoading,
        isError,
    } = useQuery<MyReportSummary[]>({
        queryKey: ["myReports"],
        queryFn: async () => {
            const response = await getMyReports();
            return response.data;
        },
    });

    const [selectedReport, setSelectedReport] = useState<MyReportSummary | null>(null);
    const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);

    const handleViewResult = (report: MyReportSummary) => {
        setSelectedReport(report);
        setIsResultDialogOpen(true);
    };

    return (
        <div className="w-full h-full p-5">
            <div className="flex flex-col gap-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t("nav.myReports")}</h2>
                    <p className="text-muted-foreground">{t("admin.reportsPageDescription")}</p>
                </div>

                <TooltipProvider>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("admin.userReportsColumns.date")}</TableHead>
                                    <TableHead>{t("admin.userReportsColumns.entityType")}</TableHead>
                                    <TableHead>{t("admin.userReportsColumns.reason")}</TableHead>
                                    <TableHead className="text-right">{t("admin.userReportsColumns.status")}</TableHead>
                                    <TableHead className="text-right">{t("admin.userReportsColumns.action")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            {t("admin.reportsPageLoading")}
                                        </TableCell>
                                    </TableRow>
                                ) : isError ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-destructive">
                                            {t("admin.reportsPageError")}
                                        </TableCell>
                                    </TableRow>
                                ) : !reports || reports.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            {t("admin.userReportsEmpty")}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    reports.map((report) => (
                                        <TableRow key={report.id}>
                                            <TableCell>
                                                {format(new Date(report.createdAt), "dd MMM yyyy", {
                                                    locale: dateLocale,
                                                })}
                                            </TableCell>
                                            <TableCell className="font-medium">{getEntityTypeLabel(t, report.entityType)}</TableCell>

                                            <TableCell className="max-w-sm truncate">
                                                <Tooltip delayDuration={0}>
                                                    <TooltipTrigger className="cursor-default">{report.reason}</TooltipTrigger>
                                                    <TooltipContent className="max-w-md">
                                                        <p>{report.reason}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TableCell>

                                            <TableCell className="text-right">
                                                <Badge variant={getReportStatusVariant(report.status)}>{getReportStatusLabel(t, report.status)}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {report.status === ReportStatus.Open ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title={t("report.status.open")}>
                                                        <Clock className="h-3.5 w-3.5" /> {t("report.status.open")}
                                                    </span>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 text-xs cursor-pointer hover:text-primary"
                                                        onClick={() => handleViewResult(report)}
                                                    >
                                                        <MessageSquareText className="mr-1.5 h-3.5 w-3.5" />
                                                        {t("admin.userReportsViewReport")}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TooltipProvider>
                <ReportResultDialog isOpen={isResultDialogOpen} onOpenChange={setIsResultDialogOpen} report={selectedReport} />
            </div>
        </div>
    );
}
