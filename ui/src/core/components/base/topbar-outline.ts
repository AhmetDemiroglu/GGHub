/** A smooth capsule with a single, centered adhesive bridge during the first pull. */
export interface OutlineInput {
    width: number;
    inset: number;
    top: number;
    height: number;
    radius: number;
    peel: number;
    tether: number;
}

const f = (value: number) => Number(value.toFixed(3));

export function buildTopbarOutline(input: OutlineInput): string {
    const { width, top, height, peel, tether } = input;
    const left = Math.min(input.inset, Math.max(0, width / 2 - 1));
    const right = width - left;
    const bottom = top + height;
    const r = Math.max(0, Math.min(input.radius, height / 2, (right - left) / 2));
    const center = width / 2;
    const span = Math.min((right - left - 2 * r) / 2, Math.min(240, width * 0.3) * (1 - peel * 0.76));
    const root = Math.max(0.5, span * (0.3 - peel * 0.28)) * tether;
    const anchor = top * (1 - tether);
    const bridge = tether > 0.001 && top > 0.01 && span > 0
        ? `L${f(center - span)},${f(top)} C${f(center - span * 0.35)},${f(top)} ${f(center - root * 2)},${f(anchor)} ${f(center - root)},${f(anchor)} Q${f(center)},${f(anchor)} ${f(center + root)},${f(anchor)} C${f(center + root * 2)},${f(anchor)} ${f(center + span * 0.35)},${f(top)} ${f(center + span)},${f(top)}`
        : "";

    // Circular arcs match the lens map exactly, including intermediate radii.
    return `M${f(left + r)},${f(top)} ${bridge} L${f(right - r)},${f(top)} A${f(r)},${f(r)} 0 0 1 ${f(right)},${f(top + r)} L${f(right)},${f(bottom - r)} A${f(r)},${f(r)} 0 0 1 ${f(right - r)},${f(bottom)} L${f(left + r)},${f(bottom)} A${f(r)},${f(r)} 0 0 1 ${f(left)},${f(bottom - r)} L${f(left)},${f(top + r)} A${f(r)},${f(r)} 0 0 1 ${f(left + r)},${f(top)} Z`;
}
