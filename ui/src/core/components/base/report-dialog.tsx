"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/core/components/ui/alert-dialog";
import { Textarea } from "@/core/components/ui/textarea";
import { Label } from "@/core/components/ui/label";
import { Button } from "@/core/components/ui/button";

import { reportComment, reportList, reportReview, reportUser } from "@/api/report/report.api";
import type { ReportForCreation } from "@/models/report/report.model";
import { useI18n } from "@/core/contexts/locale-context";

export type ReportableEntityType = "Review" | "User" | "List" | "Comment";

interface ReportDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    entityType: ReportableEntityType;
    entityId: number;
}

export const ReportDialog = ({ isOpen, onOpenChange, entityType, entityId }: ReportDialogProps) => {
    const t = useI18n();
    const [reason, setReason] = React.useState("");
    const getReportMutationFn = () => {
        switch (entityType) {
            case "Review":
                return (data: ReportForCreation) => reportReview(entityId, data);
            case "User":
                return (data: ReportForCreation) => reportUser(entityId, data);
            case "List":
                return (data: ReportForCreation) => reportList(entityId, data);
            case "Comment":
                return (data: ReportForCreation) => reportComment(entityId, data);
            default:
                throw new Error(t("report.dialog.invalidType"));
        }
    };

    const { mutate: reportMutate, isPending } = useMutation({
        mutationFn: getReportMutationFn(),
        onSuccess: () => {
            toast.success(t("report.dialog.success"));
            setReason("");
            onOpenChange(false);
        },
    });
    const handleSubmit = () => {
        if (reason.length < 10) {
            toast.error(t("report.dialog.minReasonError"));
            return;
        }
        reportMutate({ reason });
    };
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setReason("");
        }
        onOpenChange(open);
    };
    const titleKey =
        entityType === "User"
            ? "report.dialog.title.user"
            : entityType === "List"
              ? "report.dialog.title.list"
              : entityType === "Comment"
                ? "report.dialog.title.comment"
                : "report.dialog.title.review";

    return (
        <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t(titleKey)}</AlertDialogTitle>
                    <AlertDialogDescription>{t("report.dialog.description")}</AlertDialogDescription>
                </AlertDialogHeader>

                <div className="grid w-full gap-1.5 py-2">
                    <Label htmlFor="reason">
                        {t("report.dialog.reasonLabel")} <span className="text-muted-foreground">{t("report.dialog.reasonLabelSuffix")}</span>
                    </Label>
                    <Textarea
                        id="reason"
                        placeholder={t("report.dialog.reasonPlaceholder")}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={isPending}
                        className="min-h-[100px] mt-2"
                    />
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>{t("common.cancel")}</AlertDialogCancel>
                    <Button onClick={handleSubmit} disabled={isPending || reason.length < 10} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer">
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("common.submit")}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
