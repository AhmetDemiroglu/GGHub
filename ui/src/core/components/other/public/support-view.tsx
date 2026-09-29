"use client";

import { LifeBuoy } from "lucide-react";
import { AppDownloadCTA } from "@core/components/other/public/app-cta";
import { useCurrentLocale } from "@/core/contexts/locale-context";
import { SUPPORT_COPY } from "./support-copy";


export function SupportView() {
    const locale = useCurrentLocale();
    const t = SUPPORT_COPY[locale] ?? SUPPORT_COPY["en-US"];

    return (
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
    );
}
