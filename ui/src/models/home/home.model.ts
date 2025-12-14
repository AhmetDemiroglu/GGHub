import { Platform } from "../gaming/game.model";

export interface HomeGame {
    id: number;
    rawgId: number;
    name: string;
    slug: string;
    backgroundImage: string | null;
    rating: number;
    releaseDate: string | null;
    trailerUrl: string | null;
    clipUrl: string | null;
    metacriticScore: number | null;
    rawgRating: number | null;
    gghubRating: number;
    gghubRatingCount: number;
    description: string | null;
    platforms: Platform[];
}

export interface LeaderboardUser {
    userId: number;
    username: string;
    profileImageUrl: string | null;
    level: number;
    xp: number;
    levelName: string;
    rankChange: number;
}

export interface HomeContent {
    heroGames: HomeGame[];
    trendingLocal: HomeGame[];
    newReleases: HomeGame[];
    topGamers: LeaderboardUser[];
}