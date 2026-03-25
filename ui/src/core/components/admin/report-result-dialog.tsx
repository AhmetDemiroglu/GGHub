"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/core/components/ui/dialog";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import { MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { enUS, tr } from "date-fns/locale";
import { getReportStatusVariant } from "@/core/lib/report.utils";
import type { MyReportSummary } from "@/models/report/report.model";
import { ReportStatus } from "@/models/report/report.model";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";

interface ReportResultDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    report: MyReportSummary | null;
}

export const ReportResultDialog = ({ isOpen, onOpenChange, report }: ReportResultDialogProps) => {
    const t = useI18n();
    const locale = useCurrentLocale();

    if (!report) return null;

    const isResolved = report.status === ReportStatus.Resolved;
    const dateLocale = locale === "tr" ? tr : enUS;
    const reportStatusLabel =
        report.status === ReportStatus.Open
            ? t("report.status.open")
            : report.status === ReportStatus.Resolved
              ? t("report.status.resolved")
              : report.status === ReportStatus.Ignored
                ? t("report.status.ignored")
                : t("report.status.unknown");

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <DialogTitle>{t("report.result.title")}</DialogTitle>
                        <Badge variant={getReportStatusVariant(report.status)}>{reportStatusLabel}</Badge>
                    </div>
                    <DialogDescription>
                        {t("report.result.description", {
                            date: format(new Date(report.resolvedAt || new Date()), "d MMMM yyyy", { locale: dateLocale }),
                        })}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    <div className="space-y-1.5">
                        <h4 className="text-xs font-medium text-muted-foreground">{t("report.result.yourReport")}:</h4>
                        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md border border-border/50 italic">"{report.reason}"</div>
                    </div>

                    <Separator />

                    <div className="space-y-1.5">
                        <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {t("report.result.adminResponse")}:
                        </h4>
                        <div
                            className={`text-sm p-3 rounded-md border ${
                                isResolved
                                    ? "bg-green-500/10 border-green-500/20 text-foreground"
                                    : "bg-destructive/10 border-destructive/20 text-foreground"
                            }`}
                        >
                            {report.adminResponse || t("report.result.closedWithoutResponse")}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto cursor-pointer">
                        {t("report.result.close")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
