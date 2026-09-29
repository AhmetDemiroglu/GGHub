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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
        <div className="w-full p-5">
            <div className="flex flex-col items-center gap-4 pt-2 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/15 to-violet-500/15 text-cyan-600 dark:text-cyan-400">
                    <LifeBuoy className="h-8 w-8" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t.title}</h1>
                <p className="max-w-md text-sm text-muted-foreground">{t.subtitle}</p>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-2">
                {t.faqs.map((item) => (
                    <div key={item.q} className="rounded-2xl border border-border/50 bg-card/60 p-5 transition-colors hover:border-border">
                        <h2 className="text-base font-semibold tracking-tight">{item.q}</h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                    </div>
                ))}
            </div>

            <AppDownloadCTA />
        </div>
=======
=======
>>>>>>> origin/claude/admiring-davinci-786hxg
=======
>>>>>>> 46d388f505caa4da61a847d8c5e266a9a28972e7
        <>
            {/* FAQPage: Google SSS zengin sonucu; yapay zeka aramalari 'GGHub nedir?' cevabini buradan alir. */}
            <JsonLd data={faqJsonLd(faqs.map((item) => ({ question: item.q, answer: item.a })))} />
            <SupportView />
        </>
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> origin/claude/admiring-davinci-786hxg
=======
>>>>>>> origin/claude/admiring-davinci-786hxg
=======
>>>>>>> 46d388f505caa4da61a847d8c5e266a9a28972e7
    );
}
