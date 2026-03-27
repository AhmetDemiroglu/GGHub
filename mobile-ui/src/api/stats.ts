import { axiosInstance } from './client';
import type { UserStats } from '../models/stats';

export const getUserStats = async (username: string): Promise<UserStats> => {
  const response = await axiosInstance.get<UserStats>(
    `/stats/user/${username}`,
  );
  return response.data;
};
