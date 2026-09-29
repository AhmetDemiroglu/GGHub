const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const ease = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const DETACH_AT = 72;
const ATTACH_AT = 2;
const BAR_HEIGHT = 56;

type Mode = "attached" | "floating" | "returning";

class Spring {
    value = 0;
    velocity = 0;

    set(value: number, velocity = 0) {
        this.value = value;
        this.velocity = velocity;
    }

    /** Substeps keep the spring stable on slow devices and after tab pauses. */
    step(target: number, stiffness: number, damping: number, dt: number) {
        const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
        const h = dt / steps;
        for (let i = 0; i < steps; i++) {
            this.velocity += (stiffness * (target - this.value) - damping * this.velocity) * h;
            this.value += this.velocity * h;
        }
        if (Math.abs(target - this.value) < 0.02 && Math.abs(this.velocity) < 0.1) this.set(target);
        return this.value === target;
    }
}

export interface TopbarState {
    top: number;
    inset: number;
    height: number;
    radius: number;
    /** 0: both ends are strands glued to the walls. 1: both ends are round caps. */
    morph: number;
    /** Strand thickness on the wall and at its thinnest point. */
    wall: number;
    neck: number;
    /** Residue left on the wall after the break. 1 means fully retracted. */
    stub: number;
    stubLength: number;
    stubWall: number;
    /** Eased pull, 0 at rest and 1 at the breaking point. */
    peel: number;
    /** How much of the surface is glass instead of the page background. */
    glass: number;
    lens: number;
    tether: number;
    floating: boolean;
    settled: boolean;
}

/**
 * An elastic band glued to both walls. Scrolling pulls the body down and inward while the
 * strands thin out; at the threshold they break and the body recoils into a rigid capsule.
 */
export class TopbarPhysics {
    private mode: Mode;
    private pull: number;
    private fresh = true;
    private top = new Spring();
    private inset = new Spring();
    private height = new Spring();
    private morph = 1;
    private stub = 1;
    private stubLength = 0;
    private stubWall = 0;
    private returned = 0;
    private from = { top: 0, inset: 0, height: BAR_HEIGHT, radius: 0 };
    private lens = 0;
    private drift = 0;
    private previousScroll: number;

    constructor(scrollTop = 0) {
        const scroll = Math.max(0, scrollTop);
        this.previousScroll = scroll;
        this.mode = scroll >= DETACH_AT ? "floating" : "attached";
        this.pull = this.mode === "floating" ? 1 : scroll / DETACH_AT;
    }

    step(scrollTop: number, dt: number, mobile: boolean, reduced: boolean, width = 1280): TopbarState {
        const scroll = Math.max(0, scrollTop);
        const delta = scroll - this.previousScroll;
        this.previousScroll = scroll;
        dt = clamp(dt, 0, 2);

        const rest = { top: mobile ? 6 : 8, inset: mobile ? 8 : 12, height: BAR_HEIGHT - (mobile ? 6 : 8) };
        const peak = {
            top: mobile ? 20 : 26,
            inset: clamp(width * 0.05, 18, 72),
            height: rest.height - 4,
        };

        if (this.fresh) {
            this.fresh = false;
            if (this.mode === "floating") {
                this.top.set(rest.top);
                this.inset.set(rest.inset);
                this.height.set(rest.height);
                this.lens = 1;
            }
        }
        if (reduced) return this.stepReduced(scroll, rest);

        if (this.mode === "floating" && scroll <= ATTACH_AT) {
            this.mode = "returning";
            this.returned = 0;
            this.from = {
                top: this.top.value,
                inset: Math.max(0, this.inset.value),
                height: this.height.value,
                radius: this.height.value / 2,
            };
        }

        if (this.mode === "returning") {
            this.returned = Math.min(1, this.returned + dt / 0.26);
            if (this.returned === 1) {
                this.mode = "attached";
                this.pull = 0;
            }
        }

        if (this.mode === "attached") {
            const target = clamp(scroll / DETACH_AT, 0, 1);
            // A wheel flick still shows the whole stretch instead of skipping to the capsule.
            this.pull += clamp(target - this.pull, -dt / 0.18, dt / 0.26);
            if (scroll >= DETACH_AT && this.pull >= 0.999) this.snap(rest, peak);
        }

        if (this.mode === "floating") return this.stepFloating(delta, dt, rest);
        if (this.mode === "returning") return this.stepReturning(dt);
        return this.stepAttached(scroll, dt, peak);
    }

    private snap(rest: { top: number; inset: number; height: number }, peak: { top: number; inset: number; height: number }) {
        this.mode = "floating";
        this.pull = 1;
        this.morph = 0;
        this.stub = 0;
        this.stubLength = (peak.inset + peak.height / 2) * 0.3;
        this.stubWall = 14;
        // Released tension throws the body down and its ends inward before it settles.
        this.top.set(peak.top, 320);
        this.inset.set(peak.inset, 9 * (peak.inset - rest.inset));
        this.height.set(peak.height, 90);
    }

