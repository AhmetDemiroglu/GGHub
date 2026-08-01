"use client";

import { useEffect, useRef } from "react";

/**
 * Kaydirilabilir en yakin ustu bulur.
 *
 * Uygulamada sayfa <body> uzerinde KAYMIYOR: (authenticated) layout'u
 * `<main className="flex-1 overflow-y-auto">` ile kendi kaydirma kabini
 * kuruyor. Bunu bilmeden IntersectionObserver'i varsayilan root (viewport) ile
 * kurmak sessiz bir tuzak: gozlem calisir ama `rootMargin` ISE YARAMAZ, cunku
 * hedef ara kaydirma kabi tarafindan kirpilir ve o kirpma marj ile genisletilmez.
 * Sonuc: on yukleme yok, kullanici tam dibe inmeden sayfa gelmiyor.
 */
function findScrollParent(element: HTMLElement | null): HTMLElement | null {
    let node = element?.parentElement ?? null;

    while (node) {
        const style = getComputedStyle(node);
        const overflowY = style.overflowY;
        if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
            return node;
        }
        node = node.parentElement;
    }

    return null;
}

interface UseInfiniteScrollOptions {
    /** false ise hic dinlenmez (veri bitti, giris yok, vb.). */
    enabled: boolean;
    /** Yukleme suruyorsa tekrar tetiklenmez. */
    loading: boolean;
    onLoadMore: () => void;
    /** Dipten bu kadar piksel once yuklemeye basla. */
    rootMargin?: number;
}

/**
 * Sonsuz akis tetikleyicisi.
 *
 * IKI mekanizma birden kullanilir ve bu bilincli:
 *
 *  1. IntersectionObserver, DOGRU root ile (asil kaydirma kabi). Boylece
 *     rootMargin gercekten calisir ve icerik kullanici dibe varmadan gelir.
 *
 *  2. Pasif scroll dinleyicisi, yedek olarak. IntersectionObserver yalnizca
 *     kesisme DURUMU degistiginde haber verir; sayfa sekme degisimi, geri
 *     navigasyonu ya da yukleme sirasinda gozlemin sokulup takilmasi gibi
 *     durumlarda tetikleyici olay hic uretilmeyebiliyor ve akis oldugu yerde
 *     donuyordu. Scroll dinleyicisi konumu dogrudan olctugu icin bu bosluklari
 *     kapatir.
 *
 * Iki yol da ayni korumali cagriya duser; ayni anda iki istek gitmez.
 */
export function useInfiniteScroll<T extends HTMLElement>({
    enabled,
    loading,
    onLoadMore,
    rootMargin = 800,
}: UseInfiniteScrollOptions) {
    const sentinelRef = useRef<T | null>(null);
    // Callback'i ref'te tutuyoruz: her render'da yeni bir fonksiyon gelse bile
    // gozlem ve dinleyici yeniden kurulmasin.
    const onLoadMoreRef = useRef(onLoadMore);
    onLoadMoreRef.current = onLoadMore;
    const loadingRef = useRef(loading);
    loadingRef.current = loading;
    const enabledRef = useRef(enabled);
    enabledRef.current = enabled;

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || !enabled) return;

        const container = findScrollParent(sentinel);

        const trigger = () => {
            if (!enabledRef.current || loadingRef.current) return;
            onLoadMoreRef.current();
        };

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) trigger();
            },
            {
                // root null ise viewport kullanilir; kaydirma kabi bulunduysa O root olur.
                root: container,
                rootMargin: `${rootMargin}px 0px`,
            },
        );
        observer.observe(sentinel);

        const scrollTarget: HTMLElement | Window = container ?? window;
        const onScroll = () => {
            if (!enabledRef.current || loadingRef.current) return;

            const remaining = container
                ? container.scrollHeight - container.scrollTop - container.clientHeight
                : document.documentElement.scrollHeight - window.scrollY - window.innerHeight;

            if (remaining <= rootMargin) trigger();
        };

        scrollTarget.addEventListener("scroll", onScroll, { passive: true });
        // Acilista sayfa zaten kisaysa (ekrani doldurmuyorsa) bir sonraki sayfa
        // hic istenmez ve akis tek sayfada takili kalirdi; bir kez elle olcuyoruz.
        onScroll();

        return () => {
            observer.disconnect();
            scrollTarget.removeEventListener("scroll", onScroll);
        };
        // enabled disinda bagimlilik YOK: yukleme durumu ref uzerinden okunuyor,
        // boylece her yuklemede gozlem sokulup takilmiyor (eski uygulamada tam da
        // bu sokme-takma sirasinda tetikleyici olaylar kayboluyordu).
    }, [enabled, rootMargin]);

    return sentinelRef;
}
