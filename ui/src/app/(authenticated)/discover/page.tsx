import type { Metadata } from "next";
import { DiscoverView } from "@/core/components/other/discover/discover-view";
import { getDiscoverFirstPageServer } from "@/api/gaming/game.server";
import { getMessages, translate } from "@/i18n";
import { resolveLocaleFromParams } from "@/i18n/server";
import { seoCopy } from "@/core/seo/copy";
import { buildPageMetadata } from "@/core/seo/metadata";
import { JsonLd, breadcrumbJsonLd, collectionPageJsonLd } from "@/core/seo/json-ld";
import { getGameImageUrl } from "@/core/lib/get-image-url";

/** DiscoverView'in varsayilan sayfa boyutuyla AYNI olmali; aksi halde sunucu verisi istemci sorgusuyla eslesmez. */
const FIRST_PAGE_SIZE = 12;

type Props = {
    params?: Promise<{ locale?: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const locale = await resolveLocaleFromParams(params);

    // Filtreli/sayfali URL'ler de /discover'i kanonik gosterir: binlerce filtre kombinasyonu dizine girmesin.
    return buildPageMetadata({
        locale,
        path: "/discover",
        title: seoCopy(locale, "discoverTitle"),
        description: seoCopy(locale, "discoverDescription"),
    });
}

/**
 * Kesfet. Filtresiz ilk sayfa sunucuda cekilir ve HTML'e gomulur (oyun kartlari tarayiciya
 * JS'siz de gorunur); filtreli/sayfali gorunumler istemcide react-query ile yuklenir.
 */
export default async function DiscoverPage({ params, searchParams }: Props) {
    const locale = await resolveLocaleFromParams(params);
    const hasQuery = Object.keys(await searchParams).length > 0;
    const firstPage = hasQuery ? null : (await getDiscoverFirstPageServer(FIRST_PAGE_SIZE)).data;
    const messages = getMessages(locale);

    return (
        <>
            {firstPage ? (
                <JsonLd
                    data={[
                        collectionPageJsonLd({
                            locale,
                            path: "/discover",
                            name: seoCopy(locale, "discoverTitle"),
                            description: seoCopy(locale, "discoverDescription"),
                            items: firstPage.items.map((game) => ({
                                name: game.name,
                                path: `/games/${game.slug || game.rawgId}`,
                                image: getGameImageUrl(game.backgroundImage, 640) ?? null,
                            })),
                        }),
                        breadcrumbJsonLd(locale, [
                            { name: translate(messages, "nav.home"), path: "/" },
                            { name: translate(messages, "nav.discover"), path: "/discover" },
                        ]),
                    ]}
                />
            ) : null}
            <DiscoverView initialFirstPage={firstPage} />
        </>
    );
}
