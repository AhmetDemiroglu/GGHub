import { axiosInstance } from "@core/lib/axios";
import type { Game, GameApiPaginateParams } from "@/models/gaming/game.model";
import type { PaginatedResponse } from "@/models/system/api.model";

export const gameApi = {
    paginate: (params: GameApiPaginateParams) => {
        return axiosInstance.get<PaginatedResponse<Game>>("/games", { params }).then((res) => res.data);
    },
};
