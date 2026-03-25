"use client";

import type { RecentReview } from "@/models/admin/admin.model";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@core/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@core/components/ui/avatar";
import { Badge } from "@core/components/ui/badge";
import { Star } from "lucide-react";
import Link from "next/link";
import { getImageUrl } from "@/core/lib/get-image-url";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";

interface RecentReviewsListProps {
    reviews: RecentReview[];
}

export const RecentReviewsList = ({ reviews }: RecentReviewsListProps) => {
    const locale = useCurrentLocale();
    const t = useI18n();

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div>
                    <CardTitle>{t("admin.recentReviewsTitle")}</CardTitle>
                    <CardDescription>{t("admin.recentReviewsDescription")}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
                <div className="flex flex-1 flex-col gap-4">
                    {reviews.length > 0 ? (
                        reviews.map((review) => (
                            <div key={review.id} className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={getImageUrl(review.userProfileImageUrl)} alt={review.username} />
                                    <AvatarFallback>{review.username.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <Link href={buildLocalizedPathname(`/profiles/${review.username}`, locale)} className="truncate text-sm font-medium hover:underline">
                                        {review.username}
                                    </Link>
                                    <Link href={buildLocalizedPathname(`/games/${review.slug || review.rawgId}`, locale)} className="block truncate text-xs text-muted-foreground hover:underline">
                                        {review.gameName}
                                    </Link>
                                </div>
                                <Badge variant="outline" className="flex items-center gap-1">
                                    <Star className="h-3 w-3" />
                                    {review.rating}
                                </Badge>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-sm text-muted-foreground">{t("admin.noRecentReviews")}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