    private stepAttached(scroll: number, dt: number, peak: { top: number; inset: number; height: number }): TopbarState {
        const e = ease(this.pull);
        this.lens += (0 - this.lens) * (1 - Math.exp(-30 * dt));
        if (this.lens < 0.004) this.lens = 0;
        const height = lerp(BAR_HEIGHT, peak.height, e);
        return {
            top: peak.top * e,
            inset: peak.inset * e,
            height,
            radius: height / 2,
            morph: 0,
            wall: lerp(BAR_HEIGHT, 14, e),
            neck: lerp(BAR_HEIGHT, 3, ease(clamp(this.pull * 1.2, 0, 1))),
            stub: 1,
            stubLength: 0,
            stubWall: 0,
            peel: e,
            glass: clamp(e * 1.5, 0, 1),
            lens: this.lens,
            tether: this.pull > 0 ? 1 : 0,
            floating: false,
            settled: Math.abs(this.pull - clamp(scroll / DETACH_AT, 0, 1)) < 0.001 && this.lens === 0,
        };
    }

    private stepFloating(delta: number, dt: number, rest: { top: number; inset: number; height: number }): TopbarState {
        this.morph = Math.min(1, this.morph + dt / 0.22);
        this.stub = Math.min(1, this.stub + dt / 0.18);
        const calm = this.morph === 1;
        const driftTarget = calm && dt > 0 ? clamp(delta / dt * 0.0006, -0.6, 1.2) : 0;
        this.drift += (driftTarget - this.drift) * (1 - Math.exp(-12 * dt));
        if (Math.abs(this.drift) < 0.01 && driftTarget === 0) this.drift = 0;

        const topDone = this.top.step(rest.top + this.drift, 300, 20, dt);
        const insetDone = this.inset.step(rest.inset, 240, 17, dt);
        const heightDone = this.height.step(rest.height, 380, 18, dt);

        const inset = Math.max(0, this.inset.value);
        const height = clamp(this.height.value, 32, BAR_HEIGHT + 4);
        // The lens map is a fixed capsule, so it only appears once the body is that capsule.
        const quiet = clamp(1 - Math.abs(inset - rest.inset) / 6 - Math.abs(height - rest.height) / 2, 0, 1);
        const lensTarget = ease(this.morph) * quiet;
        this.lens += (lensTarget - this.lens) * (1 - Math.exp(-10 * dt));
        if (Math.abs(lensTarget - this.lens) < 0.004) this.lens = lensTarget;

        return {
            top: Math.max(0, this.top.value),
            inset,
            height,
            radius: height / 2,
            // Fast start, soft landing: the torn strand whips back into the cap.
            morph: 1 - Math.pow(1 - this.morph, 3),
            wall: 14,
            neck: 3,
            stub: ease(this.stub),
            stubLength: this.stubLength,
            stubWall: this.stubWall,
            peel: 1,
            glass: 1,
            lens: this.lens,
            tether: 1 - this.morph,
            floating: true,
            settled: calm && this.stub === 1 && topDone && insetDone && heightDone
                && this.drift === 0 && this.lens === lensTarget,
        };
    }

    private stepReturning(dt: number): TopbarState {
        const e = ease(this.returned);
        this.lens += (0 - this.lens) * (1 - Math.exp(-30 * dt));
        this.top.set(0);
        this.inset.set(0);
        this.height.set(BAR_HEIGHT);
        this.drift = 0;
        return {
            top: lerp(this.from.top, 0, e),
            inset: lerp(this.from.inset, 0, e),
            height: lerp(this.from.height, BAR_HEIGHT, e),
            radius: lerp(this.from.radius, 0, e),
            morph: 1,
            wall: BAR_HEIGHT,
            neck: BAR_HEIGHT,
            stub: 1,
            stubLength: 0,
            stubWall: 0,
            peel: 1 - e,
            glass: 1 - e,
            lens: this.lens,
            tether: 0,
            floating: false,
            settled: false,
        };
    }

    private stepReduced(scroll: number, rest: { top: number; inset: number; height: number }): TopbarState {
        if (this.mode !== "floating" && scroll >= DETACH_AT) this.mode = "floating";
        else if (this.mode !== "attached" && scroll <= ATTACH_AT) this.mode = "attached";
        else if (this.mode === "returning") this.mode = "attached";
        const floating = this.mode === "floating";
        this.pull = floating ? 1 : clamp(scroll / DETACH_AT, 0, 1);
        const e = ease(this.pull);
        const height = lerp(BAR_HEIGHT, rest.height, e);
        this.top.set(rest.top);
        this.inset.set(rest.inset);
        this.height.set(rest.height);
        this.morph = 1;
        this.stub = 1;
        this.drift = 0;
        this.lens = floating ? 1 : 0;
        return {
            top: rest.top * e,
            inset: rest.inset * e,
            height,
            radius: height / 2 * e,
            morph: 1,
            wall: BAR_HEIGHT,
            neck: BAR_HEIGHT,
            stub: 1,
            stubLength: 0,
            stubWall: 0,
            peel: e,
            glass: e,
            lens: this.lens,
            tether: 0,
            floating,
            settled: true,
        };
    }
}
