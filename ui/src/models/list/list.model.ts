import { Game } from '../gaming/game.model'; 
export interface ListOwner {
  id: number;
  username: string;
  profileImageUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}
export enum ListVisibilitySetting {
  Public = 0,
  Followers = 1,
  Private = 2,
}
export enum ListCategory {
  Other = 0,
  Action = 1,
  RPG = 2,
  Strategy = 3,
  Shooter = 4,
  Adventure = 5,
  Simulation = 6,
  Sports = 7,
  Puzzle = 8,
  Horror = 9,
}
export interface ListQueryParameters {
  page: number;
  pageSize: number;
  searchTerm?: string;
  category?: ListCategory;
}
export interface UserListForCreation {
  name: string;
  description?: string;
  visibility: ListVisibilitySetting;
  category: ListCategory;
}
export interface UserListForUpdate {
  name: string;
  description?: string;
  visibility: ListVisibilitySetting;
  category: ListCategory;
}
export interface UserList {
  id: number;
  name: string;
  description?: string;
  visibility: ListVisibilitySetting;
  category: ListCategory;
  createdAt: string; 
  updatedAt: string;
  gameCount: number;
  followerCount: number;
  averageRating: number;
  ratingCount: number;
  firstGameImageUrls: (string | null)[]; // EKLENDİ
}
export interface UserListPublic {
  id: number;
  name: string;
  description?: string;
  category: ListCategory;
  updatedAt: string;
  gameCount: number;
  followerCount: number;
  averageRating: number;
  ratingCount: number;
  owner: ListOwner;
}
export interface UserListDetail {
  id: number;
  name: string;
  description?: string;
  visibility: ListVisibilitySetting;
  category: ListCategory;
  updatedAt: string;
  followerCount: number;
  averageRating: number;
  ratingCount: number;
  owner: ListOwner;
  games: Game[];
}

export interface UserListRatingForUpsert {
  value: number; // 1-5
}

export interface UserListRatingResponse {
  value: number | null;
}
export interface UserListCommentForCreation {
  content: string;
  parentCommentId?: number;
}

export interface UserListCommentForUpdate {
  content: string;
}

export interface UserListCommentVote {
  value: number;
}

export interface UserListComment {
  id: number;
  content: string;
  createdAt: string;
  updatedAt?: string;
  owner: ListOwner;
  listId: number;
  parentCommentId?: number;
  upvotes: number;
  downvotes: number;
  currentUserVote: number;
}