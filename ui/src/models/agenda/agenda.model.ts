import type { Game } from "@/models/gaming/game.model";

export interface AgendaCounts {
    released: number;
    upcoming: number;
}

/** GET /api/games/agenda yanıtı: seçilen ayın çıkmış + çıkacak oyunları. month=0 tüm yıl. */
export interface AgendaContent {
    year: number;
    month: number;
    released: Game[];
    upcoming: Game[];
    /** Vitrin için popülerliğe göre seçilmiş oyunlar (tarih sırasına göre değil). */
    highlights: Game[];
    /** Çıkış tarihi henüz açıklanmamış beklenen oyunlar; yalnızca yıl görünümünde dolu. */
    tba: Game[];
    counts: AgendaCounts;
}
