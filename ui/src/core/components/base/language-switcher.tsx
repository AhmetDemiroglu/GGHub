"use client";

import { startTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppLocale, buildLocalizedPathname } from "@/i18n/config";
import { useCurrentLocale, useI18n, useLocaleContext } from "@/core/contexts/locale-context";
import { cn } from "@/core/lib/utils";

function TurkishFlag({ className, style }: { className?: string; style?: React.CSSProperties }) {
    return (
        <span className="inline-flex h-6 w-6 overflow-hidden rounded-full">
            <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
                <mask id="tr-mask">
                    <circle cx="256" cy="256" r="256" fill="white" />
                </mask>
                <g mask="url(#tr-mask)">
                    <rect width="512" height="512" fill="#E30A17" />
                    <circle cx="215" cy="256" r="128" fill="#fff" />
                    <circle cx="245" cy="256" r="102" fill="#E30A17" />
                    <polygon fill="#fff" points="314,256 428,293 358,196 358,316 428,219" />
                </g>
            </svg>
        </span>
    );
}

function USFlag({ className, style }: { className?: string; style?: React.CSSProperties }) {
    return (
        <span className="inline-flex h-6 w-6 overflow-hidden rounded-full">
            <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
                <mask id="us-mask">
                    <circle cx="256" cy="256" r="256" fill="white" />
                </mask>
                <g mask="url(#us-mask)">
                    <rect width="512" height="512" fill="#fff" />
                    <rect y="39" width="512" height="39" fill="#D52B1E" />
                    <rect y="118" width="512" height="39" fill="#D52B1E" />
                    <rect y="196" width="512" height="39" fill="#D52B1E" />
                    <rect y="275" width="512" height="39" fill="#D52B1E" />
                    <rect y="354" width="512" height="39" fill="#D52B1E" />
                    <rect y="433" width="512" height="39" fill="#D52B1E" />
                    <rect width="256" height="275" fill="#00205B" />
                    <g fill="#fff">
                        <circle cx="45" cy="45" r="12" />
                        <circle cx="105" cy="45" r="12" />
                        <circle cx="165" cy="45" r="12" />
                        <circle cx="225" cy="45" r="12" />
                        <circle cx="75" cy="90" r="12" />
                        <circle cx="135" cy="90" r="12" />
                        <circle cx="195" cy="90" r="12" />
                        <circle cx="45" cy="135" r="12" />
                        <circle cx="105" cy="135" r="12" />
                        <circle cx="165" cy="135" r="12" />
                        <circle cx="225" cy="135" r="12" />
                    </g>
                </g>
            </svg>
        </span>
    );
}

export function LanguageSwitcher() {
    const t = useI18n();
    const locale = useCurrentLocale();
    const { persistLocale } = useLocaleContext();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const isEnglish = locale === "en-US";

    const changeLocale = (nextLocale: AppLocale) => {
        if (nextLocale === locale) return;

        persistLocale(nextLocale);
        const nextPathname = buildLocalizedPathname(pathname || "/", nextLocale);
        const query = searchParams.toString();

        startTransition(() => {
            router.replace(query ? `${nextPathname}?${query}` : nextPathname, { scroll: false });
        });
    };

    const flagTransitionStyle: React.CSSProperties = {
        transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    };

    return (
        <div
            className="relative flex items-center gap-1 rounded-full bg-muted p-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.04)]"
            role="radiogroup"
            aria-label={t("nav.language")}
        >
            {/* Sliding indicator */}
            <div
                className={cn(
                    "absolute top-1 left-1 h-8 w-8 rounded-full bg-card transition-transform duration-400 ease-bouncy",
                    "shadow-[0_2px_8px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]",
                    isEnglish && "translate-x-9"
                )}
            />

            {/* TR button */}
            <button
                type="button"
                role="radio"
                aria-checked={!isEnglish}
                aria-label="Türkçe"
                onClick={() => changeLocale("tr")}
                className="group relative z-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0"
            >
                <TurkishFlag
                    className={cn(
                        "h-6 w-6 transition-all duration-400",
                        !isEnglish
                            ? "scale-100 grayscale-0 opacity-100"
                            : "scale-[0.85] grayscale opacity-40 group-hover:scale-[0.95] group-hover:grayscale-40 group-hover:opacity-80"
                    )}
                    style={flagTransitionStyle}
                />
            </button>

            {/* EN button */}
            <button
                type="button"
                role="radio"
                aria-checked={isEnglish}
                aria-label="English"
                onClick={() => changeLocale("en-US")}
                className="group relative z-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0"
            >
                <USFlag
                    className={cn(
                        "h-6 w-6 transition-all duration-400",
                        isEnglish
                            ? "scale-100 grayscale-0 opacity-100"
                            : "scale-[0.85] grayscale opacity-40 group-hover:scale-[0.95] group-hover:grayscale-40 group-hover:opacity-80"
                    )}
                    style={flagTransitionStyle}
                />
            </button>
        </div>
    );
}
