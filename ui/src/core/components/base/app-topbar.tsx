"use client";

import React, { useEffect, useId, useRef, useState } from "react";
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
import { APP_SCROLL_ID, useTopbarMotion, type TopbarRefs } from "@/core/components/base/topbar-motion";

export { APP_SCROLL_ID };

/**
 * Ust cubuk. Sayfanin en ustunde duz ve tek parca durur (sidebar yokmus gibi); icerik
 * kaydirilinca cekilir: ilk 44px'te alt kenari zar gibi asagi uzar, esikte kopup cam kapsule
 * donusur. Kaydirma hizi cubugu surekli ceker ve isaretcinin bulundugu noktada esnetir; birakinca
 * yay sonumuyle yerine oturur (fizik: topbar-motion.ts, siluet: topbar-outline.ts, CSS: globals.css).
 *
 * Katmanlar: govde (skin + cam kapsul + SVG rim; hepsi esnek siluetle kirpilir) ve ustunde
 * kirpilmayan icerik kutusu (arama acilir listesi cubugun altina tasar, kirpilmamali).
 */
export function AppTopbar() {
    const t = useI18n();
    const localizeHref = useLocalizedHref();
    const pathname = usePathname();
    const { isAuthenticated } = useAuth();
    const [mobileSearch, setMobileSearch] = useState(false);
    const rimGradientId = `topbarRim${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

    const refs = useRef<TopbarRefs>({
        header: React.createRef<HTMLElement>(),
        body: React.createRef<HTMLDivElement>(),
        shadow: React.createRef<HTMLDivElement>(),
        skinSolid: React.createRef<HTMLDivElement>(),
        skinGlass: React.createRef<HTMLDivElement>(),
        content: React.createRef<HTMLDivElement>(),
        neck: React.createRef<HTMLSpanElement>(),
        rimSvg: React.createRef<SVGSVGElement>(),
        rimGlass: React.createRef<SVGPathElement>(),
        rimGlow: React.createRef<SVGPathElement>(),
        rimTear: React.createRef<SVGPathElement>(),
        rimLine: React.createRef<SVGPathElement>(),
    }).current;
    const { floating, engaged, scrollbar } = useTopbarMotion(refs);

    // Sayfa degisince mobil arama modu kapanir.
    useEffect(() => setMobileSearch(false), [pathname]);

    return (
        <header
            ref={refs.header}
            data-floating={floating}
            style={{ "--topbar-sb": `${scrollbar}px`, "--peel": 0 } as React.CSSProperties}
            className="pointer-events-none absolute left-0 right-(--topbar-sb) top-0 z-40 h-(--topbar-h)"
        >
            {/* Kopma ani: ust kenarda kalan iz cizgisi ve koptugu yerde kalan boyun kalintisi. */}
            <span aria-hidden className="topbar-edge" />
            <span ref={refs.neck} aria-hidden className="topbar-neck" />

            {/* Govde: esnek siluet. Her katman ayni clip-path'i kendi uzerinde tasir (golge, deri, cam, rim);
                rijit bir kapsul yok, sarkma payi (--topbar-reserve) icinde her sey birlikte egilir. */}
            <div ref={refs.body} aria-hidden className="topbar-body">
                <div className="topbar-shadow-wrap">
                    <div ref={refs.shadow} className="topbar-shadow" />
                </div>
                <div ref={refs.skinSolid} className="topbar-skin topbar-skin-solid" />
                <div ref={refs.skinGlass} className="topbar-skin topbar-skin-glass" />
                <GlassSurface active={engaged} />
                <svg ref={refs.rimSvg} className="topbar-rim" focusable="false">
                    <defs>
                        {/* Eski CSS rim'in birebir karsiligi: ustte keskin isik, altta yumusak. */}
                        <linearGradient id={rimGradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" style={{ stopColor: "var(--glass-rim)" }} />
                            <stop offset="0.3" style={{ stopColor: "var(--glass-rim-soft)" }} />
                            <stop offset="0.55" style={{ stopColor: "rgba(255, 255, 255, 0.05)" }} />
                            <stop offset="1" style={{ stopColor: "var(--glass-rim-soft)" }} />
                        </linearGradient>
                        {/* Ic parilti: genis, bulanik cizgi; siluetle kirpilinca yalniz icerideki yarisi kalir. */}
                        <filter id={`${rimGradientId}Glow`} x="-5%" y="-40%" width="110%" height="180%">
                            <feGaussianBlur stdDeviation="5" />
                        </filter>
                    </defs>
                    <path ref={refs.rimGlow} className="topbar-rim-glow" filter={`url(#${rimGradientId}Glow)`} />
                    <path ref={refs.rimGlass} className="topbar-rim-glass" stroke={`url(#${rimGradientId})`} />
                    <path ref={refs.rimTear} className="topbar-rim-tear" />
                    <path ref={refs.rimLine} className="topbar-rim-line" />
                </svg>
            </div>

            {/* Icerik: govdeyle ayni geometriyi JS'ten alir ama kirpilmaz (arama listesi asagi tasar); tiklamalar burada.
                data-follow parcalari kendi konumlarindaki sarkmayi izler: cubuk egilince icindekiler de egilir. */}
            <div ref={refs.content} className="topbar-content">
                <div className="relative z-10 flex h-full items-center gap-2 px-3 md:gap-4 md:px-4">
                    {mobileSearch ? (
                        /* Mobil arama modu: cubuk tamamen aramaya ayrilir. */
                        <div data-follow className="flex w-full items-center gap-1 md:hidden">
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
                        <div data-follow className="flex shrink-0 items-center gap-1 md:gap-2">
                            <SidebarTrigger />
                            <Link href={localizeHref("/")} aria-label="GGHub" className="flex items-center rounded-md px-1">
                                <Image src={logoSrc} alt="GGHub" width={35} height={22} priority className="h-6 w-auto md:h-7" />
                            </Link>
                        </div>

                        {/* Orta: arama (masaustu) */}
                        <div data-follow className="hidden min-w-0 flex-1 justify-center md:flex">
                            <TopbarSearch className="w-full max-w-md" />
                        </div>
                        <div className="flex-1 md:hidden" />

                        {/* Sag: mobil arama, uygulama rozeti, bildirimler */}
                        <div data-follow className="flex shrink-0 items-center gap-1 md:gap-2">
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
