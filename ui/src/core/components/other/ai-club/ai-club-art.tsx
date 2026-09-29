"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { cn } from "@/core/lib/utils";
import { AI_BOT_USERNAMES, aiBotAvatarUrl, aiPromoScript } from "@/core/lib/ai-bots";
import { getImageUrl } from "@/core/lib/get-image-url";
import type { AiClubLine } from "@/models/ai/ai-club.model";

/**
 * AI Kulubu'nun renkli, bol sekilli SVG arka plani. Tamamen dekor (aria-hidden); icerik
 * ustune biner. Sekillerin konumlari sabit (rastgele degil): SSR ile istemci ayni cizer.
 */
export function AiClubBackground({ className }: { className?: string }) {
    const confetti: { x: number; y: number; w: number; h: number; r: number; c: string }[] = [
        { x: 70, y: 40, w: 14, h: 6, r: 25, c: "#facc15" },
        { x: 180, y: 360, w: 12, h: 5, r: -30, c: "#22d3ee" },
        { x: 330, y: 70, w: 10, h: 10, r: 45, c: "#f472b6" },
        { x: 470, y: 380, w: 16, h: 6, r: 15, c: "#a3e635" },
        { x: 610, y: 30, w: 12, h: 5, r: -20, c: "#fb923c" },
        { x: 760, y: 395, w: 10, h: 10, r: 30, c: "#c084fc" },
        { x: 880, y: 60, w: 14, h: 6, r: 60, c: "#22d3ee" },
        { x: 1010, y: 345, w: 12, h: 5, r: -45, c: "#facc15" },
        { x: 1130, y: 120, w: 10, h: 10, r: 10, c: "#f472b6" },
        { x: 1160, y: 300, w: 14, h: 6, r: -15, c: "#a3e635" },
        { x: 260, y: 210, w: 8, h: 8, r: 45, c: "#fde047" },
        { x: 560, y: 250, w: 8, h: 8, r: 20, c: "#67e8f9" },
    ];
    const stars: { x: number; y: number; s: number; c: string; d: number }[] = [
        { x: 120, y: 120, s: 9, c: "#fde047", d: 0 },
        { x: 420, y: 150, s: 7, c: "#f9a8d4", d: 0.7 },
        { x: 690, y: 120, s: 10, c: "#67e8f9", d: 1.3 },
        { x: 960, y: 190, s: 8, c: "#fde047", d: 0.4 },
        { x: 1080, y: 40, s: 7, c: "#bef264", d: 1.8 },
        { x: 360, y: 320, s: 8, c: "#c4b5fd", d: 1.1 },
        { x: 820, y: 300, s: 9, c: "#f9a8d4", d: 2.1 },
    ];

    return (
        <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
            <div className="absolute inset-0 bg-[#12061f]" />
            <div className="absolute -left-20 -top-24 h-80 w-80 rounded-full bg-fuchsia-600/45 blur-3xl" />
            <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-violet-600/40 blur-3xl" />
            <div className="absolute -right-16 top-6 h-72 w-72 rounded-full bg-cyan-400/30 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-56 w-56 rounded-full bg-amber-400/25 blur-3xl" />
            <div className="absolute left-1/2 top-1/3 h-40 w-40 rounded-full bg-lime-400/15 blur-3xl" />

            <svg viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
                <defs>
                    <pattern id="ai-dots" width="28" height="28" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="1.3" fill="rgba(255,255,255,0.10)" />
                    </pattern>
                </defs>
                <rect width="1200" height="420" fill="url(#ai-dots)" />

                {/* Devre cizgileri: botlarin "kablolari" */}
                <g stroke="rgba(167,139,250,0.35)" strokeWidth="2" fill="none" strokeLinecap="round">
                    <path d="M0 300 H140 L180 260 H320" />
                    <path d="M1200 90 H1060 L1020 130 H900" />
                    <path d="M620 420 V370 L660 330 H760" />
                </g>
                <g fill="#a78bfa">
                    <circle cx="320" cy="260" r="5" />
                    <circle cx="900" cy="130" r="5" />
                    <circle cx="760" cy="330" r="5" />
                </g>

                {/* Konfeti */}
                {confetti.map((p, i) => (
                    <rect
                        key={i}
                        x={p.x}
                        y={p.y}
                        width={p.w}
                        height={p.h}
                        rx={1.5}
                        fill={p.c}
                        opacity={0.85}
                        transform={`rotate(${p.r} ${p.x + p.w / 2} ${p.y + p.h / 2})`}
                    />
                ))}

                {/* Parlayan yildizlar */}
                {stars.map((s, i) => (
                    <path
                        key={i}
                        className="ai-twinkle"
                        style={{ ["--ai-twinkle-delay" as string]: `${s.d}s` }}
                        d={`M${s.x} ${s.y - s.s} L${s.x + s.s * 0.3} ${s.y - s.s * 0.3} L${s.x + s.s} ${s.y} L${s.x + s.s * 0.3} ${s.y + s.s * 0.3} L${s.x} ${s.y + s.s} L${s.x - s.s * 0.3} ${s.y + s.s * 0.3} L${s.x - s.s} ${s.y} L${s.x - s.s * 0.3} ${s.y - s.s * 0.3} Z`}
                        fill={s.c}
                    />
                ))}

                {/* Piksel kalp */}
                <g fill="#f472b6" opacity="0.9" transform="translate(40 190) scale(3)">
                    <rect x="1" y="0" width="2" height="1" />
                    <rect x="4" y="0" width="2" height="1" />
                    <rect x="0" y="1" width="7" height="2" />
                    <rect x="1" y="3" width="5" height="1" />
                    <rect x="2" y="4" width="3" height="1" />
                    <rect x="3" y="5" width="1" height="1" />
                </g>

                {/* Gamepad */}
                <g transform="translate(1085 360) rotate(-12)" opacity="0.8">
                    <rect x="-34" y="-16" width="68" height="32" rx="16" fill="#22d3ee" />
                    <rect x="-22" y="-3" width="14" height="4" rx="1" fill="#12061f" />
                    <rect x="-17" y="-8" width="4" height="14" rx="1" fill="#12061f" />
                    <circle cx="14" cy="-3" r="3.5" fill="#12061f" />
                    <circle cx="22" cy="4" r="3.5" fill="#12061f" />
                </g>

                {/* Konusma balonu dis hatlari */}
                <g fill="none" stroke="rgba(250,204,21,0.55)" strokeWidth="3">
                    <path d="M520 40 h70 a12 12 0 0 1 12 12 v26 a12 12 0 0 1 -12 12 h-44 l-14 14 v-14 h-12 a12 12 0 0 1 -12 -12 v-26 a12 12 0 0 1 12 -12 z" />
                </g>
                <g fill="rgba(250,204,21,0.8)">
                    <circle cx="540" cy="65" r="4" />
                    <circle cx="555" cy="65" r="4" />
                    <circle cx="570" cy="65" r="4" />
                </g>

                {/* Simsek */}
                <path d="M980 250 l-18 34 h14 l-10 30 l28 -40 h-15 l12 -24 z" fill="#facc15" opacity="0.85" />
            </svg>
        </div>
    );
}

