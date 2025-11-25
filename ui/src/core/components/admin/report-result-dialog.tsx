"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/core/components/ui/dialog";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import { CheckCircle2, XCircle, Clock, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { translateReportStatus, getReportStatusVariant } from "@/core/lib/report.utils";
import type { MyReportSummary } from "@/models/report/report.model";
import { ReportStatus } from "@/models/report/report.model";

interface ReportResultDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    report: MyReportSummary | null;
}

export const ReportResultDialog = ({
    isOpen,
    onOpenChange,
    report,
}: ReportResultDialogProps) => {
    if (!report) return null;

    const isResolved = report.status === ReportStatus.Resolved;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <DialogTitle>Rapor Sonucu</DialogTitle>
                        <Badge variant={getReportStatusVariant(report.status)}>
                            {translateReportStatus(report.status)}
                        </Badge>
                    </div>
                    <DialogDescription>
                        Raporunuz incelendi ve {format(new Date(report.resolvedAt || new Date()), "d MMMM yyyy", { locale: tr })} tarihinde sonuçlandırıldı.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    {/* Kullanıcının Raporu */}
                    <div className="space-y-1.5">
                        <h4 className="text-xs font-medium text-muted-foreground">Sizin Raporunuz:</h4>
                        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md border border-border/50 italic">
                            "{report.reason}"
                        </div>
                    </div>

                    <Separator />

                    {/* Admin Cevabı */}
                    <div className="space-y-1.5">
                        <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            Yönetici Yanıtı:
                        </h4>
                        <div className={`text-sm p-3 rounded-md border ${isResolved
                            ? "bg-green-500/10 border-green-500/20 text-foreground"
                            : "bg-destructive/10 border-destructive/20 text-foreground"
                            }`}>
                            {report.adminResponse || "Herhangi bir açıklama yapılmadan kapatıldı."}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto cursor-pointer">
                        Kapat
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};