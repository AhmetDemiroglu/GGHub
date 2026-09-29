/**
 * Ust cubugun esnek silueti.
 *
 * Girdi: kapsulun (ya da yapisik cubugun) govde kutusuna gore dikdortgeni ve uc yaricapi.
 * Cikti: bu sekle, isaretcinin bulundugu noktada tepe yapan bir Gauss tumsegiyle dikey yer
 * degistirme uygulanmis kapali bir yol. Alt kenar tumsegi tam alir, ust kenar `topFactor`
 * kadar: yapisik cubukta ust kenar ekranin ustune yapisiktir (0), kapsulde govde de sarkar (~0.45).
 * Uclar da ayni alanla tasinir; tumsek bir uca yakinsa o uc digerinden fazla egilir
 * ("sagdan soldan bukulme"). sag = 0 iken cikti birebir dikdortgen/kapsuldur.
 *
 * Ayni yol iki koordinat sisteminde uretilir: govde (skin, golge, rim) ve kapsul (cam
 * katmanlari, kendi kutularina gore kirpilir). `bottom` yalniz alt kenardir (yapisik cubugun
 * ince alt cizgisi).
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
}

export interface Outline {
    /** Kapali yol, govde koordinatlari. */
    body: string;
    /** Ayni kapali yol, kapsul koordinatlari (x0,y0 cikarilmis). */
    capsule: string;
    /** Yalniz alt kenar, soldan saga, govde koordinatlari. */
    bottom: string;
}

/** Kenar basina ornek sayisi: 40 ornek 1.600 px'lik cubukta bile tumsegi puruzsuz cizer. */
const EDGE_SAMPLES = 40;
/** Yarim daire basina ornek: r=24px'te kiris hatasi 0.2px'in altinda. */
const CAP_SAMPLES = 10;
/** Tumsek genisligi: govdenin %22'si, en az 160px. Dar tumsek = cekilen taraf egilir, obur uc yerinde kalir. */
const BUMP_WIDTH_RATIO = 0.22;
const BUMP_MIN_WIDTH = 160;

const fmt = (value: number) => (Math.round(value * 100) / 100).toString();

const toPath = (points: number[][], closed: boolean, dx = 0, dy = 0) => {
    let d = "";
    for (let i = 0; i < points.length; i++) {
        d += `${i === 0 ? "M" : "L"}${fmt(points[i][0] - dx)},${fmt(points[i][1] - dy)}`;
    }
    return closed ? `${d}Z` : d;
};

export function buildTopbarOutline(input: OutlineInput): Outline {
    const { x0, x1, y0, y1, topFactor } = input;
    const h = y1 - y0;
    const r = Math.max(0, Math.min(input.radius, h / 2, (x1 - x0) / 2));
    const straight = x1 - x0 - 2 * r;
    const cy = y0 + h / 2;
    const peakX = input.peak * input.width;
    const bumpWidth = Math.max(input.width * BUMP_WIDTH_RATIO, BUMP_MIN_WIDTH);
    const sag = input.sag;

    const bump = (x: number) => {
        if (sag === 0) return 0;
        const t = (x - peakX) / bumpWidth;
        return sag * Math.exp(-3 * t * t);
    };
    // Bir noktanin dikey yer degistirmesi: yukseklik icindeki konumuna gore ust/alt oran arasi.
    const shift = (x: number, y: number) => {
        const u = h > 0 ? (y - y0) / h : 1;
        return bump(x) * (topFactor + (1 - topFactor) * u);
    };

    const outline: number[][] = [];
    const bottom: number[][] = [];
    const push = (x: number, y: number) => outline.push([x, y + shift(x, y)]);

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
    for (let i = 0; i <= EDGE_SAMPLES; i++) {
        const x = x1 - r - (straight * i) / EDGE_SAMPLES;
        push(x, y1);
        bottom.unshift(outline[outline.length - 1]);
    }

    // Sol uc: +90 -> +270 derece.
    if (r > 0.5) {
        for (let k = 1; k < CAP_SAMPLES; k++) {
            const a = Math.PI / 2 + (Math.PI * k) / CAP_SAMPLES;
            push(x0 + r + r * Math.cos(a), cy + r * Math.sin(a));
        }
    }

    return {
        body: toPath(outline, true),
        capsule: toPath(outline, true, x0, y0),
        bottom: toPath(bottom, false),
    };
}
