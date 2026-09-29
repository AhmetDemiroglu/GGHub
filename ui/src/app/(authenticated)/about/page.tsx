import { AboutView } from "@/core/components/other/public/about-view";
import { staticPageMetadata } from "@/core/seo/page-metadata";
import { resolveLocaleFromParams } from "@/i18n/server";
import { seoCopy } from "@/core/seo/copy";
import { JsonLd, webPageJsonLd } from "@/core/seo/json-ld";

export const generateMetadata = staticPageMetadata("/about", "about");

export default async function AboutPage({ params }: { params?: Promise<{ locale?: string }> }) {
    const locale = await resolveLocaleFromParams(params);

    return (
        <>
            <JsonLd data={webPageJsonLd({ locale, path: "/about", type: "AboutPage", name: seoCopy(locale, "aboutTitle"), description: seoCopy(locale, "aboutDescription") })} />
            <AboutView />
        </>
    );
}
