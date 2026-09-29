import type { AppLocale } from "@/i18n/config";

/**
 * Sunucu bilesenlerinin (page, generateMetadata, sitemap) API'ye ulasmasinin TEK yolu.
 *
 * Neden axiosInstance degil: o istemciye bagli (localStorage'dan token okuyan interceptor'lar,
 * refresh kuyrugu). Duz `fetch` hem hafif hem de Next Data Cache'ini (revalidate/tags) kullanir.
 *
 * API_BASE_URL (sunucuya ozel) once: NEXT_PUBLIC_* degerleri derleme aninda gomulur, calisma
 * aninda degistirilemez. Sunucu tarafi fetch'i ic ag adresine ya da lokal sahte API'ye
 * yonlendirebilmek icin ayni desen /api/track proxy'siyle paylasilir.
 *
 * Ust sinir 5 sn: API soguk ya da yavassa Vercel fonksiyonu sonsuza dek beklemez; null doner,
 * sayfa istemcide kendi istegini yapar. Data Cache dolu oldugunda bu yol hic islemez.
 */
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_REVALIDATE_SECONDS = 300;

export type ServerFetchOptions = {
    /** Accept-Language: yalnizca yaniti dile gore degisen uclarda verilir (dil basina ayri onbellek). */
    locale?: AppLocale;
    /** Next Data Cache suresi (saniye). */
    revalidate?: number;
    tags?: string[];
    timeoutMs?: number;
};

/**
 * status: HTTP durum kodu; ag hatasi/zaman asiminda 0. 404 "bulunamadi" normal bir sonuc
 * oldugu icin loglanmaz, sayfa buna gore notFound/noindex karar verir. Diger basarisizliklar
 * gecicidir: data null doner ve istemci fetch'i devralir.
 */
export type ServerFetchResult<T> = { data: T | null; status: number };

export const getApiBaseUrl = () => process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;

export async function serverGet<T>(path: string, options: ServerFetchOptions = {}): Promise<ServerFetchResult<T>> {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) return { data: null, status: 0 };

    const headers: Record<string, string> = { Accept: "application/json" };
    if (options.locale) headers["Accept-Language"] = options.locale;

    try {
        const response = await fetch(`${baseUrl}${path}`, {
            headers,
            next: { revalidate: options.revalidate ?? DEFAULT_REVALIDATE_SECONDS, tags: options.tags },
            signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
        });

        if (!response.ok) {
            if (response.status !== 404 && response.status !== 401 && response.status !== 403) {
                // Vercel fonksiyon loglarinda gorunsun: sunucu tarafi fetch neden dustu?
                console.error(`[server-fetch] ${response.status} ${response.statusText} from ${path}`);
            }
            return { data: null, status: response.status };
        }

        return { data: (await response.json()) as T, status: response.status };
    } catch (error) {
        console.error(`[server-fetch] ${path} failed:`, error instanceof Error ? `${error.name}: ${error.message}` : error);
        return { data: null, status: 0 };
    }
}
