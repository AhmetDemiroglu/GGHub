"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAuth } from "@core/hooks/use-auth";
import { setSiteAnalyticsTokenProvider, trackPageLeave, trackPageView } from "@/core/lib/site-analytics";

/**
 * Rota degisimini sayfa goruntuleme + ayrilma (sure, kaydirma derinligi) olaylarina cevirir.
 * GAListener ile ayni yerde, ondan bagimsiz: GA ornekleme ve veri saklama kurallari yuzunden
 * "su kullanici ne yapti" sorusuna cevap veremiyor.
 *
 * Kaydirma DOCUMENT uzerinde capture ile dinlenir: uygulama sayfalari window'u degil
 * layout'taki <main class="overflow-y-auto"> kutusunu kaydiriyor; window scroll hic tetiklenmez.
 */
export default function SiteAnalyticsListener() {
    const pathname = usePathname();
    const { accessToken } = useAuth();

    const currentPath = useRef<string | null>(null);
    const enteredAt = useRef<number>(0);
    const maxScroll = useRef<number>(0);
    const leaveSent = useRef<boolean>(false);

    useEffect(() => {
        setSiteAnalyticsTokenProvider(() => accessToken);
        return () => setSiteAnalyticsTokenProvider(null);
    }, [accessToken]);

    useEffect(() => {
        if (!pathname) return;
        // Onceki sayfadan ayrilis
        if (currentPath.current && currentPath.current !== pathname && !leaveSent.current) {
            trackPageLeave(currentPath.current, Date.now() - enteredAt.current, maxScroll.current);
        }
        if (currentPath.current === pathname) return;

        currentPath.current = pathname;
        enteredAt.current = Date.now();
        maxScroll.current = 0;
        leaveSent.current = false;
        trackPageView(pathname);
    }, [pathname]);

    useEffect(() => {
        const onScroll = (event: Event) => {
            const target = event.target;
            let depth = 0;
            if (target instanceof Element) {
                const total = target.scrollHeight - target.clientHeight;
                depth = total <= 0 ? 100 : ((target.scrollTop + target.clientHeight) / target.scrollHeight) * 100;
            } else if (typeof document !== "undefined") {
                const el = document.documentElement;
                const total = el.scrollHeight - el.clientHeight;
                depth = total <= 0 ? 100 : ((el.scrollTop + el.clientHeight) / el.scrollHeight) * 100;
            }
            if (depth > maxScroll.current) maxScroll.current = Math.min(100, depth);
        };

        const flush = () => {
            if (!currentPath.current || leaveSent.current) return;
            leaveSent.current = true;
            trackPageLeave(currentPath.current, Date.now() - enteredAt.current, maxScroll.current);
        };

        const onVisibility = () => {
            if (document.visibilityState === "hidden") {
                flush();
            } else if (currentPath.current) {
                // Sekmeye geri donuldu: yeni bir kalis suresi basliyor.
                enteredAt.current = Date.now();
                leaveSent.current = false;
            }
        };

        document.addEventListener("scroll", onScroll, { capture: true, passive: true });
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("pagehide", flush);
        return () => {
            document.removeEventListener("scroll", onScroll, { capture: true });
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("pagehide", flush);
        };
    }, []);

    return null;
}
