import type { SocialProfile } from './social';

/**
 * Backend ReviewCommentDto'nun aynasi. Yapisi UserListComment ile birebir ayni
 * (listId yerine reviewId); bu yuzden ikisi de paylasilan yorum agaci bilesenini
 * besleyebilir.
 */
export interface ReviewComment {
  id: number;
  content: string;
  createdAt: string;
  updatedAt?: string;
  owner: SocialProfile;
  reviewId: number;
  parentCommentId?: number;
  upvotes: number;
  downvotes: number;
  currentUserVote: number;
  replies?: ReviewComment[];
}

export interface ReviewCommentForCreation {
  content: string;
  parentCommentId?: number;
}

export interface ReviewCommentForUpdate {
  content: string;
}

export interface ReviewCommentVote {
  /** -1, 0 veya 1. */
  value: number;
}

/** Backend ListQueryParams'in yorum listesinde kullanilan alt kumesi. */
export interface ReviewCommentQueryParameters {
  page: number;
  pageSize: number;
}
