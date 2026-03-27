import { axiosInstance } from './client';
import type { UserStats } from '../models/stats';

export const getUserGamificationStats = (
  userId: number,
): Promise<UserStats> => {
  return axiosInstance
    .get<UserStats>(`/gamification/stats/${userId}`)
    .then((response) => response.data);
};
