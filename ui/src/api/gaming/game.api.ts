import axiosInstance from "@core/lib/axios";
import type { Game } from "@/models/gaming/game.model";
import type { AxiosResponse } from "axios";

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export type GameApiPaginateParams = {
  page: number;
  pageSize: number;
  search?: string;
  ordering?: string;
  genres?: string;
  platforms?: string;
  dates?: string;
  metacritic?: string;
};

export const gameApi = {
  paginate: (params: GameApiPaginateParams) => {
    return axiosInstance.get<PaginatedResponse<Game>>('/api/games', { params })
        .then((res) => res.data);
  },
};