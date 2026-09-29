import { useEffect, useState, type RefObject } from "react";
import { usePathname } from "next/navigation";
import { buildTopbarOutline, createShiftField } from "./topbar-outline";
import { DEFORM_SCALE, NEUTRAL_MAP, buildDisplacementMap } from "./glass-surface";

/** Kaydirma kabinin id'si; layout'taki <main> bunu tasir (pencere degil, main kayar). */
export const APP_SCROLL_ID = "app-main";

// Histerezis: esik etrafinda titremesin. Kopma 44px'te, geri yapisma 8px'te.
const DETACH_AT = 44;
const ATTACH_AT = 8;

/*
 * Geometri. globals.css'teki --topbar-* degerleriyle AYNI olmali (CSS'te yalniz layout payi ve
 * JS gelene kadarki ilk kare icin dururlar; hareketi buradaki sayilar surer).
 */
const BAR_HEIGHT = 56;
const FLOAT_DESKTOP = { inset: 12, top: 8 };
const FLOAT_MOBILE = { inset: 8, top: 6 };

/*
 * Kopma (yapisik evre, 0..44px kaydirmaya KILITLI). Cubuk ust kenardan soyulur: uclari
 * yuvarlanip iceri cekilir, govdesi asagi kayar (ustu PULL_Y'ye kadar; dinlenme noktasi
 * 8px'in otesi = gerginlik), isaretcinin bulundugu yerden ince bir boyunla ekranin ustune
 * asili kalir. Esikte boyun kopar: cubuga asagi bir darbe biner, yay onu dinlenme noktasina
 * geri ceker, bir-iki salinimla oturur. Geri donuste (8px alti) ayni yol tersine islenir.
 */
const PULL_Y = 26;
const NECK_MIN = 30;
const NECK_MAX_RATIO = 0.45;
const SNAP_IMPULSE = 380;
const SNAP_SAG_IMPULSE = 380;

/*
 * Cekme. Kaydirma hizi cubugu ceker (asagi +, yukari -), sarkma yayla izlenir ve isaretcinin
 * oldugu noktada tumsek yapar (topbar-outline.ts). Icerik cekmeyi kismen izler.
 */
/** px/s kaydirma hizi -> px cekme. Sakin tekerlek (~1.200px/s) 19px, fiske (2.500+px/s) tavan. */
const PULL_GAIN = 0.016;
const PULL_MAX_DOWN = 40;
const PULL_MAX_UP = 22;
const VEL_SMOOTHING = 0.5;
const PEAK_FOLLOW = 12;
/** Kapsulde ust kenar da sarkar ama alt kenardan az: aradaki fark "sunme"dir. Yapisik cubukta 0. */
const TOP_FACTOR_FLOATING = 0.45;
/** Icerik parcalari (logo, arama, rozetler) kendi orta noktalarindaki sarkmayi izler ve egime gore yatar. */
const CONTENT_SLOPE_STEP = 12;

/** Yaylar [sertlik 1/s^2, sonum 1/s]. Kritik altinda: bir-iki salinim. Siki: kaydirmayi aninda izler. */
const SPRING_BOUNCY: [number, number] = [260, 17];
const SPRING_TIGHT: [number, number] = [700, 50];

/** Deform haritasi: alan puruzsuz (tumsek >= 160px), 64x8 ornek yeter; feImage aradaki degerleri yumusatir. */
const DEFORM_COLS = 64;
const DEFORM_ROWS = 8;
const MAX_DT = 0.032;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (t: number) => t * t * (3 - 2 * t);

class Spring {
    value: number;
    velocity = 0;

    constructor(value: number) {
        this.value = value;
    }

    step(target: number, dt: number, [stiffness, damping]: [number, number], instant: boolean) {
        if (instant) {
            this.value = target;
            this.velocity = 0;
            return;
        }
        const acceleration = stiffness * (target - this.value) - damping * this.velocity;
        this.velocity += acceleration * dt;
        this.value += this.velocity * dt;
    }

    settled(target: number) {
        return Math.abs(target - this.value) < 0.05 && Math.abs(this.velocity) < 1;
    }
}

export interface TopbarRefs {
    header: RefObject<HTMLElement | null>;
    body: RefObject<HTMLDivElement | null>;
    shadow: RefObject<HTMLDivElement | null>;
    skinSolid: RefObject<HTMLDivElement | null>;
    skinGlass: RefObject<HTMLDivElement | null>;
    content: RefObject<HTMLDivElement | null>;
    neck: RefObject<HTMLSpanElement | null>;
    rimSvg: RefObject<SVGSVGElement | null>;
    rimGlass: RefObject<SVGPathElement | null>;
    rimGlow: RefObject<SVGPathElement | null>;
    rimTear: RefObject<SVGPathElement | null>;
    rimLine: RefObject<SVGPathElement | null>;
}

