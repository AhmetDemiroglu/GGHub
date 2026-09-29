"use client";

import { useEffect, useState } from "react";
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

// Histerezis: esik etrafinda titremesin. Kopma 40px'te, geri yapisma 8px'te.
const DETACH_AT = 40;
const ATTACH_AT = 8;

/** Kaydirma kabini izler; cubugun "yapisik / kopuk" halini verir. */
function useFloating() {
    const pathname = usePathname();
    const [floating, setFloating] = useState(false);

    useEffect(() => {
        const main = document.getElementById(APP_SCROLL_ID);
        if (!main) return;

        let frame = 0;
        const update = () => {
            frame = 0;
            const top = main.scrollTop;
            setFloating((current) => (current ? top > ATTACH_AT : top > DETACH_AT));
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };

        update();
        main.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            main.removeEventListener("scroll", onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, [pathname]);

    return floating;
}

/**
 * Ust cubuk. Sayfanin en ustunde duz ve tek parca durur (sidebar yokmus gibi); icerik
 * kaydirilinca ust kenardan kopup cam kapsule donusur (globals.css: .topbar-shell).
 * Logo, arama, mobil uygulama rozeti ve bildirimler burada; kenar cubugu altindan baslar.
 */
export function AppTopbar() {
    const t = useI18n();
    const localizeHref = useLocalizedHref();
    const pathname = usePathname();
    const { isAuthenticated } = useAuth();
    const floating = useFloating();
    const [mobileSearch, setMobileSearch] = useState(false);

    // Sayfa degisince mobil arama modu kapanir.
    useEffect(() => setMobileSearch(false), [pathname]);

    return (
        <header data-floating={floating} className="pointer-events-none absolute inset-x-0 top-0 z-40 h-(--topbar-h)">
            <span aria-hidden className="topbar-edge" />
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
