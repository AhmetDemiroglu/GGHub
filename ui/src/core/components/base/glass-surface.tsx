"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";

/*
 * Liquid Glass yuzeyi (onayli recete, MEMORY.md "GGHub Liquid Glass").
 *
 * Gercek kirilma yalniz `backdrop-filter: url(#filter)` + SVG feDisplacementMap ile olur:
 * canvas, kapsulun rounded-rect SDF'inden bir yer degistirme haritasi uretir (R=x, G=y,
 * 128 notr). Itme disa bakan normal boyunca, yalniz dar kenar bandinda ve easing ile artar;
 * merkez duz ve sakin kalir, bukulme rim'de toplanir (lens karakteri). Harita dataURL ->
 * feImage -> feDisplacementMap zincirine girer.
 *
 * Katmanlar: glass-base (hafif blur + saturate + seffaf tint), glass-refract (lens),
 * glass-shine (inset specular + sheen). CSS'i globals.css'te.
 *
 * Gurultu, kromatik sacak, feTurbulence YOK (banyo cami reddedildi). Chromium disinda
 * url() destegi yoksa refract katmani devre disi kalir ve base katmani buzlu cama duser.
 */
const EDGE_BAND = 14;
const EDGE_POWER = 3.2;
const LENS_SCALE = 48;

/** Rounded-rect SDF'inden yer degistirme haritasi. Dis bolge ve merkez notr (128). */
function buildDisplacementMap(width: number, height: number, radius: number): string | null {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const image = ctx.createImageData(width, height);
    const data = image.data;
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    const cx = width / 2;
    const cy = height / 2;
    const hx = width / 2 - r;
    const hy = height / 2 - r;

    for (let y = 0; y < height; y++) {
        const py = y + 0.5 - cy;
        const qy = Math.abs(py) - hy;
        for (let x = 0; x < width; x++) {
            const px = x + 0.5 - cx;
            const qx = Math.abs(px) - hx;
            const i = (y * width + x) * 4;

            // Signed distance: kose bolgesinde daireye, kenarda duz kenara gore.
            const ox = Math.max(qx, 0);
            const oy = Math.max(qy, 0);
            const d = Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;

            let nx = 0;
            let ny = 0;
            if (d < 0 && -d < EDGE_BAND) {
                if (qx > 0 && qy > 0) {
                    const len = Math.hypot(qx, qy) || 1;
                    nx = qx / len;
                    ny = qy / len;
                } else if (qx > qy) {
                    nx = 1;
                } else {
                    ny = 1;
                }
                nx *= Math.sign(px) || 1;
                ny *= Math.sign(py) || 1;
                const t = 1 - -d / EDGE_BAND;
                const strength = Math.pow(t, EDGE_POWER);
                nx *= strength;
                ny *= strength;
            }

            data[i] = Math.round(128 + nx * 127);
            data[i + 1] = Math.round(128 + ny * 127);
            data[i + 2] = 128;
            data[i + 3] = 255;
        }
    }

    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL("image/png");
}

function readRadius(el: HTMLElement): number {
    const parent = el.parentElement ?? el;
    return parseFloat(getComputedStyle(parent).borderTopLeftRadius) || 0;
}

function supportsLens(id: string): boolean {
    if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return false;
    return CSS.supports("backdrop-filter", `url(#${id})`);
}

/**
 * Ebeveyninin tamamini kaplayan cam katmani. Ebeveyn `position: relative` ve yuvarlak
 * koseli olmali; kose yaricapi ebeveynden okunur, boyut ResizeObserver ile izlenir.
 * `active` false iken yalniz gorunmez olur (opacity); DOM'da kalir ki gecis animasyonu aksin.
 */
export function GlassSurface({ active = true, className = "" }: { active?: boolean; className?: string }) {
    const rawId = useId();
    const id = `glass${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
    const ref = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<{ url: string; width: number; height: number } | null>(null);
    const [lens, setLens] = useState(false);

    // Ilk harita senkron (boyanmadan once); sonrasi ResizeObserver + rAF ile.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        setLens(supportsLens(id));

        let frame = 0;
        const regenerate = () => {
            frame = 0;
            const width = Math.round(el.clientWidth);
            const height = Math.round(el.clientHeight);
            if (width < 2 || height < 2) return;
            const url = buildDisplacementMap(width, height, readRadius(el));
            if (url) setMap({ url, width, height });
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(regenerate);
        };

        regenerate();
        const observer = new ResizeObserver(schedule);
        observer.observe(el);
        // Kose yaricapi boyutla birlikte animasyonla degisiyor; gecis bitince son hali uret.
        const parent = el.parentElement;
        parent?.addEventListener("transitionend", schedule);
        return () => {
            observer.disconnect();
            parent?.removeEventListener("transitionend", schedule);
            if (frame) cancelAnimationFrame(frame);
        };
    }, [id]);

    // Pasifken lens filtresi tamamen kapali: bos/eski harita arka plani kaydirmasin.
    const filter = active && lens && map ? `url(#${id})` : "none";

    return (
        <div
            ref={ref}
            aria-hidden="true"
            data-active={active}
            data-lens={lens}
            className={`glass-surface pointer-events-none absolute inset-0 rounded-[inherit] ${className}`}
        >
            <svg width="0" height="0" className="absolute" focusable="false">
                <filter id={id} x="-8%" y="-70%" width="116%" height="240%" colorInterpolationFilters="sRGB">
                    {map ? <feImage href={map.url} x="0" y="0" width={map.width} height={map.height} preserveAspectRatio="none" result="map" /> : null}
                    <feDisplacementMap in="SourceGraphic" in2="map" scale={LENS_SCALE} xChannelSelector="R" yChannelSelector="G" />
                </filter>
            </svg>
            <div className="glass-base" />
            <div className="glass-refract" style={{ backdropFilter: filter }} />
            <div className="glass-shine" />
        </div>
    );
}
