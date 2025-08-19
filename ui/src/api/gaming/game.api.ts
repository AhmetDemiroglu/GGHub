import axiosInstance from "@core/lib/axios";
import type { Game } from "@/models/gaming/game.model";
import type { AxiosResponse } from "axios";

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export const gameApi = {
  paginate: (page: number, pageSize: number, search?: string, ordering?: string, genres?: string, platforms?: string) => {
    return axiosInstance.get<PaginatedResponse<Game>>('/api/games', {
      params: { page, pageSize, search, ordering, genres, platforms }, 
    }).then((res) => res.data);
  },
};