/**
 * RAWG'in CDN'i URL yoluyla yeniden boyutlandirma sunar: /media/resize/{genislik}/-/... (rawg.io'nun
 * kendi sitesi de bunu kullanir; desteklenen genislikler 200, 420, 640, 1280, 1920).
 *
 * Neden gerekli: API'nin verdigi background_image ORIJINAL dosya. Kesfet sayfasinda 12 kart
 * 18.5 MB indiriyordu (Zelda kapagi tek basina 8.5 MB), Lighthouse LCP 8 sn. next/image ile
 * gecirmek Vercel optimizer kotasini binlerce kaynak gorselle yakardi; RAWG tarafinda
 * kucultmek bedava ve kota harcamaz. next/image kullanan yerlerde de kaynak olarak bunu
 * vermek optimizer'in ilk istekte 8 MB indirmesini onler.
 */
export type RawgResizeWidth = 200 | 420 | 640 | 1280 | 1920;

const RAWG_MEDIA_PREFIX = "https://media.rawg.io/media/";

export const getGameImageUrl = (path: string | null | undefined, width: RawgResizeWidth): string | undefined => {
    const url = getImageUrl(path);
    if (!url || !url.startsWith(RAWG_MEDIA_PREFIX) || url.includes("/media/resize/")) {
        return url;
    }

    return `${RAWG_MEDIA_PREFIX}resize/${width}/-/${url.slice(RAWG_MEDIA_PREFIX.length)}`;
};

export const getImageUrl = (path: string | null | undefined): string | undefined => {
    if (!path) {
        return undefined;
    }

    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!API_BASE) {
        return path;
    }
    if (API_BASE.endsWith("/") && path.startsWith("/")) {
        return `${API_BASE}${path.substring(1)}`;
    }

    return `${API_BASE}${path}`;
};
