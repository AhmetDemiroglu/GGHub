"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Bell, Check, Compass, Link2, ListChecks, X, type LucideIcon } from "lucide-react";
import { Dialog, DialogOverlay, DialogPortal } from "@/core/components/ui/dialog";
import { QrCode } from "@/core/components/other/qr-code";
import { useI18n } from "@/core/contexts/locale-context";
import { cn } from "@/core/lib/utils";
import { APP_STORE_URL, GOOGLE_PLAY_URL } from "@/core/lib/store-links";

export type MobilePlatform = "ios" | "android";

/*
 * Magaza logolari, 24x24 viewBox. QR'in ortasinda ve sekme dugmelerinde kullaniliyor.
 * Kaynak: Simple Icons (CC0). luuq-coffee / camkiran penceresiyle ayni.
 */
const APPLE_PATH =
    "M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701";

const APPLE_LOGO = <path fill="#000000" d={APPLE_PATH} />;

const PLAY_LOGO = (
    <>
        <path fill="#4285F4" d="M1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924z" />
        <path fill="#34A853" d="M13.544 10.989l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973z" />
        <path fill="#EA4335" d="M13.544 13.056l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
        <path fill="#FBBC04" d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594z" />
    </>
);

/** QR renkleri SABIT: koyu temada da beyaz zemin + koyu modul (ters QR'i bazi kameralar okumuyor). */
const QR_DARK = "#0b0f1a";
const QR_EYE = "#6d28d9";

const TAB_ORDER: MobilePlatform[] = ["ios", "android"];

interface PlatformInfo {
    tab: string;
    store: string;
    url: string | null;
    logo: ReactNode;
    requirement: string;
}

const PLATFORMS: Record<MobilePlatform, PlatformInfo> = {
    ios: { tab: "iPhone", store: "App Store", url: APP_STORE_URL, logo: APPLE_LOGO, requirement: "iOS 15.1+" },
    android: { tab: "Android", store: "Google Play", url: GOOGLE_PLAY_URL, logo: PLAY_LOGO, requirement: "Android 7.0+" },
};

/**
 * Telefonda QR anlamsiz (kendi ekranini okutamaz): dokunulan magazaya dogrudan gidilir.
 * iPadOS masaustu UA'si "Macintosh" der; dokunmatik nokta sayisiyla ayrilir.
 */
export function isPhoneOrTablet() {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    if (/Android|iPhone|iPad|iPod/i.test(ua)) return true;
    return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

const PlatformGlyph = ({ platform, className }: { platform: MobilePlatform; className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
        {platform === "ios" ? <path fill="currentColor" d={APPLE_PATH} /> : PLAY_LOGO}
    </svg>
);

/** QR kartinin koselerindeki vizor cizgileri: "bunu okut" isareti. */
const ScanCorners = () => (
    <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -inset-2 h-[calc(100%+1rem)] w-[calc(100%+1rem)] text-violet-500"
        aria-hidden="true"
    >
        {[0, 90, 180, 270].map((angle) => (
            <path
                key={angle}
                d="M1 9V5a4 4 0 0 1 4-4h4"
                transform={`rotate(${angle} 50 50)`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
            />
        ))}
    </svg>
);

const CopyLinkButton = ({ url }: { url: string }) => {
    const t = useI18n();
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return;
        const timer = window.setTimeout(() => setCopied(false), 2000);
        return () => window.clearTimeout(timer);
    }, [copied]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
        } catch {
            window.open(url, "_blank", "noopener,noreferrer");
        }
    };

    return (
        <button
            type="button"
            onClick={copy}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Link2 className="size-3.5" />}
            {copied ? t("mobileApp.copied") : t("mobileApp.copyLink")}
        </button>
    );
};

