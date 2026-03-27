import { axiosInstance } from './client';
import type { SearchResult } from '../models/search';

export const searchAll = (query: string): Promise<SearchResult[]> => {
  return axiosInstance
    .get<SearchResult[]>(`/search?query=${encodeURIComponent(query)}`)
    .then((response) => response.data);
};

export const searchMessageableUsers = (
  query: string,
): Promise<SearchResult[]> => {
  return axiosInstance
    .get<SearchResult[]>(
      `/search/messageable-users?query=${encodeURIComponent(query)}`,
    )
    .then((response) => response.data);
};
