"use client";

import { useQuery } from "@tanstack/react-query";
import type { MyReportSummary } from "@/models/report/report.model";
import { getMyReports } from "@/api/report/report.api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table";
import { Badge } from "@/core/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/core/components/ui/tooltip";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { translateReportStatus, getReportStatusVariant } from "@/core/lib/report.utils";

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

export default function MyReportsPage() {
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

    return (
        <div className="w-full h-full p-5">
            <div className="flex flex-col gap-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Raporlarım</h2>
                    <p className="text-muted-foreground">Oluşturduğunuz raporların durumunu buradan takip edebilirsiniz.</p>
                </div>

                <TooltipProvider>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tarih</TableHead>
                                    <TableHead>Raporlanan Tür</TableHead>
                                    <TableHead>Sebep (Önizleme)</TableHead>
                                    <TableHead className="text-right">Durum</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            Raporlar yükleniyor...
                                        </TableCell>
                                    </TableRow>
                                ) : isError ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-destructive">
                                            Raporlar yüklenirken bir hata oluştu.
                                        </TableCell>
                                    </TableRow>
                                ) : !reports || reports.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            Henüz oluşturulmuş bir raporunuz bulunmamaktadır.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    reports.map((report) => (
                                        <TableRow key={report.id}>
                                            <TableCell>
                                                {format(new Date(report.createdAt), "dd MMM yyyy", {
                                                    locale: tr,
                                                })}
                                            </TableCell>
                                            <TableCell className="font-medium">{translateEntityType(report.entityType)}</TableCell>

                                            <TableCell className="max-w-sm truncate">
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
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TooltipProvider>
            </div>
        </div>
    );
}
