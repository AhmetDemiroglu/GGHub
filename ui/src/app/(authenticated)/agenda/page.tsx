import type { Metadata } from "next";
import { AgendaView } from "@/core/components/other/agenda/agenda-view";
import { getAgendaServer } from "@/api/agenda/agenda.server";
import { resolveLocaleFromParams } from "@/i18n/server";
import { staticPageMetadata } from "@/core/seo/page-metadata";
import { getMessages, translate } from "@/i18n";
import { seoCopy } from "@/core/seo/copy";
import { JsonLd, breadcrumbJsonLd, collectionPageJsonLd } from "@/core/seo/json-ld";
import { getGameImageUrl } from "@/core/lib/get-image-url";

type Props = { params?: Promise<{ locale?: string }> };

/** Baslik/aciklama arayuz dilinde; eskiden sabit Turkceydi ve canonical/hreflang yoktu. */
export const generateMetadata: (props: Props) => Promise<Metadata> = staticPageMetadata("/agenda", "agenda");

/**
 * Oyun Gündemi sayfası. İlk ay sunucuda çekilir (SEO + hızlı ilk boya);
 * ay/yıl değişimleri istemcide react-query ile yapılır.
 */
export default async function AgendaPage({ params }: Props) {
    const locale = await resolveLocaleFromParams(params);

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const initialContent = await getAgendaServer(locale, year, month);
    const messages = getMessages(locale);
    const games = [...(initialContent?.released ?? []), ...(initialContent?.upcoming ?? [])];

    return (
        <div className="container mx-auto max-w-[1600px] p-4 md:p-6">
            {games.length ? (
                <JsonLd
                    data={[
                        collectionPageJsonLd({
                            locale,
                            path: "/agenda",
                            name: seoCopy(locale, "agendaTitle"),
                            description: seoCopy(locale, "agendaDescription"),
                            items: games.slice(0, 50).map((game) => ({
                                name: game.name,
                                path: `/games/${game.slug || game.rawgId}`,
                                image: getGameImageUrl(game.backgroundImage, 640) ?? null,
                            })),
                        }),
                        breadcrumbJsonLd(locale, [
                            { name: translate(messages, "nav.home"), path: "/" },
                            { name: translate(messages, "nav.agenda"), path: "/agenda" },
                        ]),
                    ]}
                />
            ) : null}
            <AgendaView initialContent={initialContent} initialYear={year} initialMonth={month} />
        </div>
    );
}
