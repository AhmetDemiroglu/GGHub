import { axiosInstance } from "@core/lib/axios";
import type { AgendaContent } from "@/models/agenda/agenda.model";

export const agendaApi = {
    get: (year: number, month: number) => {
        return axiosInstance
            .get<AgendaContent>("/games/agenda", { params: { year, month } })
            .then((res) => res.data);
    },
};
