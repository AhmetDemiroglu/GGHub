"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, CircleArrowDown, Gamepad2, Home, List, Rocket, Search, Settings, Sparkles, UserCircle, Users } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { getPathLocale } from "@/i18n";
import { buildLocalizedPathname } from "@/i18n/config";
import { messagesByLocale, translate } from "@/i18n";

export default function NotFound() {
    const router = useRouter();
    const pathname = usePathname();
    const locale = getPathLocale(pathname);
    const messages = messagesByLocale[locale];
    const t = (key: string, values?: Record<string, string>) => translate(messages, key, values);

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.05),_transparent_50%),radial-gradient(circle_at_bottom,_rgba(139,92,246,0.05),_transparent_60%)]" />
            <div className="pointer-events-none absolute inset-0 animate-drift bg-[linear-gradient(120deg,#fff_1px,transparent_1px)] bg-[size:180px_180px] opacity-[0.035]" />

            <div className="pointer-events-none absolute left-10 top-20 animate-float">
                <Gamepad2 className="h-10 w-10 text-cyan-300/35" />
            </div>
            <div className="pointer-events-none absolute right-16 top-32 animate-float-slow">
                <Sparkles className="h-9 w-9 text-purple-300/35" />
            </div>
            <div className="pointer-events-none absolute bottom-16 left-1/4 animate-orbit">
                <Users className="h-11 w-11 text-blue-200/25" />
            </div>
            <div className="pointer-events-none absolute bottom-20 right-10 animate-float">
                <UserCircle className="h-10 w-10 text-amber-200/25" />
            </div>

            <div className="relative z-10 flex w-full max-w-5xl flex-col gap-10 md:flex-row md:items-center md:justify-between">
                <div className="relative flex flex-1 items-center justify-center md:justify-start">
                    <div className="absolute -left-32 top-1/2 z-10 h-56 w-56 -translate-y-1/2 animate-globe rounded-full border border-cyan-400/25 bg-cyan-500/0 backdrop-blur-[1px]">
                        <div className="absolute inset-6 rounded-full border border-cyan-200/10" />
                        <div className="absolute left-5 right-5 top-1/2 -translate-y-1/2 rounded-full border-t border-cyan-200/20" />
                        <div className="absolute inset-y-6 left-1/2 w-[1px] -translate-x-1/2 rounded-full bg-cyan-200/15" />
                        <div className="absolute inset-[26%] rotate-12 rounded-full border-t border-cyan-200/10" />
                    </div>

                    <div className="pointer-events-none absolute -left-32 top-1/2 z-50 h-56 w-56 -translate-y-1/2">
                        <div className="absolute left-1/2 top-1/2 animate-search-sweep -translate-x-1/2 -translate-y-1/2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full">
                                <Search className="h-7 w-7 text-cyan-100 drop-shadow-[0_0_16px_rgba(34,211,238,0.45)]" />
                            </div>
                        </div>
                    </div>

                    <div className="relative z-20">
                        <h1 className="animate-text-glow select-none bg-gradient-to-r from-cyan-200 via-slate-50 to-purple-200 bg-clip-text text-[5rem] font-extrabold leading-none tracking-tight text-transparent md:text-[6.5rem]">
                            404
                        </h1>
                        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/30 bg-background/40 px-4 py-2 text-xs uppercase tracking-[0.35em] text-muted-foreground/80 shadow-[0_0_30px_rgba(15,23,42,0.25)]">
                            {t("notFound.badge")}
                        </p>
                    </div>
                </div>

                <div className="max-w-xl flex-1 space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("notFound.title")}</h2>
                        <p className="text-muted-foreground">
                            {t("notFound.description")}
                            <span className="ml-2 mt-1 inline-flex animate-pulse items-center">
                                <Rocket className="h-4 w-4 text-violet-400" />
                            </span>
                        </p>
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row">
                        <Button
                            onClick={() => router.back()}
                            variant="outline"
                            className="group w-full cursor-pointer border-border/50 bg-background/40 transition-all hover:border-cyan-400/60 sm:w-auto"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            {t("notFound.previousPage")}
                        </Button>
                        <Button asChild className="w-full bg-gradient-to-r from-cyan-500 to-violet-500 shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-violet-400 sm:w-auto">
                            <Link href={buildLocalizedPathname("/", locale)}>
                                <Home className="mr-2 h-4 w-4" />
                                {t("notFound.home")}
                            </Link>
                        </Button>
                    </div>

                    <div className="space-y-3">
                        <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground/80">
                            <CircleArrowDown className="h-4 w-4 animate-bounce text-cyan-300" />
                            {t("notFound.quickLinks")}
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Button asChild variant="ghost" size="sm" className="group gap-2 bg-background/40 transition-colors hover:animate-pulse hover:bg-emerald-500/10">
                                <Link href={buildLocalizedPathname("/discover", locale)}>
                                    <Gamepad2 className="h-4 w-4 text-emerald-400" />
                                    <span className="transition-colors group-hover:text-emerald-400">{t("notFound.games")}</span>
                                </Link>
                            </Button>
                            <Button asChild variant="ghost" size="sm" className="group gap-2 bg-background/40 transition-colors hover:animate-pulse hover:bg-purple-500/10">
                                <Link href={buildLocalizedPathname("/lists", locale)}>
                                    <List className="h-4 w-4 text-purple-400" />
                                    <span className="transition-colors group-hover:text-purple-400">{t("notFound.lists")}</span>
                                </Link>
                            </Button>
                            <Button asChild variant="ghost" size="sm" className="group gap-2 bg-background/40 transition-colors hover:animate-pulse hover:bg-blue-500/10">
                                <Link href={buildLocalizedPathname("/", locale)}>
                                    <Users className="h-4 w-4 text-blue-400" />
                                    <span className="transition-colors group-hover:text-blue-400">{t("notFound.community")}</span>
                                </Link>
                            </Button>
                            <Button asChild variant="ghost" size="sm" className="group gap-2 bg-background/40 transition-colors hover:animate-pulse hover:bg-amber-500/10">
                                <Link href={buildLocalizedPathname("/profile", locale)}>
                                    <Settings className="h-4 w-4 text-amber-400" />
                                    <span className="transition-colors group-hover:text-amber-400">{t("notFound.profile")}</span>
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground/60">{t("notFound.support", { email: "info@gghub.social" })}</p>
                </div>
            </div>

            <style jsx>{`
                @keyframes drift {
                    0% {
                        transform: translateY(0);
                    }
                    100% {
                        transform: translateY(80px);
                    }
                }
                .animate-drift {
                    animation: drift 14s linear infinite alternate;
                }

                @keyframes text-glow {
                    0%,
                    100% {
                        filter: drop-shadow(0 0 15px rgba(34, 211, 238, 0.15));
                        background-position: 0% 50%;
                    }
                    50% {
                        filter: drop-shadow(0 0 25px rgba(139, 92, 246, 0.35));
                        background-position: 100% 50%;
                    }
                }
                .animate-text-glow {
                    animation: text-glow 3.5s ease-in-out infinite;
                    background-size: 180% 180%;
                }

                @keyframes float {
                    0%,
                    100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-18px);
                    }
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }

                @keyframes float-slow {
                    0%,
                    100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }
                .animate-float-slow {
                    animation: float-slow 9s ease-in-out infinite;
                }

                @keyframes orbit {
                    0% {
                        transform: rotate(0deg) translateX(8px) rotate(0deg);
                    }
                    50% {
                        transform: rotate(180deg) translateX(14px) rotate(-180deg);
                    }
                    100% {
                        transform: rotate(360deg) translateX(8px) rotate(-360deg);
                    }
                }
                .animate-orbit {
                    animation: orbit 12s linear infinite;
                }

                @keyframes globe {
                    0% {
                        transform: rotate(0deg);
                    }
                    100% {
                        transform: rotate(360deg);
                    }
                }
                .animate-globe {
                    animation: globe 30s linear infinite;
                }

                @keyframes search-sweep {
                    0% {
                        transform: translate(-54px, -18px);
                    }
                    25% {
                        transform: translate(20px, -16px);
                    }
                    50% {
                        transform: translate(26px, 20px);
                    }
                    75% {
                        transform: translate(-30px, 18px);
                    }
                    100% {
                        transform: translate(-54px, -18px);
                    }
                }
                .animate-search-sweep {
                    animation: search-sweep 6s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
