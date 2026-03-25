"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { AdminUserSummary } from "@/models/admin/admin.model";
import { Avatar, AvatarImage, AvatarFallback } from "@/core/components/ui/avatar";
import { getImageUrl } from "@/core/lib/get-image-url";
import { Badge } from "@/core/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import { DataTableRowActions } from "./data-table-row-actions";
import { format } from "date-fns";
import type { Locale } from "date-fns";

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

export const createUserColumns = (t: TranslateFn, dateLocale: Locale): ColumnDef<AdminUserSummary>[] => [
    {
        id: "actions",
        cell: ({ row }) => <DataTableRowActions row={row} />,
    },
    {
        accessorKey: "username",
        header: t("admin.columns.user"),
        cell: ({ row }) => {
            const user = row.original;
            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={getImageUrl(user.profileImageUrl)} alt={user.username} />
                        <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "role",
        header: t("admin.columns.role"),
        cell: ({ row }) => {
            const role = row.original.role;
            return <Badge variant={role === "Admin" ? "default" : "secondary"}>{role}</Badge>;
        },
    },
    {
        accessorKey: "isBanned",
        header: t("admin.columns.status"),
        cell: ({ row }) => {
            const isBanned = row.original.isBanned;
            return isBanned ? (
                <Badge variant="destructive" className="flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5" />
                    {t("admin.columns.banned")}
                </Badge>
            ) : (
                <Badge variant="outline" className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t("admin.columns.active")}
                </Badge>
            );
        },
    },
    {
        accessorKey: "createdAt",
        header: t("admin.columns.joinDate"),
        cell: ({ row }) => <span>{format(new Date(row.original.createdAt), "d MMMM yyyy", { locale: dateLocale })}</span>,
    },
];
