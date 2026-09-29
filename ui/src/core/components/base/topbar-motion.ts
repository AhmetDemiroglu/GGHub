import { useEffect, useState, type RefObject } from "react";
import { usePathname } from "next/navigation";
import { buildTopbarOutline } from "./topbar-outline";

/** Kaydirma kabinin id'si; layout'taki <main> bunu tasir (pencere degil, main kayar). */
export const APP_SCROLL_ID = "app-main";

// Histerezis: esik etrafinda titremesin. Kopma 44px'te, geri yapisma 8px'te.
const DETACH_AT = 44;
const ATTACH_AT = 8;

/*
 * Fizik. Cubuk ust kenara bir yayla asilidir; kaydirilan icerik onu ceker.
 *   membrane : yapisik evrede kaydirmaya KILITLI zar uzamasi (0..44px -> 0..14px). Kopma
 *              aninda bir anda sifirlanir; yay bu ani kaybi kendisi salinarak yutar (dusme).
 *   pull     : kaydirma HIZINDAN gelen cekme. Asagi kaydirma asagi ceker (+), yukari (-).
 *   sag      : yayla izlenen gercek sarkma (px). Hedef = membrane + pull.
 *   peak     : tumsegin yatay konumu (0..1), isaretciyi yumusakca izler; cubuk hep
 *              cekildigi yerden esner.
 */
const MEMBRANE_MAX = 14;
/** px/s kaydirma hizi -> px cekme. Sakin tekerlek (~1.500px/s) 12px, fiske (3.000+px/s) tavan. */
const PULL_GAIN = 0.008;
const PULL_MAX_DOWN = 24;
const PULL_MAX_UP = 12;
/** Yay: sertlik (1/s^2) ve sonum (1/s). Kritik sonumun altinda: bir-iki kucuk salinimla oturur. */
const STIFFNESS = 260;
const DAMPING = 18;
/** Kare basina hiz yumusatma (0..1). */
const VEL_SMOOTHING = 0.5;
/** Tepe noktasinin isaretciyi izleme hizi (1/s). */
const PEAK_FOLLOW = 12;
/** Kapsulde ust kenar da sarkar ama alt kenardan az: aradaki fark "sunme"dir. Yapisik cubukta 0. */
const TOP_FACTOR_FLOATING = 0.3;
/** Icerik cekmeyi kismen izler: sadece kabuk degil cubugun kendisi suner. */
const CONTENT_FOLLOW = 0.25;
/** Kopma/yapisma sonrasi CSS gecisleri (620ms) boyunca silueti kapsule kilitli tutmak icin. */
const KEEP_ALIVE_MS = 900;
const MAX_DT = 0.032;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export interface TopbarRefs {
    body: RefObject<HTMLDivElement | null>;
    skinSolid: RefObject<HTMLDivElement | null>;
    skinGlass: RefObject<HTMLDivElement | null>;
    capsule: RefObject<HTMLDivElement | null>;
    content: RefObject<HTMLDivElement | null>;
    rimSvg: RefObject<SVGSVGElement | null>;
    rimGlass: RefObject<SVGPathElement | null>;
    rimLine: RefObject<SVGPathElement | null>;
}

export interface TopbarMotion {
    /** Cubuk ust kenardan kopmus, kapsul halinde. */
    floating: boolean;
    /** Kaydirma kabinin dikey kaydirma cubugu genisligi (px); cubuk onun ustune binmez. */
    scrollbar: number;
}

/**
 * Kaydirma kabini izler, kopma/yapisma durumunu React'e verir; esneme ise React'e ugramadan
 * dogrudan DOM'a yazilir (her karede clip-path ve SVG yolu). Dongu yalniz gerektiginde calisir:
 * kaydirma, isaretci, boyut degisimi ya da durum gecisi uyandirir; yay durulunca durur.
 */
