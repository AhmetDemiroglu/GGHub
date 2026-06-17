"use client";

import { Play, Mail, ArrowUpRight } from "lucide-react";
import { useCurrentLocale } from "@/core/contexts/locale-context";

// Official Apple logo (lucide's "Apple" is a fruit, not the brand mark).
function AppleLogo({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 384 512" className={className} fill="currentColor" aria-hidden="true">
            <path d="M318.7 268.7c-.2-36.71 16.41-64.39 49.81-84.78-18.69-26.78-46.97-41.51-84.27-44.38-35.42-2.79-74.18 20.62-88.39 20.62-15.02 0-49.31-19.62-76.27-19.62C63.4 141.51 4 184.81 4 272.83c0 26.01 4.76 52.88 14.28 80.59 12.71 36.41 58.56 125.81 106.39 124.36 25.02-.59 42.71-17.73 75.27-17.73 31.58 0 47.95 17.73 75.85 17.73 48.25-.7 89.74-81.95 101.83-118.46-64.78-30.51-61.21-89.46-61.21-90.21zm-56.65-164.24c27.32-32.42 24.83-61.93 24.02-72.59-24.13 1.4-52.06 16.42-67.97 34.9-17.52 19.82-27.83 44.32-25.61 71.45 26.07 2.01 49.81-11.42 69.56-33.76z" />
        </svg>
    );
}

const COPY = {
    "en-US": {
        downloadTitle: "Download the app",
        downloadDesc: "GGHub is coming soon to iOS and Android. Store links will be right here very soon.",
        contactTitle: "Get in touch",
        contactDesc: "Write to us with questions, feedback, or collaboration ideas.",
        soon: "Soon",
    },
    tr: {
        downloadTitle: "Uygulamayı indir",
        downloadDesc: "GGHub yakında iOS ve Android'de. Mağaza linkleri çok yakında burada.",
        contactTitle: "İletişime geç",
        contactDesc: "Soruların, geri bildirimin veya iş birliği için bize yaz.",
        soon: "Yakında",
    },
} as const;

/**
 * Shared "download the app + contact" block used across the public legal/marketing pages.
 * Store buttons are intentionally passive (apps not yet published), shown with a "Soon" badge.
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
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <StoreButton icon={<AppleLogo className="h-5 w-5" />} label="App Store" soon={t.soon} />
                    <StoreButton icon={<Play className="h-5 w-5" />} label="Google Play" soon={t.soon} />
                </div>
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

function StoreButton({ icon, label, soon }: { icon: React.ReactNode; label: string; soon: string }) {
    return (
        <div className="relative inline-flex flex-1 cursor-default items-center justify-center gap-2.5 rounded-xl border border-border/60 bg-black/80 px-5 py-3 text-white opacity-90">
            {icon}
            <span className="text-sm font-semibold">{label}</span>
            <span className="absolute -right-2 -top-2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                {soon}
            </span>
        </div>
    );
}
