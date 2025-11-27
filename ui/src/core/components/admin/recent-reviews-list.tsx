"use client";

import type { RecentReview } from "@/models/admin/admin.model";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@core/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@core/components/ui/avatar";
import { Badge } from "@core/components/ui/badge";
import { Star } from "lucide-react";
import Link from "next/link";
import { getImageUrl } from "@/core/lib/get-image-url";

interface RecentReviewsListProps {
    reviews: RecentReview[];
}

export const RecentReviewsList = ({ reviews }: RecentReviewsListProps) => {
    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div>
                    <CardTitle>Son Eklenen İncelemeler</CardTitle>
                    <CardDescription>En yeni 5 oyun incelemesi.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                <div className="flex flex-1 flex-col gap-4">
                    {reviews.length > 0 ? (
                        reviews.map((review) => (
                            <div key={review.id} className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={getImageUrl(review.userProfileImageUrl)} alt={review.username} />
                                    <AvatarFallback>{review.username.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <Link href={`/profile/${review.username}`} className="text-sm font-medium truncate hover:underline">
                                        {review.username}
                                    </Link>
                                    <Link
                                        href={`/games/${review.slug || review.rawgId}`}
                                        className="text-xs text-muted-foreground truncate block hover:underline"
                                    >
                                        {review.gameName}
                                    </Link>
                                </div>
                                <Badge variant="outline" className="flex gap-1 items-center">
                                    <Star className="h-3 w-3" />
                                    {review.rating}
                                </Badge>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-center text-muted-foreground">Yeni inceleme bulunmamaktadır.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
