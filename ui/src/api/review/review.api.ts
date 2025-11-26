import { axiosInstance } from "@core/lib/axios";
import { Review, CreateReviewRequest, UpdateReviewRequest, VoteReviewRequest } from "@/models/gaming/game.model";

export const getGameReviews = (rawgGameId: number) => {
    return axiosInstance.get<Review[]>(`/games/${rawgGameId}/reviews`).then((res) => res.data);
};
export const createReview = (data: CreateReviewRequest) => {
    return axiosInstance.post<Review>("/reviews", data).then((res) => res.data);
};
export const updateReview = (reviewId: number, data: UpdateReviewRequest) => {
    return axiosInstance.put<Review>(`/reviews/${reviewId}`, data).then((res) => res.data);
};
export const deleteReview = (reviewId: number) => {
    return axiosInstance.delete(`/reviews/${reviewId}`).then((res) => res.data);
};
export const voteReview = (reviewId: number, data: VoteReviewRequest) => {
    return axiosInstance.post(`/reviews/${reviewId}/vote`, data).then((res) => res.data);
};

export const getMyReview = (rawgGameId: number) => {
    return axiosInstance
        .get<Review | null>(`/reviews/game/${rawgGameId}/me`)
        .then((res) => res.data || null)
        .catch(() => null);
};
