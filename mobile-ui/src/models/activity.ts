import { GameSummary } from './review';

export enum ActivityType {
  Review = 0,
  ListCreated = 1,
  FollowUser = 2,
}

export interface ReviewActivityData {
  reviewId: number;
  rating: number;
  contentSnippet?: string;
  game: GameSummary;
}

export interface ListActivityData {
  listId: number;
  name: string;
  gameCount: number;
  previewImages: (string | null)[];
}

export interface FollowActivityData {
  username: string;
  profileImageUrl: string | null;
  id?: number;
  firstName?: string | null;
  lastName?: string | null;
}

export interface Activity {
  id: number;
  type: ActivityType;
  occurredAt: string;
  reviewData?: ReviewActivityData;
  listData?: ListActivityData;
  followData?: FollowActivityData;
}

export type ProfileActivityType = 'review' | 'list_created' | 'follow' | 'wishlist' | 'rating';

export interface ActivityItem {
  id: number;
  type: ProfileActivityType;
  description: string;
  targetName?: string;
  createdAt: string;
}
