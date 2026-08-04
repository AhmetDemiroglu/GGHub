import { axiosInstance } from '@/src/api/client';

/**
 * Alan adlari backend DTO'lariyla BIREBIR (TopUserDto/TopListDto/TopGameDto).
 * Eskiden burada uydurma alanlar vardi (id/name/coverImage/reviewCount) ve
 * kartlar bos gorunuyordu; ui/src/models/analytics/analytics.model.ts ile ayni
 * sekil kullaniliyor.
 */
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

/**
 * Yol `/analytics/...`, `/admin/analytics/...` DEGIL: uclar AnalyticsController
 * altinda ([Route("api/[controller]")]) ve yalnizca Admin rolune acik. Eski
 * "/admin/" onekli yol 404 donuyordu ve dashboard'daki uc kart (en cok takip
 * edilen kullanicilar, en populer listeler, en yuksek puanli oyunlar) sessizce
 * bos ciziliyordu. Web istemcisi (ui/src/api/analytics/analytics.api.ts) bastan
 * beri dogru yolu kullaniyor.
 */
export const analyticsAdminApi = {
  getTopUsers: (count: number = 5) =>
    axiosInstance
      .get<TopUser[]>('/analytics/top-users', { params: { count } })
      .then((res) => res.data),

  getTopLists: (count: number = 5) =>
    axiosInstance
      .get<TopList[]>('/analytics/top-lists', { params: { count } })
      .then((res) => res.data),

  getTopGames: (count: number = 5) =>
    axiosInstance
      .get<TopGame[]>('/analytics/top-games', { params: { count } })
      .then((res) => res.data),
};
