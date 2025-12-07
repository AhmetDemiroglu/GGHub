export interface GameSummary {
    id: number;
    rawgId: number;
    name: string;
    slug: string;
    coverImage: string | null;
    backgroundImage: string | null;
    released: string | null;
}

export interface ReviewUser {
    id: number;
    username: string;
    profileImageUrl: string | null;
}

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
