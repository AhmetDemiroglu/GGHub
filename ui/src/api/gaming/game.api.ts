import { axiosInstance } from "@core/lib/axios";
import type { Game, GameApiPaginateParams } from "@/models/gaming/game.model";
import type { PaginatedResponse } from "@/models/system/api.model";

export const gameApi = {
    paginate: (params: GameApiPaginateParams) => {
        return axiosInstance.get<PaginatedResponse<Game>>("/games", { params }).then((res) => res.data);
    },
    getById: (idOrSlug: string) => {
        return axiosInstance.get<Game>(`/games/${idOrSlug}`).then((res) => res.data);
    },
    translate: (id: number) => {
        return axiosInstance.post<{ descriptionTr: string }>(`/games/${id}/translate`).then((res) => res.data);
    },
    getSimilar: (id: number) => {
        return axiosInstance.get<Game[]>(`/games/${id}/suggested`).then((res) => res.data);
    },
};
