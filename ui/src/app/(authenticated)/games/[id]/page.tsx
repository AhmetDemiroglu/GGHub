import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameDetailView } from "@/core/components/other/game-detail/game-detail-view";
import { getGameReviewsServer, getGameServer } from "@/api/gaming/game.server";
import { getMessages, translate } from "@/i18n";
import { resolveLocaleFromParams } from "@/i18n/server";
import { seoCopy } from "@/core/seo/copy";
import { buildPageMetadata } from "@/core/seo/metadata";
import { JsonLd, breadcrumbJsonLd, videoGameJsonLd } from "@/core/seo/json-ld";
import { toDescription } from "@/core/seo/text";
import { getGameImageUrl } from "@/core/lib/get-image-url";

/**
 * Oyun detayi. Icerik SUNUCUDA cekilir ve HTML'e gomulur; onceden sayfa bos bir kabuk gelip
 * istemcide dolduruluyordu, JS calistirmayan yapay zeka tarayicilari (GPTBot, ClaudeBot,
 * PerplexityBot) sayfayi bos goruyordu. Ayni veri GameDetailView'a initialData olarak gecer,
 * istemci ikinci bir istek atmaz.
 *
 * `params.locale` yalnizca [locale] agacinda dolu; koksuz agacta dil basliktan/cerezden cozulur.
 */
type Props = { params: Promise<{ id: string; locale?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const locale = await resolveLocaleFromParams(params);
    const { data: game, status } = await getGameServer(id);

    if (!game) {
        if (status === 404) {
            // generateMetadata icinde notFound(): govde akisa girmeden once atilir, yanit GERCEK 404 olur.
            // Sayfa govdesinde atilsaydi (authenticated)/loading.tsx kabugu 200 ile coktan gonderilmis olurdu (soft 404).
            notFound();
        }
        // Gecici API hatasi: istemci yukleyecek; yanlis bir canonical/noindex yazmaktansa kok varsayilanlari kalsin.
        return { title: seoCopy(locale, "siteTitle") };
    }

    const localizedDescription = toDescription(locale === "tr" ? game.descriptionTr || game.description : game.description || game.descriptionTr, 160);
    const image = getGameImageUrl(game.backgroundImage, 1280);

    return buildPageMetadata({
        locale,
        // Kanonik her zaman slug'li URL: ayni oyun /games/3498 ile de acilir, ikisi tek adrese baglanir.
        path: `/games/${game.slug || id}`,
        title: seoCopy(locale, "gameTitle", { name: game.name }),
        description: localizedDescription || seoCopy(locale, "gameDescription", { name: game.name }),
        image: image ? { url: image, alt: game.name } : null,
    });
}

export default async function Page({ params }: Props) {
    const { id } = await params;
    const locale = await resolveLocaleFromParams(params);
    const { data: game, status } = await getGameServer(id);

    // generateMetadata zaten 404'te notFound() atti; burasi yalniz dogrudan render icin guvence.
    if (!game && status === 404) {
        notFound();
    }

    const reviews = game ? (await getGameReviewsServer(game.rawgId)).data : null;
    const messages = getMessages(locale);

    return (
        <>
            {game ? (
                <JsonLd
                    data={[
                        videoGameJsonLd(game, locale, reviews ?? []),
                        breadcrumbJsonLd(locale, [
                            { name: translate(messages, "nav.home"), path: "/" },
                            { name: translate(messages, "nav.discover"), path: "/discover" },
                            { name: game.name, path: `/games/${game.slug || id}` },
                        ]),
                    ]}
                />
            ) : null}
            <GameDetailView idOrSlug={id} initialGame={game} initialReviews={reviews} />
        </>
    );
}
