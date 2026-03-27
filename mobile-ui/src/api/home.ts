import { axiosInstance } from './client';
import type { HomeContent } from '../models/home';

export const getHomeContent = (): Promise<HomeContent> => {
  return axiosInstance
    .get<HomeContent>('/home/content')
    .then((response) => response.data);
};
