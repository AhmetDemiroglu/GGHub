import type { Metadata } from "next";
import { ListDiscoverView } from "@/core/components/other/lists/list-discover-view";
import { getPublicListsFirstPageServer } from "@/api/list/list.server";
import { getMessages, translate } from "@/i18n";
import { resolveLocaleFromParams } from "@/i18n/server";
import { seoCopy } from "@/core/seo/copy";
import { buildPageMetadata } from "@/core/seo/metadata";
import { JsonLd, breadcrumbJsonLd, collectionPageJsonLd } from "@/core/seo/json-ld";
import { getGameImageUrl } from "@/core/lib/get-image-url";

/** ListDiscoverView'in varsayilan sayfa boyutuyla AYNI olmali. */
const FIRST_PAGE_SIZE = 12;

type Props = {
    params?: Promise<{ locale?: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const locale = await resolveLocaleFromParams(params);

    return buildPageMetadata({
        locale,
        path: "/lists",
        title: seoCopy(locale, "listsTitle"),
        description: seoCopy(locale, "listsDescription"),
    });
}

/** Listeleri Kesfet. Filtresiz ilk sayfa sunucuda (anonim) cekilir; gerisi istemcide. */
export default async function ListsPage({ params, searchParams }: Props) {
    const locale = await resolveLocaleFromParams(params);
    const hasQuery = Object.keys(await searchParams).length > 0;
    const firstPage = hasQuery ? null : (await getPublicListsFirstPageServer(FIRST_PAGE_SIZE)).data;
    const messages = getMessages(locale);

    return (
        <>
            {firstPage ? (
                <JsonLd
                    data={[
                        collectionPageJsonLd({
                            locale,
                            path: "/lists",
                            name: seoCopy(locale, "listsTitle"),
                            description: seoCopy(locale, "listsDescription"),
                            items: firstPage.items.map((list) => ({
                                name: list.name,
                                path: `/lists/${list.id}`,
                                image: getGameImageUrl(list.firstGameImageUrls?.[0], 640) ?? null,
                            })),
                        }),
                        breadcrumbJsonLd(locale, [
                            { name: translate(messages, "nav.home"), path: "/" },
                            { name: translate(messages, "nav.lists"), path: "/lists" },
                        ]),
                    ]}
                />
            ) : null}
            <ListDiscoverView initialFirstPage={firstPage} />
        </>
    );
}
