"use client";

import type { AdminReport } from "@/models/admin/admin.model";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/core/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@core/components/ui/table";
import { Badge } from "@/core/components/ui/badge";
import Link from "next/link";
import { Button } from "@core/components/ui/button";
import { translateReportStatus, getReportStatusVariant } from "@/core/lib/report.utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";

interface RecentReportsProps {
    reports: AdminReport[];
}

export const RecentReports = ({ reports }: RecentReportsProps) => {
    const locale = useCurrentLocale();
    const t = useI18n();

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{t("admin.recentReportsTitle")}</CardTitle>
                    <CardDescription>{t("admin.recentReportsDescription")}</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                    <Link href={buildLocalizedPathname("/reports", locale)}>{t("admin.viewAll")}</Link>
                </Button>
            </CardHeader>
            <CardContent className="flex-1">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("admin.tableUser")}</TableHead>
                            <TableHead>{t("admin.tableReason")}</TableHead>
                            <TableHead className="text-right">{t("admin.tableStatus")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reports.length > 0 ? (
                            reports.map((report) => (
                                <TableRow key={report.reportId}>
                                    <TableCell>
                                        <div className="font-medium">{report.reporterUsername}</div>
                                        <div className="text-xs text-muted-foreground">ID: {report.reporterId}</div>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate">
                                        <Tooltip delayDuration={0}>
                                            <TooltipTrigger className="cursor-default">{report.reason}</TooltipTrigger>
                                            <TooltipContent className="max-w-md">
                                                <p>{report.reason}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={getReportStatusVariant(report.status)}>{translateReportStatus(report.status)}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center">
                                    {t("admin.noPendingReports")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};
