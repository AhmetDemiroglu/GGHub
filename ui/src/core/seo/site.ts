import { APP_STORE_URL, GOOGLE_PLAY_URL } from "@/core/lib/store-links";

/**
 * Site geneli SEO sabitleri. Kanonik URL, sosyal kart gorseli ve "sameAs" baglantilarinin
 * TEK kaynagi: layout, sayfa metadata'lari, JSON-LD, sitemap ve llms.txt hepsi buradan okur.
 */
export const SITE_URL = "https://gghub.social";
export const SITE_NAME = "GGHub";
export const SITE_EMAIL = "info@gghub.social";
export const DEFAULT_OG_IMAGE = "/og/gghub-social-v2.png";
export const LOGO_URL = `${SITE_URL}/og/gghub-logo.png`;

/** App Store sayfa kimligi (apps.apple.com/.../id6781281375). Smart banner ve JSON-LD kullanir. */
export const APP_STORE_ID = "6781281375";

export const SOCIAL_PROFILES = {
    x: "https://x.com/gghub_tr",
    github: "https://github.com/AhmetDemiroglu/GGHub",
    appStore: APP_STORE_URL,
    googlePlay: GOOGLE_PLAY_URL ?? "",
} as const;

/** Organization.sameAs: bos string (yayinda olmayan magaza) listeye girmez. */
export const SAME_AS_LINKS = Object.values(SOCIAL_PROFILES).filter((url) => url.length > 0);

export const absoluteUrl = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`);
