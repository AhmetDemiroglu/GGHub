"use client";

import type { AdminReport } from "@/models/admin/admin.model";
import { ReportStatus } from "@/models/report/report.model";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/core/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@core/components/ui/table";
import { Badge } from "@/core/components/ui/badge";
import Link from "next/link";
import { Button } from "@core/components/ui/button";
import { translateReportStatus, getReportStatusVariant } from "@/core/lib/report.utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip";

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

interface RecentReportsProps {
    reports: AdminReport[];
}

export const RecentReports = ({ reports }: RecentReportsProps) => {
    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Bekleyen Raporlar</CardTitle>
                    <CardDescription>Onay bekleyen son 5 rapor.</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                    <Link href="/reports">Tümünü Gör</Link>
                </Button>
            </CardHeader>
            <CardContent className="flex-1">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Kullanıcı</TableHead>
                            <TableHead>Sebep</TableHead>
                            <TableHead className="text-right">Durum</TableHead>
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
                                    Bekleyen rapor bulunmamaktadır.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};
