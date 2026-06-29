"use client";

import { Mail, ArrowUpRight } from "lucide-react";
import { useCurrentLocale } from "@/core/contexts/locale-context";
import { StoreButtons } from "@/core/components/other/public/store-buttons";

const COPY = {
    "en-US": {
        downloadTitle: "Download the app",
        downloadDesc: "GGHub is live on the App Store. The Android version is coming very soon to Google Play.",
        contactTitle: "Get in touch",
        contactDesc: "Write to us with questions, feedback, or collaboration ideas.",
        soon: "Soon",
    },
    tr: {
        downloadTitle: "Uygulamayı indir",
        downloadDesc: "GGHub App Store'da yayında. Android sürümü çok yakında Google Play'de.",
        contactTitle: "İletişime geç",
        contactDesc: "Soruların, geri bildirimin veya iş birliği için bize yaz.",
        soon: "Yakında",
    },
} as const;

/**
 * Shared "download the app + contact" block used across the public legal/marketing pages.
 * App Store is live; Google Play shows a "Soon" badge until the listing is approved.
 */
export function AppDownloadCTA() {
    const locale = useCurrentLocale();
    const t = COPY[locale] ?? COPY["en-US"];

    return (
        <section className="mt-10 grid gap-4 md:grid-cols-2">
            {/* Download card */}
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/70 p-6">
                <div
                    aria-hidden
                    className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 blur-2xl"
                />
                <h3 className="text-lg font-semibold tracking-tight">{t.downloadTitle}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.downloadDesc}</p>
                <StoreButtons soonText={t.soon} className="mt-4" />
            </div>

            {/* Contact card */}
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/70 p-6">
                <div
                    aria-hidden
                    className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 blur-2xl"
                />
                <h3 className="text-lg font-semibold tracking-tight">{t.contactTitle}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.contactDesc}</p>
                <a
                    href="mailto:info@gghub.social"
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-4 py-2.5 text-sm font-medium transition-colors hover:border-cyan-400/60 hover:text-cyan-400"
                >
                    <Mail className="h-4 w-4" />
                    info@gghub.social
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
                </a>
            </div>
        </section>
    );
}
