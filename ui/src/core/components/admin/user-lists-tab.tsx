"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdminUserListSummary } from "@/models/admin/admin.model";
import { ListVisibilitySetting } from "@/models/list/list.model";
import { getListsForUser } from "@/api/admin/admin.api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table";
import { Badge } from "@/core/components/ui/badge";
import { Eye, Users, Lock, Star, ExternalLink, HatGlasses } from "lucide-react";
import Link from "next/link";

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

interface UserListsTabProps {
    userId: number;
}

export const UserListsTab = ({ userId }: UserListsTabProps) => {
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
        return <p className="text-center text-muted-foreground">Kullanıcının listeleri yükleniyor...</p>;
    }

    if (isError) {
        return <p className="text-destructive">Listeler yüklenirken bir hata oluştu.</p>;
    }

    if (!lists || lists.length === 0) {
        return <p className="text-center text-muted-foreground">Bu kullanıcının oluşturduğu herhangi bir liste bulunmamaktadır.</p>;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Liste Adı</TableHead>
                        <TableHead>Görünürlük</TableHead>
                        <TableHead>Puan</TableHead>
                        <TableHead>Takipçi</TableHead>
                        <TableHead>Oyun Sayısı</TableHead>
                        <TableHead className="text-right">Eylem</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {lists.map((list) => (
                        <TableRow key={list.id}>
                            <TableCell className="font-medium">{list.name}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className="flex w-fit items-center gap-1.5">
                                    {getVisibilityIcon(list.visibility)}
                                    {ListVisibilitySetting[list.visibility]}
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
                                        Listeyi Gör
                                    </Link>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground italic">
                                        <HatGlasses className="h-3.5 w-3.5" />
                                        Gizli İçerik
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
