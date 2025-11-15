"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@core/components/ui/button";
import { Home, ArrowLeft, Gamepad2, List, Users, UserCircle, CircleArrowDown, Search, Settings, Sparkles, Rocket } from "lucide-react";

export default function NotFound() {
    const router = useRouter();

    return (
        <div className="relative min-h-screen bg-background text-foreground overflow-hidden flex items-center justify-center px-4 py-10">
            {/* arka plan katmanları */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.05),_transparent_50%),radial-gradient(circle_at_bottom,_rgba(139,92,246,0.05),_transparent_60%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.035] bg-[linear-gradient(120deg,#fff_1px,transparent_1px)] bg-[size:180px_180px] animate-drift" />

            <div className="pointer-events-none absolute top-20 left-10 animate-float">
                <Gamepad2 className="h-10 w-10 text-cyan-300/35" />
            </div>
            <div className="pointer-events-none absolute top-32 right-16 animate-float-slow">
                <Sparkles className="h-9 w-9 text-purple-300/35" />
            </div>
            <div className="pointer-events-none absolute bottom-16 left-1/4 animate-orbit">
                <Users className="h-11 w-11 text-blue-200/25" />
            </div>
            <div className="pointer-events-none absolute bottom-20 right-10 animate-float">
                <UserCircle className="h-10 w-10 text-amber-200/25" />
            </div>

            {/* içerik alanı */}
            <div className="relative z-10 w-full max-w-5xl flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1 flex items-center justify-center md:justify-start">
                    <div className="absolute -left-32 top-1/2 -translate-y-1/2 h-56 w-56 rounded-full border border-cyan-400/25 bg-cyan-500/0 backdrop-blur-[1px] animate-globe z-10">
                        <div className="absolute inset-6 rounded-full border border-cyan-200/10" />
                        <div className="absolute top-1/2 left-5 right-5 -translate-y-1/2 border-t border-cyan-200/20 rounded-full" />
                        <div className="absolute inset-y-6 left-1/2 -translate-x-1/2 w-[1px] bg-cyan-200/15 rounded-full" />
                        <div className="absolute inset-[26%] border-t border-cyan-200/10 rounded-full rotate-12" />
                    </div>

                    <div className="pointer-events-none absolute -left-32 top-1/2 -translate-y-1/2 h-56 w-56 z-50">
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-search-sweep">
                            <div className="h-10 w-10 rounded-full flex items-center justify-center">
                                <Search className="h-7 w-7 text-cyan-100 drop-shadow-[0_0_16px_rgba(34,211,238,0.45)]" />
                            </div>
                        </div>
                    </div>

                    {/* 404 */}
                    <div className="relative z-20">
                        <h1 className="text-[5rem] md:text-[6.5rem] font-extrabold leading-none tracking-tight bg-gradient-to-r from-cyan-200 via-slate-50 to-purple-200 bg-clip-text text-transparent animate-text-glow select-none">
                            404
                        </h1>
                        <p className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-muted-foreground/80 bg-background/40 px-4 py-2 rounded-full border border-border/30 shadow-[0_0_30px_rgba(15,23,42,0.25)]">
                            Aradığın sayfa bulunamadı
                        </p>
                    </div>
                </div>

                <div className="flex-1 max-w-xl space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Aradığın sayfa dijital evrende bulunamadı.</h2>
                        <p className="text-muted-foreground">
                            Endişelenme, seni geri götüreceğiz. Aşağıdan bir sayfa seçebilir ya da bir önceki sayfana dönebilirsin.
                            <span className="inline-flex items-center ml-2 mt-1 animate-pulse">
                                <Rocket className="h-4 w-4  text-violet-400"></Rocket>
                            </span>
                        </p>
                    </div>

                    {/* aksiyon butonları */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button
                            onClick={() => router.back()}
                            variant="outline"
                            className="w-full sm:w-auto border-border/50 bg-background/40 hover:border-cyan-400/60 group transition-all cursor-pointer"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            Bir önceki sayfa
                        </Button>
                        <Button asChild className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 shadow-lg shadow-cyan-500/20">
                            <Link href="/">
                                <Home className="mr-2 h-4 w-4" />
                                Ana sayfaya dön
                            </Link>
                        </Button>
                    </div>

                    {/* Hızlı Rotalar */}
                    <div className="space-y-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground/80 flex items-center gap-2">
                            <CircleArrowDown className="h-4 w-4 text-cyan-300 animate-bounce" />
                            ya da şuraya gidebilirsin
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Button asChild variant="ghost" size="sm" className="gap-2 bg-background/40 hover:bg-emerald-500/10 transition-colors group hover:animate-pulse">
                                <Link href="/games">
                                    <Gamepad2 className="h-4 w-4 text-emerald-400 " />
                                    <span className="group-hover:text-emerald-400 transition-colors">Oyunlar</span>
                                </Link>
                            </Button>
                            <Button asChild variant="ghost" size="sm" className="gap-2 bg-background/40 hover:bg-purple-500/10 transition-colors group hover:animate-pulse">
                                <Link href="/lists">
                                    <List className="h-4 w-4 text-purple-400" />
                                    <span className="group-hover:text-purple-400 transition-colors">Listeler</span>
                                </Link>
                            </Button>
                            <Button asChild variant="ghost" size="sm" className="gap-2 bg-background/40 hover:bg-blue-500/10 transition-colors group hover:animate-pulse">
                                <Link href="/community">
                                    <Users className="h-4 w-4 text-blue-400" />
                                    <span className="group-hover:text-blue-400 transition-colors">Topluluk</span>
                                </Link>
                            </Button>
                            <Button asChild variant="ghost" size="sm" className="gap-2 bg-background/40 hover:bg-amber-500/10 transition-colors group hover:animate-pulse">
                                <Link href="/profile">
                                    <Settings className="h-4 w-4 text-amber-400" />
                                    <span className="group-hover:text-amber-400 transition-colors">Profil Yönetimi</span>
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* destek */}
                    <p className="text-xs text-muted-foreground/60">
                        Sürekli bu sayfaya düşüyorsan bize yaz: <span className="text-cyan-300">info@gghub.social</span>
                    </p>
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

                /* dünya yavaş dönsün */
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

                /* büyütecin dünya içinde gezinmesi */
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
