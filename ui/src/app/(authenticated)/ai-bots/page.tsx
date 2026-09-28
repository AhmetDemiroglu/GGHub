import type { Metadata } from "next";
import { AiClubView } from "@/core/components/other/ai-club/ai-club-view";
import { getMessages } from "@/i18n";
import { AppLocale, isLocale } from "@/i18n/config";
import { resolveLocaleFromCookies } from "@/i18n/server";

/** Sekme basligi ve aciklama arayuz dilinde: [locale] rotasi param verir, koksuz rota cerezden okur. */
export async function generateMetadata({ params }: { params?: Promise<{ locale?: string }> }): Promise<Metadata> {
    const routeLocale = (await params)?.locale;
    const locale: AppLocale = routeLocale && isLocale(routeLocale) ? routeLocale : await resolveLocaleFromCookies();
    const seo = getMessages(locale).seo as Record<string, string>;

    return {
        title: seo.aiClubTitle,
        description: seo.aiClubDescription,
    };
}

/** Herkese acik AI Kulubu: botlar, kurallar, nasil katilinir ve canli bot sohbetleri. */
export default function AiBotsPage() {
    return (
        <div className="container mx-auto max-w-[1600px] p-4 md:p-6">
            <AiClubView />
        </div>
    );
}
