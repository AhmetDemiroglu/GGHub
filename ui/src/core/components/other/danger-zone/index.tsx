"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { exportMyData, deleteMyAccount } from "@/api/profile/profile.api";
import { useAuth } from "@core/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Download, Trash2, ChevronDown, ChevronUp } from "lucide-react";
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

export function DangerZone() {
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
            let fileName = "gghub-verilerim.json";
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

            toast.success("Verilerin başarıyla indirildi.");
        },
        onError: (error) => {
            toast.error("Veriler indirilirken bir hata oluştu.", {
                description: error.message,
            });
        },
    });

    const { mutate: deleteAccount, isPending: isDeleting } = useMutation({
        mutationFn: deleteMyAccount,
        onSuccess: () => {
            toast.success("Hesabınız başarıyla silindi. Sizi özleyeceğiz!");
            logout();
            router.push("/");
        },
        onError: (error) => {
            toast.error("Hesap silinirken bir hata oluştu.", {
                description: error.message,
            });
        },
    });

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <Card className="border-destructive">
                <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer">
                        <div className="flex items-center justify-between">
                            <div className="text-left">
                                <CardTitle className="text-destructive">Tehlikeli Bölge</CardTitle>
                                <CardDescription>Bu alandaki işlemler geri alınamaz. Lütfen dikkatli olun.</CardDescription>
                            </div>
                            {isOpen ? <ChevronUp className="h-5 w-5 text-destructive" /> : <ChevronDown className="h-5 w-5 text-destructive" />}
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border border-dashed border-destructive p-4">
                            <div>
                                <h3 className="font-semibold">Verilerini Dışa Aktar</h3>
                                <p className="text-sm text-muted-foreground">Profil bilgilerin, listelerin ve yorumların dahil tüm verilerinin bir kopyasını indir.</p>
                            </div>
                            <Button className="cursor-pointer" variant="outline" onClick={() => exportData()} disabled={isExporting}>
                                {isExporting ? "İndiriliyor..." : <Download className="mr-2 h-4 w-4" />}
                                {isExporting ? "" : "İndir"}
                            </Button>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-dashed border-destructive p-4">
                            <div>
                                <h3 className="font-semibold">Hesabını Kalıcı Olarak Sil</h3>
                                <p className="text-sm text-muted-foreground">Bu işlem hesabını ve tüm verilerini anonimleştirir. Bu işlemin geri dönüşü yoktur.</p>
                            </div>
                            <Button className="cursor-pointer" variant="destructive" onClick={() => setIsAlertOpen(true)} disabled={isDeleting}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hesabımı Sil
                            </Button>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Card>
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu işlem kalıcıdır ve geri alınamaz. Hesabınız ve tüm verileriniz anonimleştirilecektir. Devam etmek istediğinizden emin misiniz?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteAccount()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer">
                            Evet, Hesabımı Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Collapsible>
    );
}
