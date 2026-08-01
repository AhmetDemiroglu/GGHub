"use client";

/** Mumlar. Alevler faz farkli titresin diye gecikmeleri de burada. */
const CANDLES = [
    { x: 76, delay: "0s" },
    { x: 100, delay: "0.37s" },
    { x: 124, delay: "0.74s" },
];

/** Ust kat kremasinin sarkma damlalari. */
const TOP_DRIPS = [67, 76.5, 86, 95.5, 105, 114.5, 124, 133.5];

/** Alt kat kremasinin sarkma damlalari. */
const BOTTOM_DRIPS = [45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 145, 155];

/** Pastanin uzerindeki serpme sekerler: konum, aci, renk. */
const SPRINKLES = [
    { x: 72, y: 112, r: -25, c: "#facc15" },
    { x: 92, y: 118, r: 15, c: "#f43f5e" },
    { x: 112, y: 110, r: 40, c: "#22c55e" },
    { x: 128, y: 119, r: -10, c: "#38bdf8" },
    { x: 52, y: 150, r: 20, c: "#f43f5e" },
    { x: 70, y: 159, r: -30, c: "#facc15" },
    { x: 90, y: 149, r: 45, c: "#38bdf8" },
    { x: 110, y: 160, r: 10, c: "#22c55e" },
    { x: 130, y: 150, r: -20, c: "#facc15" },
    { x: 148, y: 158, r: 35, c: "#f43f5e" },
];

/** Pastanin cevresinde parildayan yildizlar. */
const SPARKLES = [
    { x: 30, y: 62, s: 1.3, d: "0s" },
    { x: 170, y: 68, s: 1.05, d: "0.4s" },
    { x: 42, y: 114, s: 0.85, d: "0.8s" },
    { x: 160, y: 104, s: 1.2, d: "0.2s" },
    { x: 22, y: 144, s: 1, d: "1s" },
    { x: 178, y: 148, s: 0.85, d: "0.6s" },
    { x: 100, y: 14, s: 1.15, d: "1.2s" },
];

/** Dort kollu parilti yildizi (0,0 merkezli, yaricap 9). */
const STAR_PATH = "M0,-9 Q1.5,-1.5 9,0 Q1.5,1.5 0,9 Q-1.5,1.5 -9,0 Q-1.5,-1.5 0,-9 Z";

/**
 * Animasyonlu dogum gunu pastasi.
 *
 * Tamami inline SVG + globals.css keyframe'leri; ek bir animasyon bagimliligi yok.
 * Mumlar faz farkli yanar, cevredeki yildizlar sirayla parildar, pasta yaylanarak
 * girer. prefers-reduced-motion altinda hareket durur ama pasta tam olarak gorunur.
 */
export function BirthdayCake() {
    return (
        <svg viewBox="0 0 200 200" role="img" aria-hidden className="birthday-rise h-48 w-48 md:h-60 md:w-60">
            <defs>
                <linearGradient id="cake-frosting" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#7C4DFF" />
                    <stop offset="100%" stopColor="#00E5FF" />
                </linearGradient>
                <linearGradient id="cake-drip" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.72" />
                </linearGradient>
                <linearGradient id="cake-flame" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fff3b0" />
                    <stop offset="55%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
                <radialGradient id="cake-glow">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                </radialGradient>
            </defs>

            {/* Parildayan yildizlar, pastanin arkasinda */}
            {SPARKLES.map((sparkle) => (
                // Konumlandirma DIS grupta, animasyon IC grupta olmak ZORUNDA: SVG'de CSS
                // transform, transform ATTRIBUTE'unu ezer. Ikisi ayni dugumde olsaydi
                // keyframe'deki scale() translate'i silip yildizi (0,0)'a firlatirdi.
                <g key={`${sparkle.x}-${sparkle.y}`} transform={`translate(${sparkle.x} ${sparkle.y}) scale(${sparkle.s})`}>
                    <g className="birthday-sparkle" style={{ animationDelay: sparkle.d }}>
                        <path d={STAR_PATH} fill="#fbbf24" opacity={0.85} />
                        <circle cx={0} cy={0} r={2.2} fill="#fffbeb" />
                    </g>
                </g>
            ))}

            {/* Mumlar: hale, alev, fitil, govde */}
            {CANDLES.map((candle) => (
                <g key={candle.x}>
                    <circle
                        className="birthday-glow"
                        cx={candle.x}
                        cy={48}
                        r={14}
                        fill="url(#cake-glow)"
                        style={{ animationDelay: candle.delay }}
                    />

                    <g className="birthday-flame" style={{ animationDelay: candle.delay }}>
                        <path
                            d={`M ${candle.x} 38 C ${candle.x + 4.8} 45 ${candle.x + 4.8} 52 ${candle.x} 56 C ${candle.x - 4.8} 52 ${candle.x - 4.8} 45 ${candle.x} 38 Z`}
                            fill="url(#cake-flame)"
                        />
                        <ellipse cx={candle.x} cy={51} rx={1.8} ry={2.9} fill="#fff9db" opacity={0.9} />
                    </g>

                    <line x1={candle.x} y1={57} x2={candle.x} y2={62} stroke="#57534e" strokeWidth={1.8} strokeLinecap="round" />

                    <rect x={candle.x - 3.5} y={62} width={7} height={30} rx={3} fill="#fdf4ff" />
                    <rect x={candle.x - 3.5} y={68} width={7} height={3.5} fill="#7C4DFF" opacity={0.55} />
                    <rect x={candle.x - 3.5} y={76} width={7} height={3.5} fill="#f43f5e" opacity={0.5} />
                    <rect x={candle.x - 3.5} y={84} width={7} height={3.5} fill="#7C4DFF" opacity={0.55} />
                </g>
            ))}

            {/* Ust kat */}
            <rect x={62} y={92} width={76} height={36} rx={8} fill="url(#cake-frosting)" />
            <rect x={62} y={92} width={76} height={9} rx={4.5} fill="url(#cake-drip)" />
            {TOP_DRIPS.map((x) => (
                <circle key={`top-${x}`} cx={x} cy={101} r={4.5} fill="url(#cake-drip)" />
            ))}

            {/* Alt kat */}
            <rect x={40} y={128} width={120} height={42} rx={10} fill="url(#cake-frosting)" />
            <rect x={40} y={128} width={120} height={10} rx={5} fill="url(#cake-drip)" />
            {BOTTOM_DRIPS.map((x) => (
                <circle key={`bottom-${x}`} cx={x} cy={138} r={5} fill="url(#cake-drip)" />
            ))}

            {/* Serpme sekerler */}
            {SPRINKLES.map((sprinkle) => (
                <rect
                    key={`${sprinkle.x}-${sprinkle.y}`}
                    x={-1.2}
                    y={-3.5}
                    width={2.4}
                    height={7}
                    rx={1.2}
                    fill={sprinkle.c}
                    transform={`translate(${sprinkle.x} ${sprinkle.y}) rotate(${sprinkle.r})`}
                />
            ))}

            {/* Tabak */}
            <ellipse cx={100} cy={174} rx={78} ry={9} fill="currentColor" opacity={0.14} />
            <ellipse cx={100} cy={172} rx={62} ry={5} fill="currentColor" opacity={0.08} />
        </svg>
    );
}
