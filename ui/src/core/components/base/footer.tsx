"use client";

import Image from "next/image";
import Link from "next/link";
import { Mail } from "lucide-react";
import { The_Girl_Next_Door } from "next/font/google";
import { FaInstagram, FaXTwitter } from "react-icons/fa6";
import logoSrc2 from "@core/assets/logo2.png";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";

const font = The_Girl_Next_Door({
    subsets: ["latin"],
    weight: ["400"],
});

export function Footer() {
    const t = useI18n();
    const locale = useCurrentLocale();

    return (
        <footer className="mt-auto border-t bg-background">
            <div className="h-full w-full">
                <div className="space-y-4">
                    <div className="mx-auto max-w-7xl px-6 pb-6 pt-10 md:px-8 lg:px-0">
                        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex max-w-sm flex-col gap-4">
                                <Link href={buildLocalizedPathname("/", locale)} className="group flex w-fit cursor-pointer items-center gap-2.5">
                                    <Image src={logoSrc2} alt="GGHub logo" width={100} className="transition-transform group-hover:scale-105" />
                                </Link>
                                <p className={`text-lg font-medium tracking-tight text-foreground/40 ${font.className}`}>{t("footer.tagline")}</p>
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground/30">{t("footer.version")}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-10 md:gap-14 lg:gap-16">
                                <div className="flex flex-col gap-3">
                                    <h3 className="text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground/60">{t("footer.company")}</h3>
                                    <div className="flex flex-col gap-2.5">
                                        <Link href={buildLocalizedPathname("/about", locale)} className="w-fit text-sm text-foreground/80 transition-colors hover:text-primary">
                                            {t("footer.about")}
                                        </Link>
                                        <Link href={buildLocalizedPathname("/privacy", locale)} className="w-fit text-sm text-foreground/80 transition-colors hover:text-primary">
                                            {t("footer.privacy")}
                                        </Link>
                                        <Link href={buildLocalizedPathname("/terms", locale)} className="w-fit text-sm text-foreground/80 transition-colors hover:text-primary">
                                            {t("footer.terms")}
                                        </Link>
                                        <a
                                            href="mailto:info@gghub.social"
                                            title="info@gghub.social"
                                            className="inline-flex w-fit items-center gap-1.5 text-sm text-foreground/80 transition-colors hover:text-primary"
                                        >
                                            <Mail className="h-3.5 w-3.5" />
                                            {t("footer.contact")}
                                        </a>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <h3 className="text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground/60">{t("footer.community")}</h3>
                                    <div className="flex gap-3">
                                        <a
                                            href="https://x.com/gghub_tr"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="rounded-lg border border-border/20 bg-muted/40 p-2.5 transition-colors hover:bg-muted/70"
                                            aria-label={t("footer.socialX")}
                                        >
                                            <FaXTwitter className="h-4 w-4" />
                                        </a>
                                        <button
                                            disabled
                                            className="cursor-not-allowed rounded-lg border border-border/20 bg-muted/40 p-2.5 opacity-60 transition-colors hover:bg-muted/70"
                                            title={t("footer.instagramSoon")}
                                        >
                                            <FaInstagram className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-border/40">
                        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 pt-4 md:flex-row md:px-8 lg:px-0">
                            <p className="text-center text-xs text-muted-foreground/60 md:text-left">{t("footer.copyright")}</p>
                            <p className="text-[11px] text-muted-foreground/40">{t("footer.madeForPlayers")}</p>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
