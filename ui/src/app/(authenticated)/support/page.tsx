import { SupportView } from "@/core/components/other/public/support-view";
import { staticPageMetadata } from "@/core/seo/page-metadata";
import { SUPPORT_COPY } from "@/core/components/other/public/support-copy";
import { resolveLocaleFromParams } from "@/i18n/server";
import { JsonLd, faqJsonLd } from "@/core/seo/json-ld";

export const generateMetadata = staticPageMetadata("/support", "support");

export default async function SupportPage({ params }: { params?: Promise<{ locale?: string }> }) {
    const locale = await resolveLocaleFromParams(params);
    const faqs = SUPPORT_COPY[locale].faqs;

    return (
        <>
            {/* FAQPage: Google SSS zengin sonucu; yapay zeka aramalari 'GGHub nedir?' cevabini buradan alir. */}
            <JsonLd data={faqJsonLd(faqs.map((item) => ({ question: item.q, answer: item.a })))} />
            <SupportView />
        </>
    );
}
