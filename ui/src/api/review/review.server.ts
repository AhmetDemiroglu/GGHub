import type { Review } from "@/models/review/review.model";
import { serverGet } from "@/api/server-fetch";

/** Kalici inceleme baglantisi anonim erisime acik (ReviewsController). */
export const getReviewServer = (reviewId: number) =>
    serverGet<Review>(`/api/reviews/${reviewId}`, { revalidate: 120, tags: [`review-${reviewId}`] });
