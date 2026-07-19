/**
 * /download-app kampanya olcumu (istemci tarafi).
 *
 * Cihazda HICBIR SEY saklanmaz: cerez yok, localStorage yok, sessionStorage yok.
 * visitId sayfa yuklemesi basina bellekte uretilir. Bunun somut getirisi bu
 * sayfada riza banner'i gerekmemesi; bedeli farkli gunlerdeki ziyaretleri
 * birlestirememek, ki kampanya olcumu icin gerekli degil.
 */

const ENDPOINT = "/api/track/download-app";

export type DownloadEventType = "page_view" | "auto_redirect" | "redirect_cancel" | "store_click" | "web_click";

export interface DownloadEventPayload {
    target?: "app_store" | "google_play" | "web";
    secondsLeft?: number;
}

/** crypto.randomUUID guvenli baglam ister; prod HTTPS ve localhost sorunsuz, yine de yedek var. */
function createVisitId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Meta reklamlari utm_* DEGIL fbclid gonderir. Sadece utm yakalanirsa
 * Instagram/Facebook reklam trafiginin tamami "direct" gorunur ve olcumun
 * amaci bosa cikar. Click id'nin DEGERI saklanmaz (kullaniciya baglanabilir),
 * yalnizca hangi ag oldugu.
 */
function detectClickIdSource(params: URLSearchParams): string | undefined {
    if (params.has("fbclid")) return "fb";
    if (params.has("gclid")) return "google";
    if (params.has("ttclid")) return "tiktok";
    if (params.has("igshid")) return "instagram";
    return undefined;
}

function referrerHost(): string | undefined {
    if (typeof document === "undefined" || !document.referrer) return undefined;
    try {
        const host = new URL(document.referrer).hostname.toLowerCase();
        // Kendi icimizden gelen gecisler kanal degil.
        if (host.endsWith("gghub.social") || host === "localhost") return undefined;
        return host.replace(/^www\./, "");
    } catch {
        return undefined;
    }
}

interface VisitContext {
    visitId: string;
    startedAt: number;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
    clickIdSource?: string;
    referrerHost?: string;
    language?: string;
}

let visit: VisitContext | null = null;

/** Sayfa mount'unda bir kez cagrilir. */
export function startVisit(): VisitContext {
    const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
    visit = {
        visitId: createVisitId(),
        startedAt: Date.now(),
        utmSource: params.get("utm_source") ?? undefined,
        utmMedium: params.get("utm_medium") ?? undefined,
        utmCampaign: params.get("utm_campaign") ?? undefined,
        utmContent: params.get("utm_content") ?? undefined,
        utmTerm: params.get("utm_term") ?? undefined,
        clickIdSource: detectClickIdSource(params),
        referrerHost: referrerHost(),
        language: typeof navigator === "undefined" ? undefined : navigator.language,
    };
    return visit;
}

/**
 * Olayi yollar. Donus degeri "teslim garantisi var mi" demektir:
 * true ise tarayici kuyruga aldi ve navigasyon onu oldurmez, false ise
 * yedek yola dusuldu ve cagiran kisa bir sigorta beklemesi yapmali.
 */
export function trackDownloadEvent(type: DownloadEventType, payload: DownloadEventPayload = {}): boolean {
    if (typeof window === "undefined") return false;
    const context = visit ?? startVisit();

    const body = JSON.stringify({
        eventType: type,
        visitId: context.visitId,
        dwellMs: Math.max(0, Date.now() - context.startedAt),
        utmSource: context.utmSource,
        utmMedium: context.utmMedium,
        utmCampaign: context.utmCampaign,
        utmContent: context.utmContent,
        utmTerm: context.utmTerm,
        clickIdSource: context.clickIdSource,
        referrerHost: context.referrerHost,
        language: context.language,
        ...payload,
    });

    // text/plain BILEREK: application/json CORS-safelisted DEGIL, preflight
    // gerektirir; sendBeacon unload sirasinda preflight yapamaz. Govde yine JSON.
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
        if (navigator.sendBeacon(ENDPOINT, blob)) return true;
    }

    try {
        void fetch(ENDPOINT, {
            method: "POST",
            body,
            keepalive: true,
            headers: { "Content-Type": "text/plain;charset=UTF-8" },
        }).catch(() => {});
    } catch {
        // Olcum asla kullanici akisini bozmaz.
    }
    return false;
}
