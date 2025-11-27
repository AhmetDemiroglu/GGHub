export interface Developer {
    name: string;
    slug: string;
    imageBackground?: string;
}

export interface Publisher {
    name: string;
    slug: string;
}

export interface Store {
    storeName: string;
    domain?: string;
    url: string;
}

export interface Genre {
    name: string;
    slug: string;
}

export interface Platform {
    name: string;
    slug: string;
}

export interface Game {
    id: number;
    rawgId: number;
    slug: string;
    name: string;
    released: string | null;
    backgroundImage: string | null;
    rating: number | null;
    metacritic: number | null;
    description: string | null;
    coverImage: string | null;
    platforms: Platform[];
    genres: Genre[];
    developers?: Developer[];
    publishers?: Publisher[];
    stores?: Store[];
    websiteUrl?: string;
    esrbRating?: string;
    gghubRating?: number;
    gghubRatingCount?: number;
    isInWishlist?: boolean; 
}

export type GameApiPaginateParams = {
    page: number;
    pageSize: number;
    search?: string;
    ordering?: string;
    genres?: string;
    platforms?: string;
    dates?: string;
    metacritic?: string;
};

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
