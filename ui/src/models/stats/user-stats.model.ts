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

    // Gamification
    currentLevel: number;
    levelName: string;
    currentXp: number;
    nextLevelXp: number;
    progressPercentage: number;
    recentAchievements: string[];
    totalLists: number;
}
