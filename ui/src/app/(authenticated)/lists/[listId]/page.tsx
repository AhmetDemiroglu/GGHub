import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListDetailView } from "@/core/components/other/lists/list-detail-view";
import { getListDetailServer } from "@/api/list/list.server";
import { getMessages, translate } from "@/i18n";
import { resolveLocaleFromParams } from "@/i18n/server";
import { seoCopy } from "@/core/seo/copy";
import { buildNotFoundMetadata, buildPageMetadata } from "@/core/seo/metadata";
import { JsonLd, breadcrumbJsonLd, collectionPageJsonLd, personJsonLd } from "@/core/seo/json-ld";
import { displayNameOf, truncate } from "@/core/seo/text";
import { getGameImageUrl } from "@/core/lib/get-image-url";

/**
 * Liste detayi. Herkese acik liste sunucuda anonim cekilir ve HTML'e gomulur; takipcilere
 * ozel/gizli liste sunucuya 401 doner: sayfa noindex kalir, istemci giris yapmis kullanici
 * icin kendi yetkili istegini atar (eski davranis).
 */
type Props = { params: Promise<{ listId: string; locale?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { listId } = await params;
    const locale = await resolveLocaleFromParams(params);
    const id = Number(listId);
    const { data: list, status } = Number.isFinite(id) && id > 0 ? await getListDetailServer(id) : { data: null, status: 404 };

    if (!list) {
        if (status === 404) {
            // generateMetadata icinde notFound(): govde akisa girmeden once atilir, yanit GERCEK 404 olur.
            // Sayfa govdesinde atilsaydi (authenticated)/loading.tsx kabugu 200 ile coktan gonderilmis olurdu (soft 404).
            notFound();
        }
        // 401/403: liste var ama herkese acik degil -> noindex; 0/5xx: gecici hata, kok varsayilanlar kalsin.
        return status === 0 || status >= 500
            ? { title: seoCopy(locale, "siteTitle") }
            : buildNotFoundMetadata(seoCopy(locale, "listNotFoundTitle"), seoCopy(locale, "listNotFoundDescription"));
    }

    const owner = displayNameOf(list.owner);
    const cover = getGameImageUrl(list.games[0]?.backgroundImage ?? list.games[0]?.coverImage, 1280);

    return buildPageMetadata({
        locale,
        path: `/lists/${list.id}`,
        title: seoCopy(locale, "listTitle", { name: list.name, owner }),
        description: list.description ? truncate(list.description, 160) : seoCopy(locale, "listDescription", { owner, count: list.gameCount }),
        image: cover ? { url: cover, alt: list.name } : null,
        type: "article",
        modifiedTime: list.updatedAt,
    });
}

export default async function Page({ params }: Props) {
    const { listId } = await params;
    const locale = await resolveLocaleFromParams(params);
    const id = Number(listId);
    const { data: list, status } = Number.isFinite(id) && id > 0 ? await getListDetailServer(id) : { data: null, status: 404 };

    if (status === 404) {
        notFound();
    }

    const messages = getMessages(locale);

    return (
        <>
            {list ? (
                <JsonLd
                    data={[
                        collectionPageJsonLd({
                            locale,
                            path: `/lists/${list.id}`,
                            name: list.name,
                            description: list.description || seoCopy(locale, "listDescription", { owner: displayNameOf(list.owner), count: list.gameCount }),
                            author: personJsonLd(list.owner, locale),
                            items: list.games.map((game) => ({
                                name: game.name,
                                path: `/games/${game.slug || game.rawgId}`,
                                image: getGameImageUrl(game.backgroundImage ?? game.coverImage, 640) ?? null,
                            })),
                        }),
                        breadcrumbJsonLd(locale, [
                            { name: translate(messages, "nav.home"), path: "/" },
                            { name: translate(messages, "nav.lists"), path: "/lists" },
                            { name: list.name, path: `/lists/${list.id}` },
                        ]),
                    ]}
                />
            ) : null}
            <ListDetailView initialList={list} />
        </>
    );
}
