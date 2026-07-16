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
