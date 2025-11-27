"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdminReviewSummary } from "@/models/admin/admin.model";
import { getReviewsForUser } from "@/api/admin/admin.api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table";
import { Badge } from "@/core/components/ui/badge";
import { Star, BowArrow } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface UserReviewsTabProps {
    userId: number;
}

export const UserReviewsTab = ({ userId }: UserReviewsTabProps) => {
    const {
        data: reviews,
        isLoading,
        isError,
    } = useQuery<AdminReviewSummary[]>({
        queryKey: ["adminUserReviews", userId],
        queryFn: async () => (await getReviewsForUser(userId)).data,
        enabled: !!userId,
    });

    if (isLoading) {
        return <p className="text-center text-muted-foreground">Kullanıcının incelemeleri yükleniyor...</p>;
    }

    if (isError) {
        return <p className="text-destructive">İncelemeler yüklenirken bir hata oluştu.</p>;
    }

    if (!reviews || reviews.length === 0) {
        return <p className="text-center text-muted-foreground">Bu kullanıcının yaptığı herhangi bir inceleme bulunmamaktadır.</p>;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Oyun</TableHead>
                        <TableHead>Puan</TableHead>
                        <TableHead>İnceleme (Önizleme)</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead className="text-right">Eylem</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reviews.map((review) => (
                        <TableRow key={review.id}>
                            <TableCell className="font-medium">{review.gameName}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className="flex w-fit items-center gap-1 text-amber-500">
                                    <Star className="h-4 w-4" />
                                    {review.rating}
                                </Badge>
                            </TableCell>
                            <TableCell className="max-w-sm truncate">{review.content}</TableCell>
                            <TableCell>
                                {format(new Date(review.createdAt), "dd MMM yyyy", {
                                    locale: tr,
                                })}
                            </TableCell>
                            <TableCell className="text-right">
                                <Link
                                    href={`/games/${review.slug || review.rawgId}`}
                                    target="_blank"
                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                                >
                                    <BowArrow className="h-3.5 w-3.5" />
                                    Oyunu Gör
                                </Link>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};
