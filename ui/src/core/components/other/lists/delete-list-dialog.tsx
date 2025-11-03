"use client";

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
import { Loader, Trash2 } from "lucide-react";

interface DeleteListDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isPending: boolean;
    listName?: string;
}

export function DeleteListDialog({ isOpen, onClose, onConfirm, isPending, listName }: DeleteListDialogProps) {
    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Listeyi Silmek İstediğine Emin Misin?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {listName ? (
                            <>
                                <span className="font-semibold">{listName}</span> adlı listeyi kalıcı olarak sileceksin.
                            </>
                        ) : (
                            "Bu listeyi kalıcı olarak sileceksin."
                        )}
                        Bu işlem geri alınamaz.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onClose} disabled={isPending} className="cursor-pointer">
                        İptal
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} disabled={isPending} className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {isPending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Sil
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
