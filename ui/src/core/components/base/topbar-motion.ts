import { useEffect, useState, type RefObject } from "react";
import { usePathname } from "next/navigation";
import { buildTopbarOutline } from "./topbar-outline";
import { buildDisplacementMap } from "./glass-surface";
import { TopbarPhysics } from "./topbar-physics";

export const APP_SCROLL_ID = "app-main";

export interface TopbarRefs {
    header: RefObject<HTMLElement | null>;
    body: RefObject<HTMLDivElement | null>;
    shadow: RefObject<HTMLDivElement | null>;
    skinSolid: RefObject<HTMLDivElement | null>;
    skinGlass: RefObject<HTMLDivElement | null>;
    content: RefObject<HTMLDivElement | null>;
    rimSvg: RefObject<SVGSVGElement | null>;
    rimGlass: RefObject<SVGPathElement | null>;
    rimDepth: RefObject<SVGPathElement | null>;
}

export function useTopbarMotion(refs: TopbarRefs) {
    const pathname = usePathname();
    const [motion, setMotion] = useState({ floating: false, engaged: false, scrollbar: 0 });

    useEffect(() => {
        const main = document.getElementById(APP_SCROLL_ID);
        const header = refs.header.current;
        const body = refs.body.current;
        const content = refs.content.current;
        const rim = refs.rimGlass.current;
        const svg = refs.rimSvg.current;
        const depth = refs.rimDepth.current;
        const layers = [refs.shadow.current, refs.skinSolid.current, refs.skinGlass.current];
        if (!main || !header || !body || !content || !rim || !svg || layers.some(layer => !layer)) return;

        const refract = body.querySelector<HTMLElement>(".glass-refract");
        const lensImage = body.querySelector<SVGFEImageElement>('feImage[data-glass="lens"]');
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
        const mobile = window.matchMedia("(max-width: 767px)");
        const physics = new TopbarPhysics(main.scrollTop);
        let width = 1;
        let scrollbar = 0;
        let frame = 0;
        let lastTime = 0;
        let lastPath = "";

        function draw(dt: number) {
            if (!main || !header || !content || !rim || !svg) return;
            const state = physics.step(main.scrollTop, dt, mobile.matches, reduced.matches, width);
            const outline = buildTopbarOutline({ ...state, width });
            if (outline.fill !== lastPath) {
                const clip = `path("${outline.fill}")`;
                // Clip each surface, never a backdrop-filter ancestor.
                for (const layer of [...layers, refract, svg]) if (layer) layer.style.clipPath = clip;
                rim.setAttribute("d", outline.rim);
                depth?.setAttribute("d", outline.rim);
                content.style.left = `${state.inset}px`;
                content.style.right = `${state.inset}px`;
                content.style.top = `${state.top}px`;
                content.style.height = `${state.height}px`;
                lastPath = outline.fill;
                if (lensImage) {
                    lensImage.setAttribute("x", String(state.inset));
                    lensImage.setAttribute("y", String(state.top));
                    lensImage.setAttribute("width", String(Math.max(1, width - 2 * state.inset)));
                    lensImage.setAttribute("height", String(state.height));
                }
            }
            header.style.setProperty("--peel", String(state.glass));
            header.style.setProperty("--lens-reveal", String(state.lens));
            header.dataset.floating = String(state.floating);
            setMotion(current => current.floating === state.floating && current.engaged === (state.glass > 0) && current.scrollbar === scrollbar
                ? current : { floating: state.floating, engaged: state.glass > 0, scrollbar });
            return state.settled;
        }

        function tick(now: number) {
            frame = 0;
            const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.032) : 1 / 60;
            lastTime = now;
            if (!draw(dt)) frame = requestAnimationFrame(tick);
            else lastTime = 0;
        }

        function wake() {
            if (!frame) frame = requestAnimationFrame(tick);
        }

        function measure() {
            if (!main || !header || !body || !svg) return;
            scrollbar = Math.max(0, main.offsetWidth - main.clientWidth);
            header.style.setProperty("--topbar-sb", `${scrollbar}px`);
            width = Math.max(1, body.getBoundingClientRect().width);
            const inset = mobile.matches ? 8 : 12;
            const height = mobile.matches ? 50 : 48;
            if (lensImage) {
                const map = buildDisplacementMap(Math.max(1, Math.round(width - 2 * inset)), height, height / 2);
                if (map) lensImage.setAttribute("href", map);
            }
            svg.setAttribute("viewBox", `0 0 ${width} 104`);
            lastPath = "";
            wake();
        }

        measure();
        draw(0);
        main.addEventListener("scroll", wake, { passive: true });
        mobile.addEventListener("change", measure);
        reduced.addEventListener("change", wake);
        const observer = new ResizeObserver(measure);
        observer.observe(main);
        observer.observe(body);
        return () => {
            main.removeEventListener("scroll", wake);
            mobile.removeEventListener("change", measure);
            reduced.removeEventListener("change", wake);
            observer.disconnect();
            if (frame) cancelAnimationFrame(frame);
        };
    }, [pathname, refs]);

    return motion;
}
