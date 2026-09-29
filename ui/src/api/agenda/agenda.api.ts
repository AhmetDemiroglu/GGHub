import { axiosInstance } from "@core/lib/axios";
import type { AgendaContent } from "@/models/agenda/agenda.model";
import type { Game } from "@/models/gaming/game.model";

export const agendaApi = {
    get: (year: number, month: number) => {
        return axiosInstance
            .get<AgendaContent>("/games/agenda", { params: { year, month } })
            .then((res) => res.data);
    },
    /** Ada göre arama. Ay filtresi yok: gündemin tüm aralığında arar, hype sırasıyla döner. */
    search: (query: string) => {
        return axiosInstance
            .get<Game[]>("/games/agenda/search", { params: { q: query } })
            .then((res) => res.data);
    },
};
