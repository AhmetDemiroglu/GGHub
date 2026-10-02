"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { META_PIXEL_ID, metaPixelPageView } from "@/core/lib/meta-pixel";
import { isTrackedPath } from "@/core/lib/site-analytics";

/**
 * Istemci tarafi rota degisimlerini Meta pikseline PageView olarak bildirir. Ilk sayfa
 * atlanir: onu root layout'taki bootstrap betigi hidrasyondan once gonderdi.
 */
export default function MetaPixelListener() {
    const pathname = usePathname();
    const lastRef = useRef<string | null>(null);

    useEffect(() => {
        if (!META_PIXEL_ID || !pathname) return;
        if (lastRef.current === null) {
            lastRef.current = pathname;
            return;
        }
        if (lastRef.current === pathname) return;
        lastRef.current = pathname;
        if (isTrackedPath(pathname)) metaPixelPageView();
    }, [pathname]);

    return null;
}
