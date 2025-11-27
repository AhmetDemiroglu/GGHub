export interface TopUser {
    userId: number;
    username: string;
    profileImageUrl: string | null;
    followerCount: number;
}

export interface TopList {
    listId: number;
    listName: string;
    ownerUsername: string;
    followerCount: number;
    averageRating: number;
    ratingCount: number;
}

export interface TopGame {
    gameId: number;
    gameName: string;
    gameImageUrl: string | null;
    averageRating: number;
    reviewCount: number;
    rawgId: number;
    slug: string;
}
