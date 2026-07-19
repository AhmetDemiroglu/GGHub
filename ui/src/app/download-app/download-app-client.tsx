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
 * The page shows both languages at once (English as the primary line and Turkish
 * as a smaller subtitle beneath it) because the screen is only on-view for a few
 * seconds before redirecting, so a language switch would never be used. The shared
 * OG/Twitter card is wired up server-side in page.tsx.
 */

const AUTO_REDIRECT_SECONDS = 5;

export default function DownloadAppClient() {
    const [target, setTarget] = useState<string | null>(null);
    const [seconds, setSeconds] = useState(AUTO_REDIRECT_SECONDS);
    const [cancelled, setCancelled] = useState(false);

    // Detect OS once, on the client, to pick the auto-redirect target.
    useEffect(() => {
        const ua = navigator.userAgent || "";
        const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        const isAndroid = /Android/.test(ua);

        if (isIOS && APP_STORE_URL) {
            setTarget(APP_STORE_URL);
        } else if (isAndroid && GOOGLE_PLAY_URL) {
            setTarget(GOOGLE_PLAY_URL);
        }
    }, []);

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

    const storeName = target === GOOGLE_PLAY_URL ? "Google Play" : "App Store";
    const isRedirecting = !!target && !cancelled;
    const progress = Math.max(0, Math.min(1, seconds / AUTO_REDIRECT_SECONDS));
    const n = Math.max(seconds, 0);

    return (
        <main className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#0a0b14] px-4 py-6 text-white">
            {/* Brand glows */}
            <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-600/25 blur-3xl" />

            <div className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center shadow-2xl backdrop-blur sm:p-8">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/20 to-violet-600/25 sm:h-20 sm:w-20">
                    <Image src={logoSrc} alt="GGHub" width={64} height={64} className="h-14 w-14 object-contain sm:h-16 sm:w-16" />
                </div>
                <h1 className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-3xl font-black tracking-tight text-transparent">GGHub</h1>

                {/* Bilingual tagline: English primary, Turkish subtitle */}
                <p className="mx-auto mt-3 max-w-xs text-[15px] font-medium leading-snug text-white/85">
                    The social platform for gamers: discover, rate, build lists and connect.
                </p>
                <p className="mx-auto mt-1.5 max-w-xs text-xs leading-snug text-white/45">
                    Oyuncuların sosyal platformu: keşfet, puanla, liste oluştur ve topluluğa katıl.
                </p>

                {/* Redirect notice + countdown (only when a matching store exists for this device) */}
                {isRedirecting ? (
                    <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] px-4 py-3.5 text-left">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-white">Taking you to the {storeName}…</p>
                                <p className="mt-0.5 text-xs text-white/55">Seni {storeName}&apos;a yönlendiriyoruz…</p>
                            </div>
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-base font-bold tabular-nums text-cyan-300">
                                {n}
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
                            Cancel · İptal et
                        </button>
                    </div>
                ) : null}

                <div className="mt-6 flex flex-col gap-3">
                    <StoreButton icon={<AppleLogo className="h-5 w-5" />} label="App Store" href={APP_STORE_URL} />
                    {GOOGLE_PLAY_URL ? (
                        <StoreButton icon={<Play className="h-5 w-5" />} label="Google Play" href={GOOGLE_PLAY_URL} />
                    ) : (
                        <StoreButton icon={<Play className="h-5 w-5" />} label="Google Play" soon="Soon" />
                    )}
                </div>

                {!isRedirecting ? (
                    <>
                        <p className="mt-5 text-xs font-medium text-white/60">
                            {GOOGLE_PLAY_URL ? "Choose your store" : "The Android version is coming soon to Google Play."}
                        </p>
                        <p className="mt-1 text-xs text-white/40">
                            {GOOGLE_PLAY_URL ? "Mağazanı seç" : "Android sürümü çok yakında Google Play'de."}
                        </p>
                    </>
                ) : null}

                <a
                    href="https://gghub.social"
                    className="mt-4 inline-block text-xs font-medium text-cyan-400 underline-offset-4 transition-colors hover:text-cyan-300 hover:underline"
                >
                    Open the web version · Web sürümünü aç
                </a>
            </div>
        </main>
    );
}
