"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { APP_STORE_URL, GOOGLE_PLAY_URL } from "@/core/lib/store-links";
import { AppleLogo, StoreButton } from "@/core/components/other/public/store-buttons";
import logoSrc from "@core/assets/logo.png";

/**
 * Standalone, shareable landing page (gghub.social/download-app).
 * Detects the visitor's OS and auto-redirects to the matching store after a
 * short, clearly-announced countdown; otherwise shows both store buttons. Lives
 * outside the locale routing (see middleware bypass) so the URL stays clean for
 * Instagram / social bios.
 *
 * Language: `?lang` (if present) wins, else the browser locale decides the
 * initial language, and a visible EN/TR toggle lets the visitor switch. The
 * shared OG/Twitter card is wired up server-side in page.tsx.
 */

const AUTO_REDIRECT_SECONDS = 5;

const COPY = {
    tr: {
        tagline: "Oyuncuların sosyal platformu. Oyunları keşfet, puanla, listeler oluştur ve topluluğa katıl.",
        redirectTitle: (store: string) => `${store}'a yönlendiriliyorsun`,
        redirectBody: (n: number, store: string) => `${n} saniye içinde ${store}'a gideceksin.`,
        goNow: "Şimdi git",
        cancel: "İptal et",
        choose: "Mağazanı seç",
        androidSoon: "Android sürümü çok yakında Google Play'de.",
        soon: "Yakında",
        openWeb: "Web sürümünü aç",
    },
    en: {
        tagline: "The social platform for gamers. Discover games, rate them, build lists and join the community.",
        redirectTitle: (store: string) => `Redirecting you to the ${store}`,
        redirectBody: (n: number, store: string) => `Taking you to the ${store} in ${n} second${n === 1 ? "" : "s"}.`,
        goNow: "Go now",
        cancel: "Cancel",
        choose: "Choose your store",
        androidSoon: "The Android version is coming very soon to Google Play.",
        soon: "Soon",
        openWeb: "Open the web version",
    },
} as const;

type Lang = "tr" | "en";

export default function DownloadAppClient({ langParam }: { langParam?: Lang }) {
    const [lang, setLang] = useState<Lang>(langParam ?? "en");
    const [target, setTarget] = useState<string | null>(null);
    const [seconds, setSeconds] = useState(AUTO_REDIRECT_SECONDS);
    const [cancelled, setCancelled] = useState(false);

    // Detect language (unless forced via ?lang) + OS once, on the client.
    useEffect(() => {
        if (!langParam) {
            const nav = navigator.language?.toLowerCase() ?? "en";
            setLang(nav.startsWith("tr") ? "tr" : "en");
        }

        const ua = navigator.userAgent || "";
        const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        const isAndroid = /Android/.test(ua);

        if (isIOS && APP_STORE_URL) {
            setTarget(APP_STORE_URL);
        } else if (isAndroid && GOOGLE_PLAY_URL) {
            setTarget(GOOGLE_PLAY_URL);
        }
    }, [langParam]);

    // Countdown + redirect when a matching store exists for this device.
    useEffect(() => {
        if (!target || cancelled) return;
        if (seconds <= 0) {
            window.location.href = target;
            return;
        }
        const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
        return () => clearTimeout(id);
    }, [target, seconds, cancelled]);

    const t = COPY[lang];
    const storeName = target === GOOGLE_PLAY_URL ? "Google Play" : "App Store";
    const isRedirecting = !!target && !cancelled;
    const progress = Math.max(0, Math.min(1, seconds / AUTO_REDIRECT_SECONDS));

    return (
        <main className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#0a0b14] px-4 py-6 text-white">
            {/* Brand glows */}
            <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-600/25 blur-3xl" />

            <div className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center shadow-2xl backdrop-blur sm:p-8">
                {/* Language toggle */}
                <div className="mb-5 flex justify-center">
                    <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-0.5 text-xs font-semibold">
                        {(["tr", "en"] as const).map((l) => (
                            <button
                                key={l}
                                type="button"
                                onClick={() => setLang(l)}
                                aria-pressed={lang === l}
                                className={
                                    lang === l
                                        ? "rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-3.5 py-1 text-white shadow"
                                        : "rounded-full px-3.5 py-1 text-white/55 transition-colors hover:text-white/80"
                                }
                            >
                                {l.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/20 to-violet-600/25 sm:h-20 sm:w-20">
                    <Image src={logoSrc} alt="GGHub" width={64} height={64} className="h-14 w-14 object-contain sm:h-16 sm:w-16" />
                </div>
                <h1 className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-3xl font-black tracking-tight text-transparent">GGHub</h1>
                <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/70">{t.tagline}</p>

                {/* Redirect notice + countdown (only when a matching store exists for this device) */}
                {isRedirecting ? (
                    <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] px-4 py-3.5 text-left">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-white">{t.redirectTitle(storeName)}</p>
                                <p className="mt-0.5 text-xs text-white/60">{t.redirectBody(Math.max(seconds, 0), storeName)}</p>
                            </div>
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-base font-bold tabular-nums text-cyan-300">
                                {Math.max(seconds, 0)}
                            </div>
                        </div>
                        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 transition-[width] duration-1000 ease-linear"
                                style={{ width: `${progress * 100}%` }}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setCancelled(true)}
                            className="mt-2.5 text-xs font-medium text-white/45 underline-offset-4 transition-colors hover:text-white/70 hover:underline"
                        >
                            {t.cancel}
                        </button>
                    </div>
                ) : null}

                <div className="mt-6 flex flex-col gap-3">
                    <StoreButton
                        icon={<AppleLogo className="h-5 w-5" />}
                        label={isRedirecting ? t.goNow : "App Store"}
                        href={APP_STORE_URL}
                    />
                    {GOOGLE_PLAY_URL ? (
                        <StoreButton icon={<Play className="h-5 w-5" />} label="Google Play" href={GOOGLE_PLAY_URL} />
                    ) : (
                        <StoreButton icon={<Play className="h-5 w-5" />} label="Google Play" soon={t.soon} />
                    )}
                </div>

                {!isRedirecting ? (
                    <p className="mt-5 text-xs text-white/50">{!GOOGLE_PLAY_URL ? t.androidSoon : t.choose}</p>
                ) : null}

                <a
                    href="https://gghub.social"
                    className="mt-4 inline-block text-xs font-medium text-cyan-400 underline-offset-4 transition-colors hover:text-cyan-300 hover:underline"
                >
                    {t.openWeb}
                </a>
            </div>
        </main>
    );
}
