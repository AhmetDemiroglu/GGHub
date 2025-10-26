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
