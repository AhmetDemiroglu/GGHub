import { getSitemapPageServer, type SitemapKind } from "@/api/sitemap/sitemap.server";
import { localizedUrls, urlsetXml, xmlResponse, type SitemapUrl } from "@/core/seo/sitemap-xml";
import { absoluteUrl } from "@/core/seo/site";

/**
 * Sitemap parcalari:
 *   /sitemaps/pages.xml        statik sayfalar (her dil + hreflang)
 *   /sitemaps/games-{n}.xml    kalite esigini gecen oyunlar, 5.000'lik parcalar
 *   /sitemaps/lists-{n}.xml    herkese acik listeler
 *   /sitemaps/profiles-{n}.xml icerigi olan herkese acik profiller
 */
export const dynamic = "force-dynamic";

const KINDS: Record<SitemapKind, { path: (key: string) => string; changeFrequency: SitemapUrl["changeFrequency"]; priority: number }> = {
    games: { path: (slug) => `/games/${slug}`, changeFrequency: "weekly", priority: 0.8 },
    lists: { path: (id) => `/lists/${id}`, changeFrequency: "weekly", priority: 0.6 },
    profiles: { path: (username) => `/profiles/${username}`, changeFrequency: "weekly", priority: 0.5 },
};

/** Dil onekli statik sayfalar; oncelik sayfanin arama degerine gore. */
const STATIC_PAGES: { path: string; priority: number; changeFrequency: SitemapUrl["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "daily" },
    { path: "/discover", priority: 0.9, changeFrequency: "daily" },
    { path: "/agenda", priority: 0.9, changeFrequency: "daily" },
    { path: "/lists", priority: 0.8, changeFrequency: "daily" },
    { path: "/ai-bots", priority: 0.7, changeFrequency: "daily" },
    { path: "/about", priority: 0.7, changeFrequency: "monthly" },
    { path: "/support", priority: 0.6, changeFrequency: "monthly" },
    { path: "/marketing", priority: 0.5, changeFrequency: "monthly" },
    { path: "/register", priority: 0.5, changeFrequency: "yearly" },
    { path: "/login", priority: 0.3, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/child-safety", priority: 0.3, changeFrequency: "yearly" },
    { path: "/data-deletion", priority: 0.3, changeFrequency: "yearly" },
];

const pagesSitemap = () => {
    const urls = STATIC_PAGES.flatMap(({ path, ...rest }) => localizedUrls(path, rest));
    // Dil oneksiz tek sayfa: magaza yonlendirme sayfasi (?lang ile dil secer).
    urls.push({ loc: absoluteUrl("/download-app"), changeFrequency: "monthly", priority: 0.8 });
    return urlsetXml(urls);
};

const parseFile = (file: string): { kind: SitemapKind; page: number } | null => {
    const match = /^(games|lists|profiles)-(\d{1,4})\.xml$/.exec(file);
    return match ? { kind: match[1] as SitemapKind, page: Number(match[2]) } : null;
};

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
    const { file } = await params;

    if (file === "pages.xml") {
        return xmlResponse(pagesSitemap());
    }

    const parsed = parseFile(file);
    if (!parsed) {
        return new Response("Not found", { status: 404 });
    }

    const { data } = await getSitemapPageServer(parsed.kind, parsed.page);
    if (!data || data.items.length === 0) {
        // Var olmayan parca ya da API hatasi: bos urlset degil 404 (Google bos sitemap'i hata sayar).
        return new Response("Not found", { status: 404 });
    }

    const { path, changeFrequency, priority } = KINDS[parsed.kind];
    const urls = data.items.flatMap((entry) => localizedUrls(path(entry.key), { lastModified: entry.lastModified, changeFrequency, priority }));

    return xmlResponse(urlsetXml(urls));
}
