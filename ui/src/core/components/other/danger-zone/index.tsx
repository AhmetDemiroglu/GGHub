"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { exportMyData, deleteMyAccount } from "@/api/profile/profile.api";
import { useAuth } from "@core/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Download, Trash2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/core/components/ui/collapsible";
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
import { buildLocalizedPathname } from "@/i18n/config";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";

export function DangerZone() {
    const t = useI18n();
    const locale = useCurrentLocale();
    const [isOpen, setIsOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const { logout } = useAuth();
    const router = useRouter();

    const { mutate: exportData, isPending: isExporting } = useMutation({
        mutationFn: exportMyData,
        onSuccess: (response) => {
            const url = window.URL.createObjectURL(new Blob([response.data]));

            const link = document.createElement("a");
            link.href = url;

            const contentDisposition = response.headers["content-disposition"];
            let fileName = t("profile.dangerZone.exportFileName");
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
                if (fileNameMatch && fileNameMatch.length > 1) {
                    fileName = fileNameMatch[1];
                }
            }
            link.setAttribute("download", fileName);

            document.body.appendChild(link);
            link.click();

            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success(t("profile.dangerZone.exportSuccess"));
        },
        onError: (error) => {
            toast.error(t("profile.dangerZone.exportError"), {
                description: error.message,
            });
        },
    });

    const { mutate: deleteAccount, isPending: isDeleting } = useMutation({
        mutationFn: deleteMyAccount,
        onSuccess: () => {
            toast.success(t("profile.dangerZone.deleteSuccess"));
            logout();
            router.push(buildLocalizedPathname("/", locale));
        },
        onError: (error) => {
            toast.error(t("profile.dangerZone.deleteError"), {
                description: error.message,
            });
        },
    });

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <Card className="border-destructive">
                <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer p-4 md:p-6">
                        <div className="flex items-start md:items-center justify-between gap-3">
                            <div className="text-left flex-1 min-w-0">
                                <CardTitle className="text-base md:text-lg text-destructive">{t("profile.dangerZone.title")}</CardTitle>
                                <CardDescription className="text-xs md:text-sm mt-1">{t("profile.dangerZone.description")}</CardDescription>
                            </div>
                            {isOpen ? <ChevronUp className="h-5 w-5 text-destructive flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-destructive flex-shrink-0" />}
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="space-y-4 p-4 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 rounded-lg border border-dashed border-destructive p-3 md:p-4">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm md:text-base">{t("profile.dangerZone.exportTitle")}</h3>
                                <p className="text-xs md:text-sm text-muted-foreground mt-1">{t("profile.dangerZone.exportDescription")}</p>
                            </div>
                            <Button className="cursor-pointer w-full md:w-auto" variant="outline" onClick={() => exportData()} disabled={isExporting}>
                                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                {isExporting ? t("profile.dangerZone.exporting") : t("profile.dangerZone.exportButton")}
                            </Button>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 rounded-lg border border-dashed border-destructive p-3 md:p-4">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm md:text-base">{t("profile.dangerZone.deleteTitle")}</h3>
                                <p className="text-xs md:text-sm text-muted-foreground mt-1">{t("profile.dangerZone.deleteDescription")}</p>
                            </div>
                            <Button className="cursor-pointer w-full md:w-auto" variant="destructive" onClick={() => setIsAlertOpen(true)} disabled={isDeleting}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t("profile.dangerZone.deleteButton")}
                            </Button>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Card>
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("profile.dangerZone.confirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("profile.dangerZone.confirmDescription")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">{t("profile.dangerZone.cancelButton")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteAccount()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer">
                            {t("profile.dangerZone.confirmDelete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Collapsible>
    );
}
