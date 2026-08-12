import type { Game } from "@/models/gaming/game.model";

export interface AgendaCounts {
    released: number;
    upcoming: number;
}

/** GET /api/games/agenda yanıtı: seçilen ayın çıkmış + çıkacak oyunları. */
export interface AgendaContent {
    year: number;
    month: number;
    released: Game[];
    upcoming: Game[];
    counts: AgendaCounts;
}
