import { AgendaView } from "@/core/components/other/agenda/agenda-view";
import { getAgendaServer } from "@/api/agenda/agenda.server";
import { resolveLocaleFromCookies } from "@/i18n/server";
import { AppLocale, isLocale } from "@/i18n/config";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Oyun Gündemi - GGHub",
    description: "Bu ay çıkan ve çıkacak oyunlar. Yıl ve ay seçerek oyun takvimini keşfedin.",
};

/**
 * Oyun Gündemi sayfası. İlk ay sunucuda çekilir (SEO + hızlı ilk boya);
 * ay/yıl değişimleri istemcide react-query ile yapılır.
 */
export default async function AgendaPage({ params }: { params?: Promise<{ locale?: string }> }) {
    const routeLocale = (await params)?.locale;
    const locale: AppLocale = routeLocale && isLocale(routeLocale) ? routeLocale : await resolveLocaleFromCookies();

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const initialContent = await getAgendaServer(locale, year, month);

    return (
        <div className="container mx-auto max-w-[1600px] p-4 md:p-6">
            <AgendaView initialContent={initialContent} initialYear={year} initialMonth={month} />
        </div>
    );
}
