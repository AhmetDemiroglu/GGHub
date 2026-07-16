import type { SocialProfile } from "@/models/social/social.model";

/** Backend ReviewCommentDto aynasi. Owner, UserDto ile ayni sekle sahip (SocialProfile). */
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
    /** Backend her zaman (bos da olsa) doldurur. */
    replies: ReviewComment[];
}

export interface ReviewCommentForCreation {
    content: string;
    parentCommentId?: number;
}

export interface ReviewCommentForUpdate {
    content: string;
}

export interface ReviewCommentVote {
    value: number;
}

export interface ReviewCommentQueryParameters {
    page: number;
    pageSize: number;
}
