/**
 * Outline of the elastic bar. The middle is always a straight, rigid body. Only the two ends
 * change: they are strands glued to the walls (morph 0), round caps (morph 1) or a blend.
 */
export interface OutlineInput {
    width: number;
    top: number;
    inset: number;
    height: number;
    radius: number;
    morph: number;
    wall: number;
    neck: number;
    stub: number;
    stubLength: number;
    stubWall: number;
}

export interface TopbarOutline {
    /** Closed silhouette, used as the clip of every surface. */
    fill: string;
    /** Free edges only. Wall contact is never stroked. */
    rim: string;
}

type Point = [number, number];

const EDGE_SAMPLES = 28;
const STUB_SAMPLES = 8;
/** Thinnest point of the strand, measured from the wall. */
const NECK_AT = 0.3;

const f = (value: number) => Number(value.toFixed(2));
const ease = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Thickness and midline of a strand. u is 0 on the wall and 1 where the body begins. */
function strand(u: number, input: OutlineInput): { top: number; bottom: number } {
    const { top, height, wall, neck } = input;
    const toBody = u > NECK_AT ? ease((u - NECK_AT) / (1 - NECK_AT)) : 0;
    const toWall = u < NECK_AT ? ease(1 - u / NECK_AT) : 0;
    const thickness = neck + (height - neck) * toBody + (wall - neck) * toWall;
    const middle = lerp(wall / 2, top + height / 2, ease(u));
    return { top: middle - thickness / 2, bottom: middle + thickness / 2 };
}

/** Left end, ordered from the body's top edge, around the end, to the body's bottom edge. */
function leftEnd(input: OutlineInput): Point[] {
    const { top, inset, height, morph } = input;
    const limit = input.width / 2;
    const r = Math.max(0, Math.min(input.radius, height / 2));
    const reach = inset + height / 2;
    const upper: Point[] = [];
    const lower: Point[] = [];

    for (let i = 0; i < EDGE_SAMPLES; i++) {
        const t = i / (EDGE_SAMPLES - 1);
        const angle = t * Math.PI / 2;
        let upperPoint: Point = [inset + r - r * Math.sin(angle), top + r - r * Math.cos(angle)];
        let lowerPoint: Point = [inset + r - r * Math.cos(angle), top + height - r + r * Math.sin(angle)];
        if (morph < 1) {
            const down = strand(1 - t, input);
            const back = strand(t, input);
            upperPoint = [lerp(reach * (1 - t), upperPoint[0], morph), lerp(down.top, upperPoint[1], morph)];
            lowerPoint = [lerp(reach * t, lowerPoint[0], morph), lerp(back.bottom, lowerPoint[1], morph)];
        }
        upper.push([Math.min(upperPoint[0], limit), upperPoint[1]]);
        lower.push([Math.min(lowerPoint[0], limit), lowerPoint[1]]);
    }
    return [...upper, ...lower];
}

/** Residue on the wall: it keeps the strand's root and shrinks into the corner. */
function leftStub(input: OutlineInput): Point[] {
    const size = 1 - input.stub;
    if (size <= 0.001 || input.stubLength <= 0) return [];
    const length = Math.min(input.stubLength * size, input.width / 2);
    const wall = input.stubWall * size;
    const upper: Point[] = [];
    const lower: Point[] = [];
    for (let i = 0; i <= STUB_SAMPLES; i++) {
        const u = i / STUB_SAMPLES;
        const thickness = wall * (1 - ease(u));
        const middle = wall / 2 + wall * 0.35 * u;
        upper.push([length * u, middle - thickness / 2]);
        lower.push([length * u, middle + thickness / 2]);
    }
    return [...upper, ...lower.reverse()];
}

const line = (points: Point[]) => points.map(([x, y], i) => `${i ? "L" : "M"}${f(x)},${f(y)}`).join("");

export function buildTopbarOutline(input: OutlineInput): TopbarOutline {
    const width = Math.max(1, input.width);
    const mirror = ([x, y]: Point): Point => [width - x, y];
    const left = leftEnd({ ...input, width });
    const right = left.map(mirror);

    const body = `${line([...right, ...left.slice().reverse()])}Z`;
    const stub = leftStub({ ...input, width });
    const residue = stub.length ? `${line(stub)}Z${line(stub.map(mirror))}Z` : "";

    const attached = input.morph === 0;
    const rim = attached
        ? line([...left.slice(0, EDGE_SAMPLES).reverse(), ...right.slice(0, EDGE_SAMPLES)])
            + line([...left.slice(EDGE_SAMPLES), ...right.slice(EDGE_SAMPLES).reverse()])
        : body;

    return { fill: body + residue, rim };
}
