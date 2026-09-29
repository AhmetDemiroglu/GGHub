"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";

/** A narrow edge lens; the center stays optically quiet and the controls sit above it. */
const EDGE_BAND = 12;
const EDGE_POWER = 3.2;
export const LENS_SCALE = 34;
/** Neutral SVG works consistently across engines and does not add a second displacement pass. */
const NEUTRAL_MAP = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Cpath fill='%23808080' d='M0 0h1v1H0z'/%3E%3C/svg%3E";

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

/** Motion positions the edge map; unsupported browsers keep the CSS glass surface. */
export function GlassSurface({ active = true }: { active?: boolean }) {
    const rawId = useId();
    const id = `glass${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
    const ref = useRef<HTMLDivElement>(null);
    const [lens, setLens] = useState(false);

    useLayoutEffect(() => setLens(supportsLens(id)), [id]);

    return (
        <div ref={ref} aria-hidden="true" data-active={active} data-lens={lens} className="glass-surface">
            <svg width="0" height="0" className="absolute" focusable="false">
                <filter id={id} x="-5%" y="-30%" width="110%" height="160%" colorInterpolationFilters="sRGB">
                    <feImage data-glass="lens" href={NEUTRAL_MAP} x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="lensMap" />
                    <feDisplacementMap in="SourceGraphic" in2="lensMap" scale={LENS_SCALE} xChannelSelector="R" yChannelSelector="G" />
                </filter>
            </svg>
            <div data-glass="refract" className="glass-refract" style={{ backdropFilter: active && lens ? `url(#${id})` : "none" }} />
        </div>
    );
}
