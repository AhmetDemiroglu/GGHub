"use client";

import { useMemo } from "react";

const PIECE_COUNT = 60;

/** Marka paleti (#00E5FF / #7C4DFF) artı üç aksan. */
const COLORS = ["#00E5FF", "#7C4DFF", "#f59e0b", "#22c55e", "#f43f5e"];

/**
 * DETERMINISTIK sozde-rastgele.
 *
 * Math.random() BILEREK kullanilmiyor: sunucu render'i ile ilk istemci render'i farkli
 * degerler uretir ve React hydration uyusmazligi verir. Bu fonksiyon ayni indeks icin
 * her zaman ayni sonucu doner.
 */
function seeded(index: number, salt: number): number {
    const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
}

/**
 * Tam ekran konfeti yagmuru. Sabit konumlu, tiklamalari GECIRIR (pointer-events-none),
 * uc tur donup durur ve prefers-reduced-motion altinda hic cizilmez (globals.css).
 */
export function Confetti() {
    const pieces = useMemo(
        () =>
            Array.from({ length: PIECE_COUNT }, (_, i) => {
                const left = seeded(i, 1) * 100;
                const width = 6 + seeded(i, 2) * 6;
                const height = 8 + seeded(i, 3) * 10;
                const delay = seeded(i, 4) * 4;
                const duration = 3.4 + seeded(i, 5) * 2.6;
                const drift = (seeded(i, 6) - 0.5) * 220;
                const spin = 360 + seeded(i, 7) * 720;
                const color = COLORS[i % COLORS.length];

                return { i, left, width, height, delay, duration, drift, spin, color };
            }),
        []
    );

    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
            {pieces.map((piece) => (
                <span
                    key={piece.i}
                    className="confetti-piece"
                    style={
                        {
                            left: `${piece.left}%`,
                            width: `${piece.width}px`,
                            height: `${piece.height}px`,
                            backgroundColor: piece.color,
                            animationDelay: `${piece.delay}s`,
                            animationDuration: `${piece.duration}s`,
                            "--confetti-drift": `${piece.drift}px`,
                            "--confetti-spin": `${piece.spin}deg`,
                        } as React.CSSProperties
                    }
                />
            ))}
        </div>
    );
}
