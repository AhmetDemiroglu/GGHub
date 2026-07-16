import { axiosInstance } from './client';
import type { PaginatedResponse } from '../models/api';
import type {
  ReviewComment,
  ReviewCommentForCreation,
  ReviewCommentForUpdate,
  ReviewCommentQueryParameters,
  ReviewCommentVote,
} from '../models/review-comment';

export const getReviewComments = (
  reviewId: number,
  params: ReviewCommentQueryParameters,
): Promise<PaginatedResponse<ReviewComment>> => {
  return axiosInstance
    .get<PaginatedResponse<ReviewComment>>(`/reviewcomments/review/${reviewId}`, {
      params,
    })
    .then((response) => response.data);
};

export const createReviewComment = (
  reviewId: number,
  data: ReviewCommentForCreation,
): Promise<ReviewComment> => {
  return axiosInstance
    .post<ReviewComment>(`/reviewcomments/review/${reviewId}`, data)
    .then((response) => response.data);
};

export const updateReviewComment = (
  commentId: number,
  data: ReviewCommentForUpdate,
): Promise<void> => {
  return axiosInstance
    .put(`/reviewcomments/${commentId}`, data)
    .then((response) => response.data);
};

export const deleteReviewComment = (commentId: number): Promise<void> => {
  return axiosInstance
    .delete(`/reviewcomments/${commentId}`)
    .then((response) => response.data);
};

export const voteOnReviewComment = (
  commentId: number,
  data: ReviewCommentVote,
): Promise<void> => {
  return axiosInstance
    .post(`/reviewcomments/${commentId}/vote`, data)
    .then((response) => response.data);
};
