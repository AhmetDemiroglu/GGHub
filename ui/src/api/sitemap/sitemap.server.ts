import type { PaginatedResponse } from "@/models/system/api.model";
import { serverGet } from "@/api/server-fetch";

/** Backend SitemapEntryDto aynasi: key = oyun slug'i / liste id'si / kullanici adi. */
export interface SitemapEntry {
    key: string;
    lastModified: string;
}

export type SitemapKind = "games" | "lists" | "profiles";

/** Bir sitemap dosyasindaki URL sayisi; protokol siniri 50.000, Google 50 MB. 5.000 rahat sigar. */
export const SITEMAP_PAGE_SIZE = 5000;

/**
 * Backend'in sitemap ucu: yalnizca herkese acik ve degerli kayitlar (kalite esigini gecen
 * oyunlar, Public listeler, icerigi olan Public profiller). Bir saat onbellekte kalir.
 */
export const getSitemapPageServer = (kind: SitemapKind, page: number) =>
    serverGet<PaginatedResponse<SitemapEntry>>(`/api/sitemap/${kind}?page=${page}&pageSize=${SITEMAP_PAGE_SIZE}`, {
        revalidate: 3600,
        tags: [`sitemap-${kind}`],
        timeoutMs: 15000,
    });
