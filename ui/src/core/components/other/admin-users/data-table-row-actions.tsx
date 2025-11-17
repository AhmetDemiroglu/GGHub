"use client";

import * as React from "react";
import { Row } from "@tanstack/react-table";
import { Menu, Eye, Ban, CheckCircle, UserX } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/core/components/ui/dropdown-menu";
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
import { Button } from "@/core/components/ui/button";
import type { AdminUserSummary, BanUserRequest } from "@/models/admin/admin.model";
import { banUser, unbanUser } from "@/api/admin/admin.api";
import { queryClient } from "@core/components/base/providers";

interface DataTableRowActionsProps<TData> {
    row: Row<TData>;
}
type BanMutationVariables = {
    userId: number;
    data: BanUserRequest;
};
type UnbanMutationVariables = number;

export function DataTableRowActions<TData>({ row }: DataTableRowActionsProps<TData>) {
    const user = row.original as AdminUserSummary;

    const [isBanAlertOpen, setIsBanAlertOpen] = React.useState(false);
    const [isUnbanAlertOpen, setIsUnbanAlertOpen] = React.useState(false);

    const invalidateUsersQuery = () => {
        queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    };

    const { mutate: banUserMutate, isPending: isBanning } = useMutation({
        mutationFn: (variables: BanMutationVariables) => banUser(variables.userId, variables.data),
        onSuccess: () => {
            toast.success(`Kullanıcı (${user.username}) askıya alındı.`);
            invalidateUsersQuery();
        },
    });

    const { mutate: unbanUserMutate, isPending: isUnbanning } = useMutation({
        mutationFn: (userId: UnbanMutationVariables) => unbanUser(userId),
        onSuccess: () => {
            toast.success(`Kullanıcı (${user.username}) aktifleştirildi.`);
            invalidateUsersQuery();
        },
    });
    const confirmBan = () => {
        banUserMutate({
            userId: user.id,
            data: { reason: "Admin tarafından banlandı." },
        });
    };

    const confirmUnban = () => {
        unbanUserMutate(user.id);
    };

    const isPending = isBanning || isUnbanning;

    return (
        <>
            {/* 1. Eylemler Menüsü */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-2 p-0 cursor-pointer" disabled={isPending}>
                        <Menu className="h-4 w-2" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Eylemler</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href={`/users/${user.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Detayları Görüntüle
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />

                    {user.isBanned ? (
                        <DropdownMenuItem onClick={() => setIsUnbanAlertOpen(true)} disabled={isPending}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Banı Kaldır
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem onClick={() => setIsBanAlertOpen(true)} disabled={isPending} variant="destructive">
                            <Ban className="mr-2 h-4 w-4" />
                            Kullanıcıyı Banla
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* 2. YENİ: Banlama Onay Diyalogu */}
            <AlertDialog open={isBanAlertOpen} onOpenChange={setIsBanAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>Bu işlem, '{user.username}' kullanıcısını askıya alacak ve platforma girişini engelleyecektir. Devam etmek istiyor musunuz?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmBan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Evet, Askıya Al
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 3. YENİ: Ban Kaldırma Onay Diyalogu */}
            <AlertDialog open={isUnbanAlertOpen} onOpenChange={setIsUnbanAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>Bu işlem, '{user.username}' kullanıcısının hesabını aktifleştirecek ve platforma giriş yapmasına izin verecektir.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmUnban}>Evet, Aktifleştir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
