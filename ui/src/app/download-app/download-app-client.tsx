"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { APP_STORE_URL, GOOGLE_PLAY_URL } from "@/core/lib/store-links";
import { AppleLogo, StoreButton } from "@/core/components/other/public/store-buttons";
import logoSrc from "@core/assets/logo.png";

/**
 * Standalone, shareable landing page (gghub.social/download-app).
 * Detects the visitor's OS and auto-redirects to the matching store; otherwise
 * shows both store buttons. Lives outside the locale routing (see middleware
 * bypass) so the URL stays clean for Instagram / social bios.
 *
 * `langParam` (from ?lang) overrides the language; otherwise the browser locale
 * decides. The shared OG/Twitter card is wired up server-side in page.tsx.
 */

const AUTO_REDIRECT_SECONDS = 3;

const COPY = {
    tr: {
        tagline: "Oyuncuların sosyal platformu. Oyunları keşfet, puanla, listeler oluştur ve topluluğa katıl.",
        redirecting: "App Store'a yönlendiriliyorsun…",
        choose: "Mağazanı seç",
        androidSoon: "Android sürümü çok yakında Google Play'de.",
        soon: "Yakında",
        openWeb: "Web sürümünü aç",
    },
    en: {
        tagline: "The social platform for gamers. Discover games, rate them, build lists and join the community.",
        redirecting: "Redirecting you to the App Store…",
        choose: "Choose your store",
        androidSoon: "The Android version is coming very soon to Google Play.",
        soon: "Soon",
        openWeb: "Open the web version",
    },
} as const;

export default function DownloadAppClient({ langParam }: { langParam?: "tr" | "en" }) {
    const [lang, setLang] = useState<"tr" | "en">(langParam ?? "en");
    const [target, setTarget] = useState<string | null>(null);
    const [seconds, setSeconds] = useState(AUTO_REDIRECT_SECONDS);

    // Detect language (unless forced via ?lang) + OS once, on the client.
    useEffect(() => {
        if (langParam) {
            setLang(langParam);
        } else {
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
        if (!target) return;
        if (seconds <= 0) {
            window.location.href = target;
            return;
        }
        const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
        return () => clearTimeout(id);
    }, [target, seconds]);

    const t = COPY[lang];

    return (
        <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0a0b14] px-5 py-10 text-white">
            {/* Brand glows */}
            <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-violet-600/25 blur-3xl" />

            <div className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center shadow-2xl backdrop-blur">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/20 to-violet-600/25">
                    <Image src={logoSrc} alt="GGHub" width={64} height={64} className="object-contain" />
                </div>
                <h1 className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-3xl font-black tracking-tight text-transparent">GGHub</h1>
                <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/70">{t.tagline}</p>

                <div className="mt-7 flex flex-col gap-3">
                    <StoreButton icon={<AppleLogo className="h-5 w-5" />} label="App Store" href={APP_STORE_URL} />
                    {GOOGLE_PLAY_URL ? (
                        <StoreButton icon={<Play className="h-5 w-5" />} label="Google Play" href={GOOGLE_PLAY_URL} />
                    ) : (
                        <StoreButton icon={<Play className="h-5 w-5" />} label="Google Play" soon={t.soon} />
                    )}
                </div>

                <p className="mt-5 text-xs text-white/50">{target ? t.redirecting : !GOOGLE_PLAY_URL ? t.androidSoon : t.choose}</p>

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