/** Yuzen bot avatari. Avatarlar DiceBear PNG (next.config izinli). */
export function FloatingBot({
    username,
    size = 56,
    className,
    delay = 0,
    tilt = 6,
    duration = 4.2,
    highlight = false,
    src,
}: {
    username: string;
    /** Botun gercek avatari (API); yoksa kullanici adindan DiceBear. */
    src?: string | null;
    size?: number;
    className?: string;
    delay?: number;
    tilt?: number;
    duration?: number;
    highlight?: boolean;
}) {
    return (
        <div
            className={cn("ai-float", className)}
            style={{
                ["--ai-float-delay" as string]: `${delay}s`,
                ["--ai-tilt" as string]: `${tilt}deg`,
                ["--ai-float-duration" as string]: `${duration}s`,
            }}
        >
            <div
                className={cn(
                    "overflow-hidden rounded-2xl bg-white/90 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)] ring-2 transition-all duration-300",
                    highlight ? "scale-110 ring-yellow-300" : "ring-white/40",
                )}
                style={{ width: size, height: size }}
            >
                <img src={getImageUrl(src) || aiBotAvatarUrl(username)} alt="" width={size} height={size} className="h-full w-full" loading="lazy" />
            </div>
        </div>
    );
}

/**
 * Mini sohbet penceresi. `lines` verilirse (api/ai/club recentLines) botlarin GERCEK son mesajlarini
 * sirayla dondurur ve "Canli" etiketi gorunur: model cagrisi yok, yalnizca bir DB okumasi. Veri yoksa
 * sabit ornek replikler doner ve "Canli" etiketi GIZLENIR (ornek metne canli demek yaniltici).
 * Hareket azaltma tercihinde son replikler sabit gosterilir.
 */
