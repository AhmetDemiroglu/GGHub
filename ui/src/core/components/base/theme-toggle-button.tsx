"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Button } from "@/core/components/ui/button";

export function ThemeToggleButton() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);
    const [isAnimatedDark, setIsAnimatedDark] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
        // We delay the internal flag by a tiny tick to bypass next-theme's `disableTransitionOnChange` global CSS blocker
        const timer = setTimeout(() => {
            setIsAnimatedDark(resolvedTheme === "dark");
        }, 50);
        return () => clearTimeout(timer);
    }, [resolvedTheme]);

    if (!mounted) {
        return (
            <Button variant="ghost" className="h-9 w-9 rounded-full" size="icon">
                <span className="sr-only">Temayı değiştir</span>
            </Button>
        );
    }

    return (
        <Button 
            variant="ghost" 
            className="group relative cursor-pointer overflow-hidden rounded-full transition-colors" 
            size="icon" 
            onClick={() => {
                const newT = resolvedTheme === "light" ? "dark" : "light";
                setTheme(newT);
            }}
            title="Temayı değiştir"
        >
            <div className="relative flex h-full w-full items-center justify-center">
                {/* Sun & Cloud (Light Mode) */}
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className={`absolute h-[1.35rem] w-[1.35rem] transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isAnimatedDark ? "-translate-y-12 rotate-45 opacity-0" : "translate-y-0 rotate-0 opacity-100"}`}
                >
                    <path d="M12 2v2" strokeDasharray="4" className={`transition-all duration-700 ${isAnimatedDark ? "[stroke-dashoffset:4]" : "[stroke-dashoffset:0]"}`} />
                    <path d="m4.93 4.93 1.41 1.41" strokeDasharray="4" className={`transition-all duration-700 delay-75 ${isAnimatedDark ? "[stroke-dashoffset:4]" : "[stroke-dashoffset:0]"}`} />
                    <path d="M20 12h2" strokeDasharray="4" className={`transition-all duration-700 delay-100 ${isAnimatedDark ? "[stroke-dashoffset:4]" : "[stroke-dashoffset:0]"}`} />
                    <path d="m19.07 4.93-1.41 1.41"  strokeDasharray="4" className={`transition-all duration-700 delay-150 ${isAnimatedDark ? "[stroke-dashoffset:4]" : "[stroke-dashoffset:0]"}`} />
                    <path d="M15.947 12.65a4 4 0 0 0-5.925-4.128" strokeDasharray="20" className={`transition-all duration-700 ease-in-out ${isAnimatedDark ? "[stroke-dashoffset:20]" : "[stroke-dashoffset:0]"}`} />
                    <path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z" strokeDasharray="60" className={`transition-all duration-1000 ease-in-out ${isAnimatedDark ? "[stroke-dashoffset:60]" : "[stroke-dashoffset:0]"}`} />
                </svg>

                {/* Moon & Stars (Dark Mode) */}
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className={`absolute h-[1.35rem] w-[1.35rem] transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isAnimatedDark ? "translate-y-0 rotate-0 opacity-100" : "translate-y-12 -rotate-45 opacity-0"}`}
                >
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" strokeDasharray="60" className={`transition-all duration-1000 ease-in-out ${isAnimatedDark ? "[stroke-dashoffset:0]" : "[stroke-dashoffset:60]"}`} />
                    <path d="M19 3v4" strokeDasharray="6" className={`transition-all duration-700 delay-200 ease-in-out ${isAnimatedDark ? "[stroke-dashoffset:0]" : "[stroke-dashoffset:6]"}`} />
                    <path d="M21 5h-4" strokeDasharray="6" className={`transition-all duration-700 delay-200 ease-in-out ${isAnimatedDark ? "[stroke-dashoffset:0]" : "[stroke-dashoffset:6]"}`} />
                    {/* Positioned safely to bottom-left to prevent overlap with the moon */}
                    <path d="M3 17v2" strokeDasharray="6" className={`transition-all duration-700 delay-300 ease-in-out ${isAnimatedDark ? "[stroke-dashoffset:0]" : "[stroke-dashoffset:6]"}`} />
                    <path d="M4 18H2" strokeDasharray="6" className={`transition-all duration-700 delay-300 ease-in-out ${isAnimatedDark ? "[stroke-dashoffset:0]" : "[stroke-dashoffset:6]"}`} />
                </svg>
            </div>
            <span className="sr-only">Temayı değiştir</span>
        </Button>
    );
}
