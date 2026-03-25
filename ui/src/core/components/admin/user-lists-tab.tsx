"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdminUserListSummary } from "@/models/admin/admin.model";
import { ListVisibilitySetting } from "@/models/list/list.model";
import { getListsForUser } from "@/api/admin/admin.api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table";
import { Badge } from "@/core/components/ui/badge";
import { Eye, Users, Lock, Star, ExternalLink, HatGlasses } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/core/contexts/locale-context";

const getVisibilityIcon = (visibility: ListVisibilitySetting) => {
    switch (visibility) {
        case ListVisibilitySetting.Public:
            return <Eye className="h-3.5 w-3.5" />;
        case ListVisibilitySetting.Followers:
            return <Users className="h-3.5 w-3.5" />;
        case ListVisibilitySetting.Private:
            return <Lock className="h-3.5 w-3.5" />;
        default:
            return null;
    }
};

const getVisibilityLabel = (t: ReturnType<typeof useI18n>, visibility: ListVisibilitySetting) => {
    switch (visibility) {
        case ListVisibilitySetting.Public:
            return t("admin.userListsVisibility.public");
        case ListVisibilitySetting.Followers:
            return t("admin.userListsVisibility.followers");
        case ListVisibilitySetting.Private:
            return t("admin.userListsVisibility.private");
        default:
            return String(visibility);
    }
};

interface UserListsTabProps {
    userId: number;
}

export const UserListsTab = ({ userId }: UserListsTabProps) => {
    const t = useI18n();

    const {
        data: lists,
        isLoading,
        isError,
    } = useQuery<AdminUserListSummary[]>({
        queryKey: ["adminUserLists", userId],
        queryFn: async () => (await getListsForUser(userId)).data,
        enabled: !!userId,
    });

    if (isLoading) {
        return <p className="text-center text-muted-foreground">{t("admin.userListsLoading")}</p>;
    }

    if (isError) {
        return <p className="text-destructive">{t("admin.userListsError")}</p>;
    }

    if (!lists || lists.length === 0) {
        return <p className="text-center text-muted-foreground">{t("admin.userListsEmpty")}</p>;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("admin.userListsColumns.listName")}</TableHead>
                        <TableHead>{t("admin.userListsColumns.visibility")}</TableHead>
                        <TableHead>{t("admin.userListsColumns.rating")}</TableHead>
                        <TableHead>{t("admin.userListsColumns.followers")}</TableHead>
                        <TableHead>{t("admin.userListsColumns.gameCount")}</TableHead>
                        <TableHead className="text-right">{t("admin.userListsColumns.action")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {lists.map((list) => (
                        <TableRow key={list.id}>
                            <TableCell className="font-medium">{list.name}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className="flex w-fit items-center gap-1.5">
                                    {getVisibilityIcon(list.visibility)}
                                    {getVisibilityLabel(t, list.visibility)}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1 text-amber-500">
                                    <Star className="h-4 w-4" />
                                    {list.averageRating.toFixed(1)}
                                </div>
                            </TableCell>
                            <TableCell>{list.followerCount}</TableCell>
                            <TableCell>{list.gameCount}</TableCell>
                            <TableCell className="text-right">
                                {list.visibility === ListVisibilitySetting.Public ? (
                                    <Link href={`/lists/${list.id}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        {t("admin.userListsViewList")}
                                    </Link>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground italic">
                                        <HatGlasses className="h-3.5 w-3.5" />
                                        {t("admin.userListsHiddenContent")}
                                    </span>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};