const DialogBody = ({ initial }: { initial: MobilePlatform }) => {
    const t = useI18n();
    const [platform, setPlatform] = useState<MobilePlatform>(initial);
    const info = PLATFORMS[platform];

    const features: { icon: LucideIcon; title: string; text: string }[] = [
        { icon: Compass, title: t("mobileApp.feature1Title"), text: t("mobileApp.feature1Text") },
        { icon: ListChecks, title: t("mobileApp.feature2Title"), text: t("mobileApp.feature2Text") },
        { icon: Bell, title: t("mobileApp.feature3Title"), text: t("mobileApp.feature3Text") },
    ];
    const steps = [t("mobileApp.step1"), t("mobileApp.step2"), t("mobileApp.step3")];

    return (
        <div className="grid sm:grid-cols-[minmax(0,1fr)_300px]">
            <section className="relative flex flex-col p-6 sm:p-7">
                <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-64 rounded-full bg-violet-500 opacity-[0.12] blur-3xl" />

                <div className="relative flex items-center gap-4">
                    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-[#080910] shadow-md ring-1 ring-white/10">
                        <Image src="/icon-192.png" alt="" width={52} height={52} className="h-[52px] w-[52px] object-contain" />
                    </div>
                    <div className="min-w-0 pr-8 sm:pr-0">
                        <DialogPrimitive.Title className="text-lg font-bold leading-tight text-foreground">GGHub</DialogPrimitive.Title>
                        <p className="mt-0.5 text-sm text-muted-foreground">{t("mobileApp.subtitle")}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400">{t("mobileApp.free")}</span>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{t("mobileApp.platforms")}</span>
                        </div>
                    </div>
                </div>

                <DialogPrimitive.Description className="relative mt-5 text-sm leading-relaxed text-foreground/80">
                    {t("mobileApp.description")}
                </DialogPrimitive.Description>

                <ul className="relative mb-5 mt-5 space-y-3.5">
                    {features.map((feature) => (
                        <li key={feature.title} className="flex items-start gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
                                <feature.icon className="size-[18px]" />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold text-foreground">{feature.title}</span>
                                <span className="block text-xs leading-relaxed text-muted-foreground">{feature.text}</span>
                            </span>
                        </li>
                    ))}
                </ul>

                <ol className="relative mt-auto grid grid-cols-3 gap-2 rounded-xl bg-muted/60 px-3 py-3.5">
                    <span aria-hidden className="absolute left-[16.66%] right-[16.66%] top-[26px] h-px bg-border" />
                    {steps.map((step, index) => (
                        <li key={step} className="relative flex flex-col items-center text-center">
                            <span className="flex size-6 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white ring-4 ring-muted">
                                {index + 1}
                            </span>
                            <span className="mt-1.5 text-xs font-medium leading-snug text-foreground/80">{step}</span>
                        </li>
                    ))}
                </ol>
            </section>

            <section className="flex flex-col items-center border-t border-border bg-muted/40 px-6 pb-6 pt-5 sm:border-l sm:border-t-0">
                <p className="mb-3 w-full pr-8 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground max-sm:hidden">
                    {t("mobileApp.install")}
                </p>

                <div role="tablist" aria-label={t("mobileApp.phoneType")} className="grid w-full grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                    {TAB_ORDER.map((key) => {
                        const active = key === platform;
                        return (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setPlatform(key)}
                                className={cn(
                                    "flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all",
                                    active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                <PlatformGlyph platform={key} className="size-4" />
                                {PLATFORMS[key].tab}
                            </button>
                        );
                    })}
                </div>

                {info.url ? (
                    <>
                        <div key={platform} className="mt-6 flex flex-col items-center duration-300 animate-in fade-in-0 slide-in-from-bottom-2">
                            <div className="relative">
                                <ScanCorners />
                                <div className="rounded-2xl bg-white p-2 shadow-lg ring-1 ring-black/5">
                                    <QrCode
                                        value={info.url}
                                        label={t("mobileApp.qrLabel", { store: info.store })}
                                        logo={info.logo}
                                        darkColor={QR_DARK}
                                        eyeColor={QR_EYE}
                                        className="size-[184px]"
                                    />
                                </div>
                            </div>
                            <p className="mt-5 text-sm font-semibold text-foreground">{t("mobileApp.scan")}</p>
                            <p className="mt-1 text-center text-xs leading-relaxed text-muted-foreground">
                                {t("mobileApp.opensStore", { store: info.store })}
                                <br />
                                {info.requirement}
                            </p>
                        </div>

                        <div className="mt-5 flex w-full items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            <span className="h-px flex-1 bg-border" />
                            {t("mobileApp.or")}
                            <span className="h-px flex-1 bg-border" />
                        </div>

                        <a
                            href={info.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border/60 bg-black/80 px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                        >
                            <PlatformGlyph platform={platform} className={cn("size-4", platform === "ios" && "text-white")} />
                            {t("mobileApp.openStore", { store: info.store })}
                        </a>
                        <div className="mt-2">
                            <CopyLinkButton url={info.url} />
                        </div>
                    </>
                ) : (
                    <div className="mt-8 flex flex-col items-center py-10 text-center">
                        <PlatformGlyph platform={platform} className="size-10 text-muted-foreground opacity-50" />
                        <p className="mt-4 text-sm font-semibold text-foreground">{t("common.soon")}</p>
                    </div>
                )}
            </section>
        </div>
    );
};

/**
 * Mobil uygulama indirme penceresi (QR). Masaustundeki kullanici QR'i telefonuyla okutur;
 * telefonda bu pencere acilmaz, StoreButtons dogrudan magazaya gider (isPhoneOrTablet).
 * `platform` null ise kapali. Tasarim luuq-coffee / camkiran penceresiyle ayni.
 */
export function MobileAppDialog({ platform, onClose }: { platform: MobilePlatform | null; onClose: () => void }) {
    const t = useI18n();
    const contentRef = useRef<HTMLDivElement>(null);
    const [shown, setShown] = useState<MobilePlatform>(platform ?? "ios");
    useEffect(() => {
        if (platform) setShown(platform);
    }, [platform]);

    return (
        <Dialog open={platform !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogPortal>
                <DialogOverlay className="grid place-items-center overflow-y-auto bg-black/50 p-4 backdrop-blur-[2px]">
                    <DialogPrimitive.Content
                        ref={contentRef}
                        tabIndex={-1}
                        onOpenAutoFocus={(event) => {
                            event.preventDefault();
                            contentRef.current?.focus();
                        }}
                        className={cn(
                            "relative w-[min(720px,100%)] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl outline-none",
                            "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
                            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
                        )}
                    >
                        <DialogPrimitive.Close
                            aria-label={t("common.close")}
                            className="absolute right-3 top-3 z-10 cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <X className="size-5" />
                        </DialogPrimitive.Close>
                        <DialogBody key={shown} initial={shown} />
                    </DialogPrimitive.Content>
                </DialogOverlay>
            </DialogPortal>
        </Dialog>
    );
}
