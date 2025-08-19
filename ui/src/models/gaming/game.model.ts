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
  platforms: Platform[]; // EKLENDİ
  genres: Genre[]; // EKLENDİ
}