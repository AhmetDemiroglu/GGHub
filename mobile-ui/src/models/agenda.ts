import type { Game } from './game';

export interface AgendaCounts {
  released: number;
  upcoming: number;
}

/** GET /api/games/agenda yaniti: secilen ayin cikmis + cikacak oyunlari. */
export interface AgendaContent {
  year: number;
  month: number;
  released: Game[];
  upcoming: Game[];
  /** Populerlige gore secilmis vitrin oyunlari (tarih sirasi degil). */
  highlights: Game[];
  /** Cikis tarihi aciklanmamis beklenen oyunlar; yalnizca yil gorunumunde dolu. */
  tba: Game[];
  counts: AgendaCounts;
}
