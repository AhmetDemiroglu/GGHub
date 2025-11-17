"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdminCommentSummary } from "@/models/admin/admin.model";
import { ListVisibilitySetting } from "@/models/list/list.model";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/core/components/ui/tooltip";
import { getCommentsForUser } from "@/api/admin/admin.api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ExternalLink, HatGlasses } from "lucide-react";

interface UserCommentsTabProps {
    userId: number;
}

export const UserCommentsTab = ({ userId }: UserCommentsTabProps) => {
    const {
        data: comments,
        isLoading,
        isError,
    } = useQuery<AdminCommentSummary[]>({
        queryKey: ["adminUserComments", userId],
        queryFn: async () => (await getCommentsForUser(userId)).data,
        enabled: !!userId,
    });

    if (isLoading) {
        return <p className="text-center text-muted-foreground">Kullanıcının yorumları yükleniyor...</p>;
    }

    if (isError) {
        return <p className="text-destructive">Yorumlar yüklenirken bir hata oluştu.</p>;
    }

    if (!comments || comments.length === 0) {
        return <p className="text-center text-muted-foreground">Bu kullanıcının yaptığı herhangi bir yorum bulunmamaktadır.</p>;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Yorum</TableHead>
                        <TableHead>Yorum Yapılan Liste</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead className="text-right">Eylem</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {comments.map((comment) => (
                        <TableRow key={comment.id}>
                            <TableCell className="max-w-sm truncate">
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger className="cursor-default">{comment.contentPreview}</TooltipTrigger>
                                    <TooltipContent className="max-w-md">
                                        <p>{comment.fullContent}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TableCell>

                            <TableCell className="font-medium">{comment.listName}</TableCell>
                            <TableCell>
                                {format(new Date(comment.createdAt), "dd MMM yyyy", {
                                    locale: tr,
                                })}
                            </TableCell>
                            <TableCell className="text-right">
                                {comment.visibility === ListVisibilitySetting.Public ? (
                                    <Link
                                        href={`/lists/${comment.listId}`}
                                        target="_blank"
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline cursor-pointer"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Listeyi Gör
                                    </Link>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground italic">
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
