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
 * Backend ReviewDto.User bir UserDto'dur ve UserDtoEnricher tarafindan
 * zenginlestirilir; yani ad/soyad ve isFollowing/isProfileAccessible HER ZAMAN
 * gelir. Model bunlari eskiden hic bildirmiyordu, bu yuzden profil linki
 * gizlilik kapisini uygulayamiyordu.
 */
export interface ReviewUser {
  id: number;
  username: string;
  profileImageUrl: string | null;
  firstName?: string | null;
  lastName?: string | null;
  isFollowing?: boolean;
  isProfileAccessible?: boolean;
}

export interface Review {
  id: number;
  content: string;
  rating: number;
  createdAt: string;
  user: ReviewUser;
  voteScore: number;
  currentUserVote: number | null;
  /** Yalnızca pozitif oy sayısı (feed kalbiyle aynı semantik). */
  likeCount: number;
  commentCount: number;
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
