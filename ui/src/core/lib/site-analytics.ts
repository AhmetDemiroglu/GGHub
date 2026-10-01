/**
 * Site geneli davranis olcumu (istemci tarafi).
 *
 * download-analytics.ts'nin sitenin tamamina genisletilmis hali. Iki kimlik var, ikisi de
 * localStorage'da ve kisisel veri tasimayan rastgele UUID:
 *  - Oturum (gghub.sa.sid): 30 dk hareketsizlikte yenilenir, TUM SEKMELER ORTAK. Eskiden
 *    sessionStorage'daydi; her yeni sekme yeni, tek sayfalik bir oturum aciyor ve hemen cikma
 *    oranini yapay olarak sisiriyordu (1 Eki 2026).
 *  - Tarayici (gghub.sa.vid): kalici. Gunler arasi gercek tekil ziyaretci sayimi ve "yonetici bu
 *    cihazda bir kez giris yaptiysa cikis yapmis gezintisi de onundur" ayiklamasi bununla yapilir.
 *
 * Kimlik ISTEMCIDEN GONDERILMEZ: yalnizca Authorization basligi iletilir, kullaniciyi backend
 * JWT'den cozer. Tam URL de gonderilmez; rota SABLONU (/games/[id]) + dinamik segmentin degeri
 * ayri gider. Arama sorgusu, token vb. hicbir zaman olaya girmez.
 */

const ENDPOINT = "/api/track/site";
const SESSION_KEY = "gghub.sa.sid";
const LAST_SEEN_KEY = "gghub.sa.last";
const ENTRY_KEY = "gghub.sa.entry";
const VISITOR_KEY = "gghub.sa.vid";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export type SiteActionName =
    | "search"
    | "review_create"
    | "wishlist_add"
    | "wishlist_remove"
    | "favorite_add"
    | "favorite_remove"
    | "list_add"
    | "list_create"
    | "post_create"
    | "login"
    | "register"
    | "share"
    | "follow"
    | "message_send"
    | "translate_request";

/**
 * ROTA KATALOGU: backend SiteAnalyticsService.RouteSections ile birebir. Katalog disi yol
 * "/other" olarak gider; backend de bilmedigi sablonu ayni sekilde ele alir.
 */
const STATIC_ROUTES = new Set([
    "/", "/discover", "/agenda", "/lists", "/my-lists", "/wishlist", "/favorites", "/profile", "/messages",
    "/login", "/register", "/forgot-password", "/reset-password",
    "/about", "/privacy", "/terms", "/child-safety", "/data-deletion", "/support", "/my-reports", "/birthday", "/marketing",
    "/download", "/download-app", "/ai-bots",
]);

const DYNAMIC_ROUTES: Array<[prefix: string, template: string]> = [
    ["/games/", "/games/[id]"],
    ["/lists/", "/lists/[listId]"],
    ["/posts/", "/posts/[postId]"],
    ["/profiles/", "/profiles/[username]"],
    ["/reviews/", "/reviews/[reviewId]"],
    ["/messages/", "/messages/[username]"],
];

/** Yonetim paneli olculmez: yoneticinin kendi gezintisi "kullanici davranisi" degildir. */
const UNTRACKED_PREFIXES = ["/dashboard", "/users", "/reports", "/download-analytics", "/traffic", "/behavior", "/ai-agents", "/app-release", "/errors", "/api/"];

const LOCALE_PREFIX = /^\/(tr|en-US)(?=\/|$)/;

export interface NormalizedRoute {
    route: string;
    pathKey?: string;
    locale?: string;
}

export function normalizeRoute(pathname: string): NormalizedRoute {
    let locale: string | undefined;
    let path = pathname || "/";
    const match = path.match(LOCALE_PREFIX);
    if (match) {
        locale = match[1];
        path = path.slice(match[0].length) || "/";
    }
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);

    if (STATIC_ROUTES.has(path)) return { route: path, locale };

    for (const [prefix, template] of DYNAMIC_ROUTES) {
        if (path.startsWith(prefix)) {
            const rest = path.slice(prefix.length);
            // Yalnizca TEK segment: "/games/x/y" gibi bilinmeyen derinlikler katalog disi kalir.
            if (rest && !rest.includes("/")) {
                let pathKey: string | undefined;
                try {
                    pathKey = decodeURIComponent(rest).slice(0, 96);
                } catch {
                    pathKey = rest.slice(0, 96);
                }
                return { route: template, pathKey, locale };
            }
        }
    }

    return { route: "/other", locale };
}

export function isTrackedPath(pathname: string): boolean {
    const stripped = pathname.replace(LOCALE_PREFIX, "") || "/";
    return !UNTRACKED_PREFIXES.some((prefix) => stripped === prefix || stripped.startsWith(prefix + "/") || stripped.startsWith(prefix));
}

function createId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

interface EntryContext {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    clickIdSource?: string;
    referrerHost?: string;
}

function detectClickIdSource(params: URLSearchParams): string | undefined {
    if (params.has("fbclid")) return "fb";
    if (params.has("gclid")) return "google";
    if (params.has("ttclid")) return "tiktok";
    if (params.has("igshid")) return "instagram";
    return undefined;
}

