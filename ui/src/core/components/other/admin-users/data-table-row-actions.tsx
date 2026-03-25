"use client";

import * as React from "react";
import { Row } from "@tanstack/react-table";
import { Menu, Eye, Ban, CheckCircle } from "lucide-react";
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
import { useI18n } from "@/core/contexts/locale-context";

interface DataTableRowActionsProps<TData> {
    row: Row<TData>;
}

type BanMutationVariables = {
    userId: number;
    data: BanUserRequest;
};

type UnbanMutationVariables = number;

export function DataTableRowActions<TData>({ row }: DataTableRowActionsProps<TData>) {
    const t = useI18n();
    const user = row.original as AdminUserSummary;

    const [isBanAlertOpen, setIsBanAlertOpen] = React.useState(false);
    const [isUnbanAlertOpen, setIsUnbanAlertOpen] = React.useState(false);

    const invalidateUsersQuery = () => {
        queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    };

    const { mutate: banUserMutate, isPending: isBanning } = useMutation({
        mutationFn: (variables: BanMutationVariables) => banUser(variables.userId, variables.data),
        onSuccess: () => {
            toast.success(t("admin.userActions.bannedToast", { username: user.username }));
            invalidateUsersQuery();
        },
    });

    const { mutate: unbanUserMutate, isPending: isUnbanning } = useMutation({
        mutationFn: (userId: UnbanMutationVariables) => unbanUser(userId),
        onSuccess: () => {
            toast.success(t("admin.userActions.unbannedToast", { username: user.username }));
            invalidateUsersQuery();
        },
    });

    const confirmBan = () => {
        banUserMutate({
            userId: user.id,
            data: { reason: t("admin.userActions.banReason") },
        });
    };

    const confirmUnban = () => {
        unbanUserMutate(user.id);
    };

    const isPending = isBanning || isUnbanning;

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-2 p-0 cursor-pointer" disabled={isPending}>
                        <Menu className="h-4 w-2" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{t("admin.userActions.actions")}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href={`/users/${user.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            {t("admin.userActions.viewDetails")}
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />

                    {user.isBanned ? (
                        <DropdownMenuItem onClick={() => setIsUnbanAlertOpen(true)} disabled={isPending}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            {t("admin.userActions.unbanUser")}
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem onClick={() => setIsBanAlertOpen(true)} disabled={isPending} variant="destructive">
                            <Ban className="mr-2 h-4 w-4" />
                            {t("admin.userActions.banUser")}
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={isBanAlertOpen} onOpenChange={setIsBanAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("admin.userActions.confirmBanTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("admin.userActions.confirmBanDescription", { username: user.username })}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("admin.userActions.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmBan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t("admin.userActions.confirmBan")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isUnbanAlertOpen} onOpenChange={setIsUnbanAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("admin.userActions.confirmUnbanTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("admin.userActions.confirmUnbanDescription", { username: user.username })}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("admin.userActions.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmUnban}>{t("admin.userActions.confirmUnban")}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
