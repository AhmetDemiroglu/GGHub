"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdminPostSummary } from "@/models/admin/admin.model";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip";
import { Badge } from "@/core/components/ui/badge";
import { getPostsForUser } from "@/api/admin/admin.api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table";
import Link from "next/link";
import { format } from "date-fns";
import { enUS, tr } from "date-fns/locale";
import { BarChart3, ExternalLink, Heart, Image as ImageIcon, MessageCircle, Repeat2 } from "lucide-react";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";

interface UserPostsTabProps {
    userId: number;
}

export const UserPostsTab = ({ userId }: UserPostsTabProps) => {
    const t = useI18n();
    const locale = useCurrentLocale();
    const dateLocale = locale === "tr" ? tr : enUS;

    const {
        data: posts,
        isLoading,
        isError,
    } = useQuery<AdminPostSummary[]>({
        queryKey: ["adminUserPosts", userId],
        queryFn: async () => (await getPostsForUser(userId)).data,
        enabled: !!userId,
    });

    if (isLoading) {
        return <p className="text-center text-muted-foreground">{t("admin.userPostsLoading")}</p>;
    }

    if (isError) {
        return <p className="text-destructive">{t("admin.userPostsError")}</p>;
    }

    if (!posts || posts.length === 0) {
        return <p className="text-center text-muted-foreground">{t("admin.userPostsEmpty")}</p>;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("admin.userPostsColumns.content")}</TableHead>
                        <TableHead>{t("admin.userPostsColumns.type")}</TableHead>
                        <TableHead>{t("admin.userPostsColumns.engagement")}</TableHead>
                        <TableHead>{t("admin.userPostsColumns.date")}</TableHead>
                        <TableHead className="text-right">{t("admin.userPostsColumns.action")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {posts.map((post) => (
                        <TableRow key={post.id}>
                            <TableCell className="max-w-sm truncate">
                                {post.contentPreview ? (
                                    <Tooltip delayDuration={0}>
                                        <TooltipTrigger className="cursor-default text-left">{post.contentPreview}</TooltipTrigger>
                                        <TooltipContent className="max-w-md">
                                            <p className="whitespace-pre-wrap">{post.fullContent}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                ) : (
                                    <span className="text-xs text-muted-foreground italic">{t("admin.userPostsNoText")}</span>
                                )}
                            </TableCell>

                            <TableCell>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {post.repostOfPostId !== null ? (
                                        <Badge variant="secondary" className="gap-1">
                                            <Repeat2 className="h-3 w-3" />
                                            {t("admin.userPostsType.repost")}
                                        </Badge>
                                    ) : post.parentPostId !== null ? (
                                        <Badge variant="secondary" className="gap-1">
                                            <MessageCircle className="h-3 w-3" />
                                            {t("admin.userPostsType.reply")}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline">{t("admin.userPostsType.post")}</Badge>
                                    )}

                                    {post.imageCount > 0 && (
                                        <Badge variant="outline" className="gap-1">
                                            <ImageIcon className="h-3 w-3" />
                                            {post.imageCount}
                                        </Badge>
                                    )}
                                    {post.hasPoll && (
                                        <Badge variant="outline" className="gap-1">
                                            <BarChart3 className="h-3 w-3" />
                                            {t("admin.userPostsType.poll")}
                                        </Badge>
                                    )}
                                </div>
                            </TableCell>

                            <TableCell>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1">
                                        <Heart className="h-3.5 w-3.5" />
                                        {post.likeCount}
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <MessageCircle className="h-3.5 w-3.5" />
                                        {post.replyCount}
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <Repeat2 className="h-3.5 w-3.5" />
                                        {post.repostCount}
                                    </span>
                                </div>
                            </TableCell>

                            <TableCell>
                                {format(new Date(post.createdAt), "dd MMM yyyy", {
                                    locale: dateLocale,
                                })}
                            </TableCell>

                            <TableCell className="text-right">
                                <Link
                                    href={`/posts/${post.id}`}
                                    target="_blank"
                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline cursor-pointer"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    {t("admin.userPostsViewPost")}
                                </Link>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};
