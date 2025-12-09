export interface GenreStat {
    name: string;
    percentage: number;
    color: string;
}

export interface UserStats {
    totalReviews: number;
    totalGamesListed: number;
    totalFollowers: number;
    gamerDna: GenreStat[];
}
