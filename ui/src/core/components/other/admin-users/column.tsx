"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { AdminUserSummary } from "@/models/admin/admin.model";
import { Avatar, AvatarImage, AvatarFallback } from "@/core/components/ui/avatar";
import { getImageUrl } from "@/core/lib/get-image-url";
import { Badge } from "@/core/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import { DataTableRowActions } from "./data-table-row-actions";

export const columns: ColumnDef<AdminUserSummary>[] = [
    // 1: Eylemler
    {
        id: "actions",
        cell: ({ row }) => {
            return <DataTableRowActions row={row} />;
        },
    },
    // 2: Kullanıcı (Avatar + İsim + E-posta)
    {
        accessorKey: "username",
        header: "Kullanıcı",
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

    // 3: Rol (Admin/User)
    {
        accessorKey: "role",
        header: "Rol",
        cell: ({ row }) => {
            const role = row.original.role;
            return <Badge variant={role === "Admin" ? "default" : "secondary"}>{role}</Badge>;
        },
    },

    // 4: Durum (Banlı/Aktif)
    {
        accessorKey: "isBanned",
        header: "Durum",
        cell: ({ row }) => {
            const isBanned = row.original.isBanned;
            return isBanned ? (
                <Badge variant="destructive" className="flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5" />
                    Askıda
                </Badge>
            ) : (
                <Badge variant="outline" className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Aktif
                </Badge>
            );
        },
    },

    // 5: Katılma Tarihi
    {
        accessorKey: "createdAt",
        header: "Katılma Tarihi",
        cell: ({ row }) => {
            return (
                <span>
                    {new Date(row.original.createdAt).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                    })}
                </span>
            );
        },
    },
];
