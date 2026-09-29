import type { Game } from "@/models/gaming/game.model";
import type { Review } from "@/models/review/review.model";
import type { PaginatedResponse } from "@/models/system/api.model";
import { serverGet } from "@/api/server-fetch";

/**
 * Oyun detayi sunucuda cekilir: sayfa HTML'i ad, aciklama, puanlar ve incelemelerle gelir.
 * JS calistirmayan tarayicilar (GPTBot, ClaudeBot, PerplexityBot) icin sayfanin icerigi budur;
 * Googlebot da hydration beklemeden okur. Yanit dile bagli degil (iki aciklama da doner).
 */
export const getGameServer = (idOrSlug: string) =>
    serverGet<Game>(`/api/games/${encodeURIComponent(idOrSlug)}`, { revalidate: 300, tags: [`game-${idOrSlug}`] });

/** rawgId ile: /api/games/{gameId}/reviews ucu (ReviewsController) RAWG kimligi bekler. */
export const getGameReviewsServer = (rawgId: number) =>
    serverGet<Review[]>(`/api/games/${rawgId}/reviews`, { revalidate: 120, tags: [`game-reviews-${rawgId}`] });

/** Kesfet'in filtresiz ilk sayfasi: haftalik rotasyonlu varsayilan akis, dil bagimsiz. */
export const getDiscoverFirstPageServer = (pageSize: number) =>
    serverGet<PaginatedResponse<Game>>(`/api/games/discover?page=1&pageSize=${pageSize}`, { revalidate: 600, tags: ["discover-first-page"] });
