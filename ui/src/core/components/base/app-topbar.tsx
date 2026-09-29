"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import logoSrc from "@core/assets/logo.png";
import { useAuth } from "@core/hooks/use-auth";
import { useI18n } from "@/core/contexts/locale-context";
import { useLocalizedHref } from "@/core/hooks/use-localized-href";
import { cn } from "@/core/lib/utils";
import { SidebarTrigger } from "@/core/components/base/sidebar";
import { GlassSurface } from "@/core/components/base/glass-surface";
import { TopbarSearch } from "@/core/components/base/topbar-search";
import { NotificationsMenu } from "@/core/components/base/notifications-menu";
import { AppDownloadBadge } from "@/core/components/base/app-download-badge";

/** Kaydirma kabinin id'si; layout'taki <main> bunu tasir (pencere degil, main kayar). */
export const APP_SCROLL_ID = "app-main";

// Histerezis: esik etrafinda titremesin. Kopma 44px'te, geri yapisma 8px'te.
const DETACH_AT = 44;
const ATTACH_AT = 8;

interface TopbarMotion {
    /** Cubuk ust kenardan kopmus, kapsul halinde. */
    floating: boolean;
    /** Kopmadan onceki gerilme: 0 (yapisik) .. 1 (kopma esigi). Kaydirmaya kilitli. */
    stretch: number;
    /** Kaydirma kabinin dikey kaydirma cubugu genisligi (px); cubuk onun ustune binmez. */
    scrollbar: number;
}

/**
 * Kaydirma kabini izler. Ilk 44px'te cubuk yapisik kalir ama asagi dogru gerilir (zar gibi);
 * esik asilinca kopar ve kapsule donusur. Geri donus 8px'te: esik etrafinda titreme olmaz.
 */
function useTopbarMotion(): TopbarMotion {
    const pathname = usePathname();
    const [motion, setMotion] = useState<TopbarMotion>({ floating: false, stretch: 0, scrollbar: 0 });

    useEffect(() => {
        const main = document.getElementById(APP_SCROLL_ID);
        if (!main) return;

        let frame = 0;
        const update = () => {
            frame = 0;
            const top = main.scrollTop;
            const scrollbar = main.offsetWidth - main.clientWidth;
            setMotion((current) => {
                const floating = current.floating ? top > ATTACH_AT : top > DETACH_AT;
                const stretch = floating ? 0 : Math.min(top / DETACH_AT, 1);
                if (floating === current.floating && stretch === current.stretch && scrollbar === current.scrollbar) return current;
                return { floating, stretch, scrollbar };
            });
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };

        update();
        main.addEventListener("scroll", schedule, { passive: true });
        // Kaydirma cubugu icerikle gelip gidebilir (kisa sayfa / uzun sayfa).
        const observer = new ResizeObserver(schedule);
        observer.observe(main);
        return () => {
            main.removeEventListener("scroll", schedule);
            observer.disconnect();
            if (frame) cancelAnimationFrame(frame);
        };
    }, [pathname]);

    return motion;
}

/**
 * Ust cubuk. Sayfanin en ustunde duz ve tek parca durur (sidebar yokmus gibi); icerik
 * kaydirilinca once asagi dogru gerilir, sonra ust kenardan kopup cam kapsule donusur
 * (koreografi globals.css: .topbar-shell, ::after zar, .topbar-neck, topbar-snap).
 * Logo, arama, mobil uygulama rozeti ve bildirimler burada; kenar cubugu altindan baslar.
 */
export function AppTopbar() {
    const t = useI18n();
    const localizeHref = useLocalizedHref();
    const pathname = usePathname();
    const { isAuthenticated } = useAuth();
    const { floating, stretch, scrollbar } = useTopbarMotion();
    const [mobileSearch, setMobileSearch] = useState(false);

    // Sayfa degisince mobil arama modu kapanir.
    useEffect(() => setMobileSearch(false), [pathname]);

    return (
        <header
            data-floating={floating}
            style={{ "--stretch": stretch, "--topbar-sb": `${scrollbar}px` } as React.CSSProperties}
            className="pointer-events-none absolute left-0 right-(--topbar-sb) top-0 z-40 h-(--topbar-h)"
        >
            {/* Kopma ani: ust kenarda kalan iz cizgisi ve kapsulu bir an ust kenara baglayan boyun. */}
            <span aria-hidden className="topbar-edge" />
            <span aria-hidden className="topbar-neck" />
            <div className="topbar-shell pointer-events-auto">
                <GlassSurface active={floating} />

                <div className="relative z-10 flex h-full items-center gap-2 px-3 md:gap-4 md:px-4">
                    {mobileSearch ? (
                        /* Mobil arama modu: cubuk tamamen aramaya ayrilir. */
                        <div className="flex w-full items-center gap-1 md:hidden">
                            <button
                                type="button"
                                aria-label={t("topbar.closeSearch")}
                                onClick={() => setMobileSearch(false)}
                                className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                            >
                                <ArrowLeft className="size-5" />
                            </button>
                            <TopbarSearch autoFocus className="min-w-0 flex-1" onClose={() => setMobileSearch(false)} />
                        </div>
                    ) : null}

                    <div className={cn("flex w-full items-center gap-2 md:gap-4", mobileSearch && "hidden md:flex")}>
                        {/* Sol: mobil menu + logo */}
                        <div className="flex shrink-0 items-center gap-1 md:gap-2">
                            <SidebarTrigger />
                            <Link href={localizeHref("/")} aria-label="GGHub" className="flex items-center rounded-md px-1">
                                <Image src={logoSrc} alt="GGHub" width={35} height={22} priority className="h-6 w-auto md:h-7" />
                            </Link>
                        </div>

                        {/* Orta: arama (masaustu) */}
                        <div className="hidden min-w-0 flex-1 justify-center md:flex">
                            <TopbarSearch className="w-full max-w-md" />
                        </div>
                        <div className="flex-1 md:hidden" />

                        {/* Sag: mobil arama, uygulama rozeti, bildirimler */}
                        <div className="flex shrink-0 items-center gap-1 md:gap-2">
                            <button
                                type="button"
                                aria-label={t("topbar.openSearch")}
                                onClick={() => setMobileSearch(true)}
                                className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground md:hidden"
                            >
                                <Search className="size-5" />
                            </button>
                            <AppDownloadBadge />
                            {isAuthenticated ? <NotificationsMenu /> : null}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
