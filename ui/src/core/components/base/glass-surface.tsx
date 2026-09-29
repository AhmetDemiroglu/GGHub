"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";

/*
 * Liquid Glass yuzeyi (onayli recete, MEMORY.md "GGHub Liquid Glass").
 *
 * Gercek kirilma yalniz `backdrop-filter: url(#filter)` + SVG feDisplacementMap ile olur:
 * canvas, kapsulun rounded-rect SDF'inden bir yer degistirme haritasi uretir (R=x, G=y,
 * 128 notr). Itme disa bakan normal boyunca, yalniz dar kenar bandinda ve easing ile artar;
 * merkez duz ve sakin kalir, bukulme rim'de toplanir (lens karakteri).
 *
 * Esnek ust cubuk icin zincir iki asamali: once rijit kapsul haritasiyla kirilma (lens),
 * sonra cubugun o anki egilme alaniyla (deform haritasi, 64x8, her kare) dikey yer degistirme.
 * Boylece rim bandi ve camdan gorunen icerik siluetle birlikte egilir; sabit bir hap kalmaz.
 * Katmanin kutusu govdenin tamamidir (sarkma payi dahil); gorunen sekli clip-path verir.
 *
 * Taban rengi (tint + hafif blur) topbar-skin-glass'ta, rim ve ic parilti SVG cizgilerde:
 * onlar da silueti izler. Gurultu, kromatik sacak, feTurbulence YOK (banyo cami reddedildi).
 * Chromium disinda url() destegi yoksa refract katmani devre disi kalir; skin buzlu cama duser.
 *
 * Haritalarin uretimi ve yerlestirilmesi topbar-motion.ts'tedir; bu bilesen iskelet + destek tespiti.
 */
const EDGE_BAND = 14;
const EDGE_POWER = 3.2;
export const LENS_SCALE = 48;
/** Deform haritasi 8 bit: scale 72 -> +-36px araligi, 0.28px adim. Cekme tavani (28px) icinde kalir. */
export const DEFORM_SCALE = 72;
/** Notr deform haritasi (1x1, 128/128): egilme yokken kirilma zinciri oldugu gibi gecer. */
export const NEUTRAL_MAP = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQI12OwsLAAAAF9AKPhmxfUAAAAAElFTkSuQmCC";

/** Rounded-rect SDF'inden yer degistirme haritasi. Dis bolge ve merkez notr (128). */
export function buildDisplacementMap(width: number, height: number, radius: number): string | null {
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

function supportsLens(id: string): boolean {
    if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return false;
    return CSS.supports("backdrop-filter", `url(#${id})`);
}

/**
 * Ebeveyninin (govde) tamamini kaplayan kirilma katmani. feImage dugumleri data-glass ile
 * isaretlidir; topbar-motion.ts lens haritasini boyut degisiminde, deform haritasini ve lens
 * yerlesimini her karede oraya yazar. `active` false iken filtre kapali ve katman gorunmez.
 */
export function GlassSurface({ active = true }: { active?: boolean }) {
    const rawId = useId();
    const id = `glass${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
    const ref = useRef<HTMLDivElement>(null);
    const [lens, setLens] = useState(false);

    useLayoutEffect(() => setLens(supportsLens(id)), [id]);

    return (
        <div ref={ref} aria-hidden="true" data-active={active} data-lens={lens} className="glass-surface">
            <svg width="0" height="0" className="absolute" focusable="false">
                <filter id={id} x="0" y="-40%" width="100%" height="180%" colorInterpolationFilters="sRGB">
                    <feImage data-glass="lens" href={NEUTRAL_MAP} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="lensMap" />
                    <feDisplacementMap in="SourceGraphic" in2="lensMap" scale={LENS_SCALE} xChannelSelector="R" yChannelSelector="G" result="refracted" />
                    <feImage data-glass="deform" href={NEUTRAL_MAP} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="deformMap" />
                    <feDisplacementMap in="refracted" in2="deformMap" scale={DEFORM_SCALE} xChannelSelector="R" yChannelSelector="G" />
                </filter>
            </svg>
            <div data-glass="refract" className="glass-refract" style={{ backdropFilter: active && lens ? `url(#${id})` : "none" }} />
        </div>
    );
}
