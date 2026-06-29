"use client";

import { Play } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { APP_STORE_URL, GOOGLE_PLAY_URL } from "@/core/lib/store-links";

// Official Apple logo (lucide's "Apple" is a fruit, not the brand mark).
export function AppleLogo({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 384 512" className={className} fill="currentColor" aria-hidden="true">
            <path d="M318.7 268.7c-.2-36.71 16.41-64.39 49.81-84.78-18.69-26.78-46.97-41.51-84.27-44.38-35.42-2.79-74.18 20.62-88.39 20.62-15.02 0-49.31-19.62-76.27-19.62C63.4 141.51 4 184.81 4 272.83c0 26.01 4.76 52.88 14.28 80.59 12.71 36.41 58.56 125.81 106.39 124.36 25.02-.59 42.71-17.73 75.27-17.73 31.58 0 47.95 17.73 75.85 17.73 48.25-.7 89.74-81.95 101.83-118.46-64.78-30.51-61.21-89.46-61.21-90.21zm-56.65-164.24c27.32-32.42 24.83-61.93 24.02-72.59-24.13 1.4-52.06 16.42-67.97 34.9-17.52 19.82-27.83 44.32-25.61 71.45 26.07 2.01 49.81-11.42 69.56-33.76z" />
        </svg>
    );
}

/**
 * Single dark store button. Renders a clickable link when `href` is set,
 * otherwise a passive button with an optional "Soon" badge.
 */
export function StoreButton({
    icon,
    label,
    href,
    soon,
    className,
}: {
    icon: React.ReactNode;
    label: string;
    href?: string | null;
    soon?: string | null;
    className?: string;
}) {
    const base =
        "relative inline-flex flex-1 items-center justify-center gap-2.5 rounded-xl border border-border/60 bg-black/80 px-5 py-3 text-white";

    if (href) {
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(base, "transition-all hover:scale-[1.02] hover:border-cyan-400/60 hover:bg-black", className)}
            >
                {icon}
                <span className="text-sm font-semibold">{label}</span>
            </a>
        );
    }

    return (
        <div className={cn(base, "cursor-default opacity-90", className)}>
            {icon}
            <span className="text-sm font-semibold">{label}</span>
            {soon ? (
                <span className="absolute -right-2 -top-2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                    {soon}
                </span>
            ) : null}
        </div>
    );
}

/**
 * App Store + Google Play pair. App Store links to the live listing; Google
 * Play follows GOOGLE_PLAY_URL (currently null → "Soon" badge until approved).
 */
export function StoreButtons({
    appStoreLabel = "App Store",
    googlePlayLabel = "Google Play",
    soonText = "Soon",
    className,
}: {
    appStoreLabel?: string;
    googlePlayLabel?: string;
    soonText?: string;
    className?: string;
}) {
    return (
        <div className={cn("flex w-full flex-col gap-3 sm:flex-row", className)}>
            <StoreButton icon={<AppleLogo className="h-5 w-5" />} label={appStoreLabel} href={APP_STORE_URL} />
            {GOOGLE_PLAY_URL ? (
                <StoreButton icon={<Play className="h-5 w-5" />} label={googlePlayLabel} href={GOOGLE_PLAY_URL} />
            ) : (
                <StoreButton icon={<Play className="h-5 w-5" />} label={googlePlayLabel} soon={soonText} />
            )}
        </div>
    );
}