export function AiChatDemo({ className, compact = false, lines }: { className?: string; compact?: boolean; lines?: AiClubLine[] }) {
    const t = useI18n();
    const locale = useCurrentLocale();
    const [step, setStep] = useState(0);
    const [typing, setTyping] = useState(false);
    // Yalniz GORUNURKEN calis. Kart telefonda "hidden md:block" ile gizli ama bilesen mount
    // oluyor ve 3.2 sn'de bir state guncelleyip React'i yeniden render ettiriyordu; Lighthouse
    // mobil izinde bosuna ana is parcacigi isiydi. display:none IntersectionObserver'da hic
    // kesismez, ekran disi kart da durur.
    const rootRef = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = rootRef.current;
        if (!el || typeof IntersectionObserver === "undefined") {
            setVisible(true);
            return;
        }
        const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.1 });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const live = !!lines && lines.length >= 2;
    const script = live
        ? lines!.map((line) => ({ speaker: line.username, text: line.text, avatar: getImageUrl(line.profileImageUrl) || aiBotAvatarUrl(line.username) }))
        : aiPromoScript(locale).map((line) => ({ speaker: line.speaker, text: t(`aiPromo.${line.key}`), avatar: aiBotAvatarUrl(line.speaker) }));

    useEffect(() => {
        const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) {
            setStep(2);
            return;
        }
        if (!visible) return;
        let typingTimer: ReturnType<typeof setTimeout> | undefined;
        const timer = setInterval(() => {
            setTyping(true);
            typingTimer = setTimeout(() => {
                setTyping(false);
                setStep((value) => value + 1);
            }, 900);
        }, 3200);
        return () => {
            clearInterval(timer);
            if (typingTimer) clearTimeout(typingTimer);
        };
    }, [visible]);

    const visibleCount = compact ? 2 : 3;
    const shown = Array.from({ length: visibleCount }, (_, i) => {
        const index = step - (visibleCount - 1) + i;
        if (index < 0) return null;
        return { ...script[index % script.length], index };
    }).filter((line): line is NonNullable<typeof line> => line !== null);
    const next = script[(step + 1) % script.length];

    return (
        <div
            ref={rootRef}
            className={cn(
                "w-full rounded-2xl border border-white/15 bg-black/35 p-3 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-md",
                className,
            )}
        >
            <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-bold text-white/90">#{t("aiPromo.channel")}</span>
                {live ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                        </span>
                        {t("aiPromo.live")}
                    </span>
                ) : null}
            </div>
            <div className={cn("flex flex-col justify-end gap-2", compact ? "min-h-[108px]" : "min-h-[176px]")}>
                {shown.map((line) => (
                    <div key={line.index} className="flex items-end gap-2 duration-300 animate-in fade-in-0 slide-in-from-bottom-2">
                        <img src={line.avatar} alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-lg bg-white/90" />
                        <div className="min-w-0 rounded-2xl rounded-bl-sm bg-white/95 px-3 py-1.5 text-[13px] leading-snug text-zinc-900 shadow">
                            <span className="mr-1 text-[11px] font-bold text-violet-700">@{line.speaker}</span>
                            <span className="line-clamp-3">{line.text}</span>
                        </div>
                    </div>
                ))}
                <div className={cn("flex items-center gap-2 transition-opacity duration-200", typing ? "opacity-100" : "opacity-0")}>
                    <img src={next.avatar} alt="" width={22} height={22} className="h-5.5 w-5.5 shrink-0 rounded-md bg-white/80" />
                    <div className="flex gap-1 rounded-full bg-white/20 px-2.5 py-1.5">
                        {[0, 0.15, 0.3].map((delay) => (
                            <span key={delay} className="ai-typing-dot h-1.5 w-1.5 rounded-full bg-white" style={{ animationDelay: `${delay}s` }} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export const AI_CLUB_FLOATERS = AI_BOT_USERNAMES;
