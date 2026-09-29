const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const ease = (t: number) => t * t * (3 - 2 * t);
const DETACH_AT = 48;
const ATTACH_AT = 2;

/** Stretch once. After release the whole capsule moves, never individual edges. */
export class TopbarPhysics {
    private peel: number;
    private floating: boolean;
    private release = 1;
    private top = 0;
    private velocity = 0;
    private previousScroll: number;
    private drift = 0;

    constructor(scrollTop = 0) {
        this.previousScroll = Math.max(0, scrollTop);
        this.floating = scrollTop >= DETACH_AT;
        this.peel = this.floating ? 1 : clamp(scrollTop / DETACH_AT, 0, 1);
        this.top = this.floating ? 8 : 24 * ease(this.peel);
    }

    step(scrollTop: number, dt: number, mobile: boolean, reduced: boolean) {
        const scroll = Math.max(0, scrollTop);
        const rest = mobile ? 6 : 8;
        const delta = scroll - this.previousScroll;
        this.previousScroll = scroll;
        dt = clamp(dt, 0, 0.032);

        if (this.floating && scroll <= ATTACH_AT) {
            this.floating = false;
            this.release = 1;
            this.velocity = 0;
        }
        const targetPeel = this.floating ? 1 : clamp(scroll / DETACH_AT, 0, 1);
        // A wheel flick still shows the pull instead of skipping straight to a pill.
        const distance = targetPeel - this.peel;
        this.peel += reduced ? distance : clamp(distance, -dt / 0.16, dt / 0.18);
        const peel = ease(this.peel);

        if (!this.floating && scroll >= DETACH_AT && this.peel >= 0.999) {
            this.floating = true;
            this.release = reduced ? 1 : 0;
            this.top = 24;
            this.velocity = reduced ? 0 : 110;
        }

        const driftTarget = this.floating && this.release === 1 && dt > 0 ? clamp(delta / dt * 0.0006, -0.6, 1.2) : 0;
        this.drift += (driftTarget - this.drift) * (1 - Math.exp(-12 * dt));
        if (this.floating) {
            this.release = reduced ? 1 : Math.min(1, this.release + dt / 0.09);
            const target = rest + (reduced ? 0 : this.drift);
            // Substeps keep the spring stable on slow devices and after tab pauses.
            const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
            for (let i = 0; i < steps; i++) {
                const h = dt / steps;
                this.velocity += (340 * (target - this.top) - 27 * this.velocity) * h;
                this.top += this.velocity * h;
            }
            if (reduced || (Math.abs(this.top - target) < 0.015 && Math.abs(this.velocity) < 0.08)) {
                this.top = target;
                this.velocity = 0;
            }
        } else {
            // Return along a short path, without pulling down a second time.
            this.top = targetPeel < this.peel ? Math.min(this.top, 24 * peel) : 24 * peel;
            this.velocity = 0;
        }
        if (reduced) this.top = rest * peel;
        const tether = reduced ? 0 : this.floating ? 1 - ease(this.release) : peel > 0 ? 1 : 0;
        const height = 56 - rest * peel;
        return {
            top: this.top,
            inset: (mobile ? 8 : 12) * peel,
            height,
            radius: height / 2 * peel,
            peel,
            tether,
            floating: this.floating,
            lens: this.floating ? ease(this.release) : 0,
            settled: Math.abs(this.peel - targetPeel) < 0.001 && this.release === 1
                && (!this.floating || Math.abs(this.top - rest) < 0.03)
                && Math.abs(this.velocity) < 0.08 && Math.abs(this.drift) < 0.015,
        };
    }
}
