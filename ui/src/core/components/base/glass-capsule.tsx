"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/core/lib/utils";
import { buildDisplacementMap, LENS_SCALE } from "@/core/components/base/glass-surface";

/**
 * The topbar's glass as a standalone surface: clear tint, thin blur, refraction only at the rim
 * and a specular layer. It sizes its own lens map, so it works on any rounded element.
 */
export function GlassCapsule({ className, children, tone = "clear" }: {
    className?: string;
    children: ReactNode;
    /** "dense" frosts the body for surfaces whose labels have no field of their own. */
    tone?: "clear" | "dense";
}) {
    const id = `capsule${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
    const ref = useRef<HTMLDivElement>(null);
    const [lens, setLens] = useState(false);
    const [map, setMap] = useState<string | null>(null);

    useLayoutEffect(() => {
        const element = ref.current;
        if (!element || typeof CSS === "undefined" || !CSS.supports("backdrop-filter", `url(#${id})`)) return;
        setLens(true);
        let frame = 0;
        let lastKey = "";

        function generate() {
            frame = 0;
            if (!element) return;
            const width = Math.round(element.offsetWidth);
            const height = Math.round(element.offsetHeight);
            if (width < 2 || height < 2) return;
            const radius = Math.min(parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0, height / 2);
            const key = `${width}x${height}x${radius}`;
            if (key === lastKey) return;
            lastKey = key;
            setMap(buildDisplacementMap(width, height, radius));
        }

        // The first map is synchronous: an empty feImage would shift the whole backdrop.
        generate();
        const observer = new ResizeObserver(() => {
            if (!frame) frame = requestAnimationFrame(generate);
        });
        observer.observe(element);
        return () => {
            observer.disconnect();
            if (frame) cancelAnimationFrame(frame);
        };
    }, [id]);

    return (
        <div ref={ref} data-lens={lens && map !== null} data-tone={tone} className={cn("glass-capsule", className)}>
            <span aria-hidden="true" className="glass-capsule-stack">
                <svg width="0" height="0" className="absolute" focusable="false">
                    <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
                        {map ? <feImage href={map} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="lensMap" /> : null}
                        <feDisplacementMap in="SourceGraphic" in2="lensMap" scale={LENS_SCALE} xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </svg>
                <span className="glass-capsule-base" />
                <span className="glass-capsule-refract" style={{ backdropFilter: lens && map ? `url(#${id}) brightness(1.03)` : "none" }} />
                <span className="glass-capsule-shine" />
            </span>
            <div className="relative z-1">{children}</div>
        </div>
    );
}
