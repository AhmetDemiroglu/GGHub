"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader, UserX } from "lucide-react";
import { toast } from "sonner";
import { getDeletedAccountResidue, purgeDeletedAccounts } from "@/api/admin/admin.api";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@core/components/ui/alert-dialog";
import { Button } from "@core/components/ui/button";
import { useI18n } from "@/core/contexts/locale-context";

/**
 * Silinmis hesaplardan kalan icerik (inceleme, yorum, liste, gonderi, liderlik satiri).
 * Yeni silinen hesaplar bunu kendiliginden temizler; kart yalniz eski kayitlar ya da basarisiz
 * bir temizlik varsa gorunur. Silme geri alinamaz, bu yuzden onay penceresi var.
 */
export function DeletedAccountPurgeCard() {
    const t = useI18n();
    const queryClient = useQueryClient();
    const [open, setOpen] = React.useState(false);

    const { data } = useQuery({
        queryKey: ["adminDeletedResidue"],
        queryFn: async () => (await getDeletedAccountResidue()).data,
    });

    const purge = useMutation({
        mutationFn: async () => (await purgeDeletedAccounts()).data,
        onSuccess: (result) => {
            toast.success(t("admin.deletedPurge.done").replace("{count}", result.purgedAccounts.toLocaleString()));
            queryClient.setQueryData(["adminDeletedResidue"], result.residue);
            queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
            setOpen(false);
        },
        onError: () => toast.error(t("admin.deletedPurge.failed")),
    });

    if (!data || data.accounts === 0) return null;

    const parts = [
        [t("admin.deletedPurge.reviews"), data.reviews],
        [t("admin.deletedPurge.comments"), data.comments],
        [t("admin.deletedPurge.lists"), data.lists],
        [t("admin.deletedPurge.posts"), data.posts],
        [t("admin.deletedPurge.likes"), data.likes],
        [t("admin.deletedPurge.follows"), data.follows],
        [t("admin.deletedPurge.ranking"), data.rankingEntries],
    ] as const;
    const summary = parts
        .filter(([, count]) => count > 0)
        .map(([label, count]) => `${count.toLocaleString()} ${label}`)
        .join(", ");

    return (
        <div className="flex flex-col gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
                <UserX className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                    <p className="text-sm font-medium">
                        {t("admin.deletedPurge.title").replace("{count}", data.accounts.toLocaleString())}
                    </p>
                    <p className="text-xs text-muted-foreground">{summary}</p>
                </div>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setOpen(true)} className="cursor-pointer">
                {t("admin.deletedPurge.action")}
            </Button>

            <AlertDialog open={open} onOpenChange={(next) => !purge.isPending && setOpen(next)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("admin.deletedPurge.confirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("admin.deletedPurge.confirmDescription").replace("{summary}", summary)}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={purge.isPending} className="cursor-pointer">
                            {t("admin.deletedPurge.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault();
                                purge.mutate();
                            }}
                            disabled={purge.isPending}
                            className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {purge.isPending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {t("admin.deletedPurge.confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
