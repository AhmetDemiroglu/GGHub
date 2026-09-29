import { SITEMAP_PAGE_SIZE, getSitemapPageServer, type SitemapKind } from "@/api/sitemap/sitemap.server";
import { sitemapIndexXml, xmlResponse } from "@/core/seo/sitemap-xml";
import { absoluteUrl } from "@/core/seo/site";

/**
 * Sitemap indeksi: Search Console'a verilen TEK adres. Parcalar /sitemaps/{kind}-{n}.xml.
 * Sayfa sayisi API'deki toplam kayittan hesaplanir; API ulasilamazsa yalniz statik sayfalar listelenir
 * (bos bir indeks ya da 500 yerine), sonraki yeniden dogrulamada tamamlanir.
 */
// Istek aninda uretilir (derleme aninda API'ye bagli kalmaz); CDN Cache-Control ile bir saat tutar,
// altta fetch'ler Next Data Cache'inde zaten bir saat onbellekli.
export const dynamic = "force-dynamic";

const KINDS: SitemapKind[] = ["games", "lists", "profiles"];

const pageCount = async (kind: SitemapKind) => {
    const { data } = await getSitemapPageServer(kind, 1);
    return data ? Math.ceil(data.totalCount / SITEMAP_PAGE_SIZE) : 0;
};

export async function GET() {
    const counts = await Promise.all(KINDS.map(pageCount));
    const sitemaps = [{ loc: absoluteUrl("/sitemaps/pages.xml") }];

    KINDS.forEach((kind, index) => {
        for (let page = 1; page <= counts[index]; page += 1) {
            sitemaps.push({ loc: absoluteUrl(`/sitemaps/${kind}-${page}.xml`) });
        }
    });

    return xmlResponse(sitemapIndexXml(sitemaps));
}