function externalReferrerHost(): string | undefined {
    if (typeof document === "undefined" || !document.referrer) return undefined;
    try {
        const host = new URL(document.referrer).hostname.toLowerCase();
        if (host.endsWith("gghub.social") || host === "localhost") return undefined;
        return host.replace(/^www\./, "");
    } catch {
        return undefined;
    }
}

/** localStorage; engelliyse (gizli pencere, kisitli depolama) sessionStorage'a duser. */
function safeStorage(): Storage | null {
    if (typeof window === "undefined") return null;
    try {
        const storage = window.localStorage;
        storage.setItem("gghub.sa.probe", "1");
        storage.removeItem("gghub.sa.probe");
        return storage;
    } catch {
        try {
            return window.sessionStorage;
        } catch {
            return null;
        }
    }
}

function getVisitorId(storage: Storage | null): string | undefined {
    if (!storage) return undefined;
    let visitorId = storage.getItem(VISITOR_KEY);
    if (!visitorId) {
        visitorId = createId();
        storage.setItem(VISITOR_KEY, visitorId);
    }
    return visitorId;
}

/**
 * Oturumu getirir; 30 dk hareketsizlikten sonra yeni oturum acilir. Giris kanali (utm/referrer)
 * yalnizca oturumun ILK sayfasinda okunur ve oturum boyunca tasinir: ic gecislerde referrer
 * kendi alan adimiz olur ve kanal bilgisi kaybolurdu.
 */
function getSession(): { sessionId: string; entry: EntryContext } {
    const storage = safeStorage();
    const now = Date.now();
    let sessionId = storage?.getItem(SESSION_KEY) ?? null;
    const lastSeen = Number(storage?.getItem(LAST_SEEN_KEY) ?? 0);
    let entry: EntryContext = {};

    if (sessionId && now - lastSeen < SESSION_TIMEOUT_MS) {
        try {
            entry = JSON.parse(storage?.getItem(ENTRY_KEY) ?? "{}");
        } catch {
            entry = {};
        }
    } else {
        sessionId = createId();
        const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
        entry = {
            utmSource: params.get("utm_source") ?? undefined,
            utmMedium: params.get("utm_medium") ?? undefined,
            utmCampaign: params.get("utm_campaign") ?? undefined,
            clickIdSource: detectClickIdSource(params),
            referrerHost: externalReferrerHost(),
        };
        storage?.setItem(SESSION_KEY, sessionId);
        storage?.setItem(ENTRY_KEY, JSON.stringify(entry));
    }

    storage?.setItem(LAST_SEEN_KEY, String(now));
    return { sessionId, entry };
}

let tokenProvider: (() => string | null) | null = null;

/** AuthProvider'dan beslenir; token varsa istege eklenir, backend kimligi buradan cozer. */
export function setSiteAnalyticsTokenProvider(provider: (() => string | null) | null) {
    tokenProvider = provider;
}

interface EventPayload {
    eventType: "page_view" | "page_leave" | "action";
    route: string;
    pathKey?: string;
    locale?: string;
    actionName?: string;
    dwellMs?: number;
    scrollDepth?: number;
}

function send(payload: EventPayload) {
    if (typeof window === "undefined") return;
    const { sessionId, entry } = getSession();
    const body = JSON.stringify({
        ...payload,
        sessionId,
        visitorId: getVisitorId(safeStorage()),
        ...entry,
        language: typeof navigator !== "undefined" ? navigator.language : undefined,
        // Otomasyonla surulen tarayici (Puppeteer, Playwright, Selenium): normal Chrome kimligi tasisa da bottur.
        automation: typeof navigator !== "undefined" && navigator.webdriver === true ? true : undefined,
    });

    const headers: Record<string, string> = { "Content-Type": "text/plain;charset=UTF-8" };
    const token = tokenProvider?.();
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
        // keepalive: sekme kapanirken de gider. sendBeacon yerine fetch: beacon Authorization
        // basligi tasiyamaz, kimliksiz kalirdi.
        void fetch(ENDPOINT, { method: "POST", headers, body, keepalive: true }).catch(() => undefined);
    } catch {
        // Olcum hatasi kullanici akisini asla etkilemez.
    }
}

export function trackPageView(pathname: string) {
    if (!isTrackedPath(pathname)) return;
    const { route, pathKey, locale } = normalizeRoute(pathname);
    send({ eventType: "page_view", route, pathKey, locale });
}

export function trackPageLeave(pathname: string, dwellMs: number, scrollDepth: number) {
    if (!isTrackedPath(pathname)) return;
    const { route, pathKey, locale } = normalizeRoute(pathname);
    send({
        eventType: "page_leave",
        route,
        pathKey,
        locale,
        dwellMs: Math.max(0, Math.round(dwellMs)),
        scrollDepth: Math.max(0, Math.min(100, Math.round(scrollDepth))),
    });
}

/** Anlamli etkilesim: arama, inceleme, istek listesi... Bulundugu rota otomatik eklenir. */
export function trackAction(actionName: SiteActionName) {
    if (typeof window === "undefined") return;
    const pathname = window.location.pathname;
    if (!isTrackedPath(pathname)) return;
    const { route, pathKey, locale } = normalizeRoute(pathname);
    send({ eventType: "action", route, pathKey, locale, actionName });
}
