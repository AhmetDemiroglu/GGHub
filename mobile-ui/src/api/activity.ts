import { axiosInstance } from './client';
import type { Activity, ActivityType } from '../models/activity';

export const getUserActivityFeed = async (
  username: string,
): Promise<Activity[]> => {
  const response = await axiosInstance.get<Activity[]>(
    `/activities/user/${username}`,
  );
  return response.data;
};

export const getPersonalizedFeed = (
  limit: number = 10,
  cursor?: string,
  type?: ActivityType,
): Promise<Activity[]> => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  if (type !== undefined) params.set('type', String(type));
  return axiosInstance
    .get<Activity[]>(`/activities/feed?${params.toString()}`)
    .then((response) => response.data);
};

/** Akis sekmeleri. Backend'deki FeedTab ile birebir. */
export type FeedTabKey = 'posts' | 'reviews' | 'discover';

/**
 * Sekme tabanli akis. Eski ?type= yolu (getPersonalizedFeed) magazadaki
 * surumler icin duruyor; guncel uygulama bunu kullaniyor.
 */
export const getFeedByTab = (
  tab: FeedTabKey,
  limit: number = 10,
  cursor?: string,
): Promise<Activity[]> => {
  const params = new URLSearchParams({ limit: String(limit), tab });
  if (cursor) params.set('cursor', cursor);
  return axiosInstance
    .get<Activity[]>(`/activities/feed?${params.toString()}`)
    .then((response) => response.data);
};
