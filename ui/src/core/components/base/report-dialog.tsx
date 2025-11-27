"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
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

export type ReportableEntityType = "Review" | "User" | "List" | "Comment";

interface ReportDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    entityType: ReportableEntityType;
    entityId: number;
}

export const ReportDialog = ({ isOpen, onOpenChange, entityType, entityId }: ReportDialogProps) => {
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
                throw new Error("Geçersiz rapor türü");
        }
    };

    const { mutate: reportMutate, isPending } = useMutation({
        mutationFn: getReportMutationFn(),
        onSuccess: () => {
            toast.success("Raporunuz başarıyla gönderildi.");
            setReason("");
            onOpenChange(false);
        },
    });
    const handleSubmit = () => {
        if (reason.length < 10) {
            toast.error("Lütfen en az 10 karakterlik bir sebep girin.");
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
    const title = entityType === "User" ? "Kullanıcıyı Raporla" : entityType === "List" ? "Listeyi Raporla" : entityType === "Comment" ? "Yorumu Raporla" : "İncelemeyi Raporla";

    return (
        <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>Lütfen bu içeriği neden rapor ettiğinizi açıklayın. Uygunsuz davranışlar ve içerikler moderatörlerimiz tarafından incelenecektir.</AlertDialogDescription>
                </AlertDialogHeader>

                <div className="grid w-full gap-1.5 py-2">
                    <Label htmlFor="reason">Rapor Nedeni (En az 10 karakter)</Label>
                    <Textarea
                        id="reason"
                        placeholder="Bu içeriğin platform kurallarını ihlal ettiğini düşünüyorum çünkü..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={isPending}
                        className="min-h-[100px] mt-2"
                    />
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>İptal</AlertDialogCancel>
                    <Button onClick={handleSubmit} disabled={isPending || reason.length < 10} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer">
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Gönder
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
