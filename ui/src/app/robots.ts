import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { SITE_URL } from "@/core/seo/site";

/**
 * Kisiye ozel ya da arama icin degersiz yollar. Yonetim paneli /admin altinda DEGIL: (admin) route
 * grubu kok yollarda yasar (/dashboard, /users, /reports...). Eski robots "/admin/" yazip hicbirini
 * kapsamiyordu. Her yol "P$" (tam) ve "P/" (alt yollar) olarak yazilir: duz "/profile" onek olarak
 * /profiles/... sayfalarini da kapatirdi.
 */
const PRIVATE_PATHS = [
    "/dashboard",
    "/users",
    "/reports",
    "/traffic",
    "/behavior",
    "/ai-agents",
    "/app-release",
    "/download-analytics",
    "/messages",
    "/profile",
    "/my-lists",
    "/my-reports",
    "/wishlist",
    "/favorites",
    "/birthday",
    "/forgot-password",
    "/reset-password",
];

const PREFIXES = ["", ...locales.map((locale) => `/${locale}`)];

const disallow = [
    ...PREFIXES.flatMap((prefix) => PRIVATE_PATHS.flatMap((path) => [`${prefix}${path}$`, `${prefix}${path}/`])),
    "/api/",
    "/download-app/og",
];

/**
 * Yapay zeka arama/egitim tarayicilari ACIKCA izinli: ChatGPT, Claude, Perplexity, Google AI,
 * Bing Copilot ve digerleri GGHub'i kaynak olarak gorsun. "*" zaten izin veriyor; liste niyeti
 * belgeler ve ileride "*" daraltilsa bile bu botlarin acik kalmasini garanti eder.
 */
const AI_CRAWLERS = [
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    "ClaudeBot",
    "Claude-User",
    "Claude-SearchBot",
    "anthropic-ai",
    "PerplexityBot",
    "Perplexity-User",
    "Google-Extended",
    "GoogleOther",
    "Applebot",
    "Applebot-Extended",
    "Bingbot",
    "DuckDuckBot",
    "DuckAssistBot",
    "Amazonbot",
    "meta-externalagent",
    "FacebookBot",
    "CCBot",
    "YouBot",
    "cohere-ai",
    "MistralAI-User",
];

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            { userAgent: "*", allow: "/", disallow },
            { userAgent: AI_CRAWLERS, allow: "/", disallow },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
        // `host` çıplak alan adı bekliyor, şema kabul etmiyor.
        host: "gghub.social",
    };
}