export function useTopbarMotion(refs: TopbarRefs): TopbarMotion {
    const pathname = usePathname();
    const [motion, setMotion] = useState<TopbarMotion>({ floating: false, scrollbar: 0 });

    useEffect(() => {
        const main = document.getElementById(APP_SCROLL_ID);
        const body = refs.body.current;
        const skinSolid = refs.skinSolid.current;
        const skinGlass = refs.skinGlass.current;
        const capsule = refs.capsule.current;
        const content = refs.content.current;
        const rimSvg = refs.rimSvg.current;
        const rimGlass = refs.rimGlass.current;
        const rimLine = refs.rimLine.current;
        if (!main || !body || !skinSolid || !skinGlass || !capsule || !content || !rimSvg || !rimGlass || !rimLine) return;

        // Cam katmanlari kendi kutularina gore kirpilir. Kirpma ATA elemana konamaz: clip-path
        // tasiyan bir ata "backdrop root" olur ve backdrop-filter altindaki sayfayi goremez.
        const glassLayers = Array.from(capsule.querySelectorAll<HTMLElement>(".glass-refract, .glass-shine"));
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        let frame = 0;
        let lastTime = 0;
        let lastTop = main.scrollTop;
        let velocity = 0;
        let sag = 0;
        let sagVelocity = 0;
        let peak = 0.5;
        let peakTarget = 0.5;
        let floating = false;
        let keepAliveUntil = 0;
        let lastKey = "";
        let bodyLeft = 0;
        let bodyWidth = 1;

        const measureBody = () => {
            const rect = body.getBoundingClientRect();
            bodyLeft = rect.left;
            bodyWidth = Math.max(rect.width, 1);
        };

        const wake = () => {
            if (!frame) frame = requestAnimationFrame(step);
        };

        const publish = (nextFloating: boolean, scrollbar: number) => {
            setMotion((current) =>
                current.floating === nextFloating && current.scrollbar === scrollbar ? current : { floating: nextFloating, scrollbar }
            );
        };

        const draw = (now: number) => {
            const bodyRect = body.getBoundingClientRect();
            const capsuleRect = capsule.getBoundingClientRect();
            const radius = parseFloat(getComputedStyle(capsule).borderTopLeftRadius) || 0;
            const geometry = {
                x0: capsuleRect.left - bodyRect.left,
                x1: capsuleRect.right - bodyRect.left,
                y0: capsuleRect.top - bodyRect.top,
                y1: capsuleRect.bottom - bodyRect.top,
                radius,
                width: bodyRect.width,
                sag: Math.abs(sag) < 0.02 ? 0 : sag,
                peak,
                topFactor: floating ? TOP_FACTOR_FLOATING : 0,
            };
            // 0.05px altindaki degisimler cizilmez: durulmus cubuk icin DOM'a dokunulmaz.
            const key = [geometry.x0, geometry.x1, geometry.y0, geometry.y1, radius, geometry.sag, peak * 1000, geometry.topFactor]
                .map((value) => Math.round(value * 20))
                .join("|");
            if (key === lastKey) return false;
            lastKey = key;

            const outline = buildTopbarOutline(geometry);
            const bodyClip = `path("${outline.body}")`;
            const capsuleClip = `path("${outline.capsule}")`;
            skinSolid.style.clipPath = bodyClip;
            skinGlass.style.clipPath = bodyClip;
            rimSvg.style.clipPath = bodyClip;
            rimGlass.setAttribute("d", outline.body);
            rimLine.setAttribute("d", outline.bottom);
            for (const layer of glassLayers) layer.style.clipPath = capsuleClip;
            content.style.transform = geometry.sag ? `translateY(${(geometry.sag * CONTENT_FOLLOW).toFixed(2)}px)` : "";
            void now;
            return true;
        };

        const step = (now: number) => {
            frame = 0;
            // dt hicbir zaman 0 olmamali: 0/0 = NaN yaya girer ve bir daha cikmaz.
            const dt = lastTime && now > lastTime ? Math.min((now - lastTime) / 1000, MAX_DT) : 1 / 60;
            lastTime = now;

            const top = main.scrollTop;
            const instant = (top - lastTop) / dt;
            lastTop = top;
            velocity += (instant - velocity) * VEL_SMOOTHING;

            const nextFloating = floating ? top > ATTACH_AT : top > DETACH_AT;
            if (nextFloating !== floating) {
                floating = nextFloating;
                keepAliveUntil = now + KEEP_ALIVE_MS;
            }
            publish(floating, main.offsetWidth - main.clientWidth);

            const membrane = floating || reduced ? 0 : Math.min(top / DETACH_AT, 1) * MEMBRANE_MAX;
            const pull = reduced ? 0 : clamp(velocity * PULL_GAIN, -PULL_MAX_UP, PULL_MAX_DOWN);
            const target = membrane + pull;
            if (reduced) {
                sag = target;
                sagVelocity = 0;
            } else {
                const acceleration = STIFFNESS * (target - sag) - DAMPING * sagVelocity;
                sagVelocity += acceleration * dt;
                sag += sagVelocity * dt;
            }
            peak += (peakTarget - peak) * (1 - Math.exp(-PEAK_FOLLOW * dt));

            draw(now);

            const settled =
                Math.abs(target - sag) < 0.05 &&
                Math.abs(sagVelocity) < 1 &&
                Math.abs(instant) < 1 &&
                Math.abs(velocity) < 2 &&
                Math.abs(peakTarget - peak) < 0.002 &&
                now >= keepAliveUntil;
            if (settled) {
                velocity = 0;
                lastTime = 0;
                return;
            }
            frame = requestAnimationFrame(step);
        };

        const onPointer = (clientX: number) => {
            peakTarget = clamp((clientX - bodyLeft) / bodyWidth, 0.05, 0.95);
        };
        const onPointerMove = (event: PointerEvent) => onPointer(event.clientX);
        const onTouch = (event: TouchEvent) => {
            const touch = event.touches[0];
            if (touch) onPointer(touch.clientX);
        };
        const onResize = () => {
            measureBody();
            keepAliveUntil = performance.now() + 100;
            wake();
        };

        measureBody();
        wake();
        if (process.env.NODE_ENV !== "production") {
            // Gelistirme: tarayici konsolundan fizik durumunu okumak icin (window.__topbar()).
            (window as unknown as { __topbar?: () => unknown }).__topbar = () => ({ sag, sagVelocity, velocity, peak, peakTarget, floating, lastTime, lastKey });
        }
        main.addEventListener("scroll", wake, { passive: true });
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("touchstart", onTouch, { passive: true });
        window.addEventListener("touchmove", onTouch, { passive: true });
        // Kaydirma cubugu icerikle gelip gidebilir (kisa/uzun sayfa); govde genisligi de degisir.
        const observer = new ResizeObserver(onResize);
        observer.observe(main);
        observer.observe(body);

        return () => {
            main.removeEventListener("scroll", wake);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("touchstart", onTouch);
            window.removeEventListener("touchmove", onTouch);
            observer.disconnect();
            if (frame) cancelAnimationFrame(frame);
        };
    }, [pathname, refs]);

    return motion;
}