export interface TopbarMotion {
    /** Cubuk ust kenardan kopmus, kapsul halinde. */
    floating: boolean;
    /** Soyulma basladi (kaydirma > 0) ya da kapsul: cam filtresi acik tutulur. */
    engaged: boolean;
    /** Kaydirma kabinin dikey kaydirma cubugu genisligi (px); cubuk onun ustune binmez. */
    scrollbar: number;
}

/**
 * Kaydirma kabini izler, kopma/yapisma durumunu React'e verir (CSS opaklik gecisleri icin);
 * geometri ve esneme React'e ugramadan her karede dogrudan DOM'a yazilir. Dongu yalniz
 * gerektiginde calisir: kaydirma, isaretci, boyut degisimi ya da durum gecisi uyandirir; yaylar
 * durulunca durur.
 */
export function useTopbarMotion(refs: TopbarRefs): TopbarMotion {
    const pathname = usePathname();
    const [motion, setMotion] = useState<TopbarMotion>({ floating: false, engaged: false, scrollbar: 0 });

    useEffect(() => {
        const main = document.getElementById(APP_SCROLL_ID);
        const header = refs.header.current;
        const body = refs.body.current;
        const shadow = refs.shadow.current;
        const skinSolid = refs.skinSolid.current;
        const skinGlass = refs.skinGlass.current;
        const content = refs.content.current;
        const neck = refs.neck.current;
        const rimSvg = refs.rimSvg.current;
        const rimGlass = refs.rimGlass.current;
        const rimGlow = refs.rimGlow.current;
        const rimTear = refs.rimTear.current;
        const rimLine = refs.rimLine.current;
        if (!main || !header || !body || !shadow || !skinSolid || !skinGlass || !content || !neck || !rimSvg || !rimGlass || !rimGlow || !rimTear || !rimLine) return;

        // Cam katmani (GlassSurface): kirpma ATA elemana konamaz, clip-path tasiyan ata "backdrop root"
        // olur ve backdrop-filter altindaki sayfayi goremez; bu yuzden katmanin kendisi kirpilir.
        const refract = body.querySelector<HTMLElement>(".glass-refract");
        const lensImage = body.querySelector<SVGFEImageElement>('feImage[data-glass="lens"]');
        const deformImage = body.querySelector<SVGFEImageElement>('feImage[data-glass="deform"]');
        const followers = Array.from(content.querySelectorAll<HTMLElement>("[data-follow]"));
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const mobileQuery = window.matchMedia("(max-width: 767px)");

        const deformCanvas = document.createElement("canvas");
        deformCanvas.width = DEFORM_COLS;
        deformCanvas.height = DEFORM_ROWS;
        const deformContext = deformCanvas.getContext("2d");
        const deformPixels = deformContext?.createImageData(DEFORM_COLS, DEFORM_ROWS);

        const barTop = new Spring(0);
        const inset = new Spring(0);
        const radius = new Spring(0);
        const height = new Spring(BAR_HEIGHT);
        const sag = new Spring(0);

        let frame = 0;
        let lastTime = 0;
        let lastTop = main.scrollTop;
        let velocity = 0;
        let peak = 0.5;
        let peakTarget = 0.5;
        let floating = false;
        let lastKey = "";
        let deformNeutral = true;
        let bodyLeft = 0;
        let bodyWidth = 1;
        let bodyHeight = BAR_HEIGHT;
        let float = mobileQuery.matches ? FLOAT_MOBILE : FLOAT_DESKTOP;

        const wake = () => {
            if (!frame) frame = requestAnimationFrame(step);
        };

        const publish = (nextFloating: boolean, engaged: boolean, scrollbar: number) => {
            setMotion((current) =>
                current.floating === nextFloating && current.engaged === engaged && current.scrollbar === scrollbar
                    ? current
                    : { floating: nextFloating, engaged, scrollbar }
            );
        };

        /** Lens haritasi kapsulun DINLENME olcusune gore; kapsul o olcuden sapinca feImage'a esnetilir. */
        const rebuildLensMap = () => {
            if (!lensImage) return;
            const pillHeight = BAR_HEIGHT - float.top;
            const pillWidth = Math.max(2, Math.round(bodyWidth - 2 * float.inset));
            const url = buildDisplacementMap(pillWidth, pillHeight, pillHeight / 2);
            if (url) lensImage.setAttribute("href", url);
        };

        const measureBody = () => {
            const rect = body.getBoundingClientRect();
            bodyLeft = rect.left;
            bodyWidth = Math.max(rect.width, 1);
            bodyHeight = Math.max(rect.height, BAR_HEIGHT);
            float = mobileQuery.matches ? FLOAT_MOBILE : FLOAT_DESKTOP;
            rebuildLensMap();
            lastKey = "";
        };

        const renderDeformMap = (shift: (x: number, y: number) => number) => {
            if (!deformContext || !deformPixels) return NEUTRAL_MAP;
            const data = deformPixels.data;
            for (let row = 0; row < DEFORM_ROWS; row++) {
                const y = ((row + 0.5) / DEFORM_ROWS) * bodyHeight;
                for (let col = 0; col < DEFORM_COLS; col++) {
                    const x = ((col + 0.5) / DEFORM_COLS) * bodyWidth;
                    // Cikis pikseli (x,y) kaynagi y - shift'ten okur: G < 128 yukari alir (negatif yer degistirme).
                    const g = clamp(Math.round(128 - (shift(x, y) / DEFORM_SCALE) * 255), 0, 255);
                    const i = (row * DEFORM_COLS + col) * 4;
                    data[i] = 128;
                    data[i + 1] = g;
                    data[i + 2] = 128;
                    data[i + 3] = 255;
                }
            }
            deformContext.putImageData(deformPixels, 0, 0);
            return deformCanvas.toDataURL();
        };

        const draw = (peel: number) => {
            const x0 = inset.value;
            const x1 = bodyWidth - inset.value;
            const y0 = barTop.value;
            const y1 = y0 + height.value;
            const sagValue = Math.abs(sag.value) < 0.02 ? 0 : sag.value;
            const neckWidth = floating || y0 <= 0.05 ? 0 : lerp(bodyWidth * NECK_MAX_RATIO, NECK_MIN, Math.pow(peel, 1.5));
            const topFactor = floating ? TOP_FACTOR_FLOATING : 0;
            const geometry = { x0, x1, y0, y1, radius: radius.value, width: bodyWidth, sag: sagValue, peak, topFactor, neckWidth };

            // 0.05px altindaki degisimler cizilmez: durulmus cubuk icin DOM'a dokunulmaz.
            const key = [x0, x1, y0, y1, radius.value, sagValue, peak * 1000, topFactor, neckWidth, floating ? 1 : 0, peel]
                .map((value) => Math.round(value * 20))
                .join("|");
            if (key === lastKey) return;
            lastKey = key;

            const outline = buildTopbarOutline(geometry);
            const clip = `path("${outline.body}")`;
            skinSolid.style.clipPath = clip;
            skinGlass.style.clipPath = clip;
            shadow.style.clipPath = clip;
            rimSvg.style.clipPath = clip;
            if (refract) refract.style.clipPath = clip;
            rimGlass.setAttribute("d", outline.body);
            rimGlow.setAttribute("d", outline.body);
            rimLine.setAttribute("d", outline.bottom);
            rimTear.setAttribute("d", outline.tear);
            // Yirtik kenar cizgisi soyulma ilerledikce belirir; kapsulde cam rim'i devralir.
            rimTear.style.opacity = floating ? "0" : Math.min(1, peel * 1.4).toFixed(2);

            // Icerik parcalari: govdenin orta hattindaki sarkmayi kendi konumlarinda izler; katı bir
            // "ikinci katman" kalmaz. Olcumler yazimlardan once (layout tekrar hesaplanmasin).
            const shift = createShiftField(geometry);
            const midY = y0 + height.value / 2;
            const transforms = followers.map((part) => {
                if (!sagValue) return "";
                const cx = x0 + part.offsetLeft + part.offsetWidth / 2;
                const dy = shift(cx, midY);
                const slope = (shift(cx + CONTENT_SLOPE_STEP, midY) - shift(cx - CONTENT_SLOPE_STEP, midY)) / (2 * CONTENT_SLOPE_STEP);
                return `translateY(${dy.toFixed(2)}px) rotate(${Math.atan(slope).toFixed(4)}rad)`;
            });
            followers.forEach((part, i) => {
                part.style.transform = transforms[i];
            });

            const style = content.style;
            style.left = `${x0.toFixed(2)}px`;
            style.right = `${(bodyWidth - x1).toFixed(2)}px`;
            style.top = `${y0.toFixed(2)}px`;
            style.height = `${height.value.toFixed(2)}px`;
            style.borderRadius = `${radius.value.toFixed(2)}px`;

            if (lensImage) {
                lensImage.setAttribute("x", x0.toFixed(2));
                lensImage.setAttribute("y", y0.toFixed(2));
                lensImage.setAttribute("width", Math.max(1, x1 - x0).toFixed(2));
                lensImage.setAttribute("height", Math.max(1, height.value).toFixed(2));
            }
            if (deformImage) {
                if (sagValue !== 0 && floating) {
                    deformImage.setAttribute("href", renderDeformMap(shift));
                    deformImage.setAttribute("width", bodyWidth.toFixed(2));
                    deformImage.setAttribute("height", bodyHeight.toFixed(2));
                    deformNeutral = false;
                } else if (!deformNeutral) {
                    deformImage.setAttribute("href", NEUTRAL_MAP);
                    deformNeutral = true;
                }
            }
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
                if (floating && !reduced) {
                    // Kopma: boyun birakildi, cubuk asagi savrulur (yay geri ceker), govde bir nabiz atar.
                    barTop.velocity += SNAP_IMPULSE;
                    sag.velocity += SNAP_SAG_IMPULSE;
                    // Ust kenarda kalan boyun kalintisi (CSS animasyonu) koptugu yerde belirir.
                    neck.style.left = `${(peak * bodyWidth - 24).toFixed(0)}px`;
                }
            }
            const peel = floating ? 1 : Math.min(top / DETACH_AT, 1);
            publish(floating, peel > 0, main.offsetWidth - main.clientWidth);
            // Soyulma ilerledikce cam, golge ve rim belirir, opak deri solar (CSS --peel'den okur);
            // kopmada hepsi zaten yerindedir, CSS gecisi beklemez.
            header.style.setProperty("--peel", peel.toFixed(3));
            const eased = smoothstep(peel);
            const pillHeight = BAR_HEIGHT - float.top;
            barTop.step(floating ? float.top : PULL_Y * peel, dt, SPRING_BOUNCY, reduced);
            inset.step(float.inset * eased, dt, SPRING_TIGHT, reduced);
            radius.step((pillHeight / 2) * eased, dt, SPRING_TIGHT, reduced);
            height.step(lerp(BAR_HEIGHT, pillHeight, eased), dt, SPRING_TIGHT, reduced);
            const pull = reduced ? 0 : clamp(velocity * PULL_GAIN, -PULL_MAX_UP, PULL_MAX_DOWN);
            sag.step(pull, dt, SPRING_BOUNCY, reduced);
            peak += (peakTarget - peak) * (1 - Math.exp(-PEAK_FOLLOW * dt));

            draw(peel);

            const settled =
                barTop.settled(floating ? float.top : PULL_Y * peel) &&
                inset.settled(float.inset * eased) &&
                radius.settled((pillHeight / 2) * eased) &&
                height.settled(lerp(BAR_HEIGHT, pillHeight, eased)) &&
                sag.settled(pull) &&
                Math.abs(instant) < 1 &&
                Math.abs(velocity) < 2 &&
                Math.abs(peakTarget - peak) < 0.002;
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
            wake();
        };

        measureBody();
        wake();
        if (process.env.NODE_ENV !== "production") {
            // Gelistirme: tarayici konsolundan fizik durumunu okumak icin (window.__topbar()).
            (window as unknown as { __topbar?: () => unknown }).__topbar = () => ({
                floating,
                velocity,
                sag: sag.value,
                barTop: barTop.value,
                inset: inset.value,
                radius: radius.value,
                height: height.value,
                peak,
                lastKey,
            });
        }
        main.addEventListener("scroll", wake, { passive: true });
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("touchstart", onTouch, { passive: true });
        window.addEventListener("touchmove", onTouch, { passive: true });
        mobileQuery.addEventListener("change", onResize);
        // Kaydirma cubugu icerikle gelip gidebilir (kisa/uzun sayfa); govde genisligi de degisir.
        const observer = new ResizeObserver(onResize);
        observer.observe(main);
        observer.observe(body);

        return () => {
            main.removeEventListener("scroll", wake);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("touchstart", onTouch);
            window.removeEventListener("touchmove", onTouch);
            mobileQuery.removeEventListener("change", onResize);
            observer.disconnect();
            if (frame) cancelAnimationFrame(frame);
        };
    }, [pathname, refs]);

    return motion;
}
