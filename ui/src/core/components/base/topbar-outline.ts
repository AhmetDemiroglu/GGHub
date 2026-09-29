/**
 * Ust cubugun esnek silueti.
 *
 * Girdi: cubugun govde kutusuna gore dikdortgeni (x0..x1, y0..y1), uc yaricapi ve iki alan:
 *   - cekme alani: isaretcinin bulundugu noktada tepe yapan Gauss tumsegi, dikey yer degistirme.
 *     Alt kenar tumsegi tam alir, ust kenar `topFactor` kadar; aradaki fark "sunme"dir.
 *     Uclar da ayni alanla tasinir: tumsek bir uca yakinsa o uc digerinden fazla egilir.
 *   - boyun (yalniz yapisik evre): cubuk ust kenardan soyulurken onu ekranin ustune (y=0)
 *     baglayan zar. Tepe noktasi cevresinde ust kenari y=0'a ceker; genisligi soyulma
 *     ilerledikce daralir ve kopmada sifirlanir.
 * sag = 0 ve boyun yokken cikti birebir dikdortgen/kapsuldur.
 *
 * Ayni yer degistirme alani (createShiftField) cam merceginin deform haritasini da besler:
 * siluet ile kirilma hep ayni yerde egilir.
 */
export interface OutlineInput {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    /** Uc yaricapi (px). 0 = keskin kose (yapisik cubuk). */
    radius: number;
    /** Govde genisligi (px); tumsek genisligi bundan turer. */
    width: number;
    /** Sarkma (px): + asagi, - yukari. */
    sag: number;
    /** Tepe noktasi, govde genisligine oran (0..1). */
    peak: number;
    /** Ust kenarin sarkmaya katilma orani (0..1). */
    topFactor: number;
    /** Boyun genisligi (px). 0 = boyun yok. */
    neckWidth: number;
}

export interface Outline {
    /** Kapali yol (skin, golge, cam, rim kirpmasi). */
    body: string;
    /** Yalniz alt kenar, soldan saga (yapisik cubugun ince cizgisi). */
    bottom: string;
    /** Alt kenar disinda kalan her sey: sol uc, ust kenar, sag uc (soyulan/yirtilan kenar). */
    tear: string;
}

/** Kenar basina ornek sayisi: 40 ornek 1.600 px'lik cubukta bile tumsegi puruzsuz cizer. */
const EDGE_SAMPLES = 40;
/** Yarim daire basina ornek: r=24px'te kiris hatasi 0.2px'in altinda. */
const CAP_SAMPLES = 10;
/** Tumsek genisligi: govdenin %30'u, en az 220px. Genis tumsek = govde suner; dar olsa ufak bir cikinti gibi okunur. */
const BUMP_WIDTH_RATIO = 0.3;
const BUMP_MIN_WIDTH = 220;

const fmt = (value: number) => (Math.round(value * 100) / 100).toString();

const toPath = (points: number[][], closed: boolean) => {
    let d = "";
    for (let i = 0; i < points.length; i++) {
        d += `${i === 0 ? "M" : "L"}${fmt(points[i][0])},${fmt(points[i][1])}`;
    }
    return closed ? `${d}Z` : d;
};

/**
 * Dikey yer degistirme alani (px). u = noktanin cubuk yuksekligindeki konumu (0 ust, 1 alt);
 * disari tasan noktalar (golge payi) alt kenar gibi davranir.
 */
export function createShiftField(input: Pick<OutlineInput, "y0" | "y1" | "width" | "sag" | "peak" | "topFactor">) {
    const { y0, y1, sag, topFactor } = input;
    const h = y1 - y0;
    const peakX = input.peak * input.width;
    const bumpWidth = Math.max(input.width * BUMP_WIDTH_RATIO, BUMP_MIN_WIDTH);

    return (x: number, y: number) => {
        if (sag === 0) return 0;
        const t = (x - peakX) / bumpWidth;
        const bump = sag * Math.exp(-3 * t * t);
        const u = h > 0 ? Math.min(1, Math.max(0, (y - y0) / h)) : 1;
        return bump * (topFactor + (1 - topFactor) * u);
    };
}

export function buildTopbarOutline(input: OutlineInput): Outline {
    const { x0, x1, y0, y1 } = input;
    const h = y1 - y0;
    const r = Math.max(0, Math.min(input.radius, h / 2, (x1 - x0) / 2));
    const straight = x1 - x0 - 2 * r;
    const cy = y0 + h / 2;
    const shift = createShiftField(input);

    // Boyun: tepe cevresinde ust kenari y=0'a ceker; alt kenara dogru etkisi soner.
    const peakX = input.peak * input.width;
    const neckWidth = input.neckWidth;
    // Iki olcekli profil: dar can (iplik gibi incelen boyun) + genis, zayif etek (boynun kokundeki
    // yayvan cekilme). Tek Gauss'la boyun ya kalin bir tepe ya da koksuz bir sivri olur.
    const neckPull = (x: number, y: number) => {
        if (neckWidth <= 0 || y0 <= 0) return 0;
        const t = (x - peakX) / neckWidth;
        const u = h > 0 ? Math.min(1, Math.max(0, (y - y0) / h)) : 0;
        const profile = 0.7 * Math.exp(-3 * t * t) + 0.3 * Math.exp(-(t * t) / 3);
        return profile * (1 - u) * (1 - u);
    };

    const outline: number[][] = [];
    const bottom: number[][] = [];
    const push = (x: number, y: number) => {
        const deformed = y + shift(x, y);
        outline.push([x, deformed * (1 - neckPull(x, y))]);
    };

    // Ust kenar, soldan saga.
    for (let i = 0; i <= EDGE_SAMPLES; i++) push(x0 + r + (straight * i) / EDGE_SAMPLES, y0);

    // Sag uc: -90 -> +90 derece (uc noktalar kenar orneklerinde zaten var).
    if (r > 0.5) {
        for (let k = 1; k < CAP_SAMPLES; k++) {
            const a = -Math.PI / 2 + (Math.PI * k) / CAP_SAMPLES;
            push(x1 - r + r * Math.cos(a), cy + r * Math.sin(a));
        }
    }

    // Alt kenar, sagdan sola (alt cizgi icin ayrica soldan saga toplanir).
    const bottomStart = outline.length;
    for (let i = 0; i <= EDGE_SAMPLES; i++) {
        push(x1 - r - (straight * i) / EDGE_SAMPLES, y1);
        bottom.unshift(outline[outline.length - 1]);
    }
    const bottomEnd = outline.length;

    // Sol uc: +90 -> +270 derece.
    if (r > 0.5) {
        for (let k = 1; k < CAP_SAMPLES; k++) {
            const a = Math.PI / 2 + (Math.PI * k) / CAP_SAMPLES;
            push(x0 + r + r * Math.cos(a), cy + r * Math.sin(a));
        }
    }

    // Yirtik kenar: alt kenarin son noktasindan (sol alt) baslar, sol uc, ust kenar, sag uc ile sag alta iner.
    const tear = [...outline.slice(bottomEnd - 1), ...outline.slice(0, bottomStart + 1)];

    return {
        body: toPath(outline, true),
        bottom: toPath(bottom, false),
        tear: toPath(tear, false),
    };
}
