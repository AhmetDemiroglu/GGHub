import { axiosInstance } from '@/src/api/client';

export interface TopUser {
  id: number;
  username: string;
  profileImageUrl: string | null;
  reviewCount: number;
  listCount: number;
}

export interface TopList {
  id: number;
  name: string;
  ownerUsername: string;
  followerCount: number;
  gameCount: number;
}

export interface TopGame {
  id: number;
  name: string;
  slug: string;
  coverImage: string | null;
  reviewCount: number;
  averageRating: number;
}

export const analyticsAdminApi = {
  getTopUsers: (count: number = 5) =>
    axiosInstance
      .get<TopUser[]>('/admin/analytics/top-users', { params: { count } })
      .then((res) => res.data),

  getTopLists: (count: number = 5) =>
    axiosInstance
      .get<TopList[]>('/admin/analytics/top-lists', { params: { count } })
      .then((res) => res.data),

  getTopGames: (count: number = 5) =>
    axiosInstance
      .get<TopGame[]>('/admin/analytics/top-games', { params: { count } })
      .then((res) => res.data),
};
