import type { SocialProfile } from "@/models/social/social.model";

export interface GameSummary {
    id: number;
    rawgId: number;
    name: string;
    slug: string;
    coverImage: string | null;
    backgroundImage: string | null;
    released: string | null;
}

/**
 * Backend ReviewDto.User artik tam UserDto donuyor (isProfileAccessible dahil),
 * bu da SocialProfile ile ayni sekil. Tek kaynak kalsin diye alias.
 */
export type ReviewUser = SocialProfile;

export interface Review {
    id: number;
    content: string;
    rating: number;
    createdAt: string;
    user: ReviewUser;
    voteScore: number;
    currentUserVote: number | null;
    game?: GameSummary;
}

export interface CreateReviewRequest {
    gameId: number;
    rating: number;
    content: string;
}

export interface UpdateReviewRequest {
    rating: number;
    content: string;
}

export interface VoteReviewRequest {
    value: number;
}
