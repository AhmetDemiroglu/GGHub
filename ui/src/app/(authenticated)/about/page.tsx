"use client";

import Image from "next/image";
import { Gamepad2, Users, Share2, Sparkles, Compass, ListChecks } from "lucide-react";
import logoSrc from "@core/assets/logo.png";
import { The_Girl_Next_Door } from "next/font/google";
import { useI18n } from "@/core/contexts/locale-context";

const font = The_Girl_Next_Door({
    subsets: ["latin"],
    weight: ["400"],
});

export default function AboutPage() {
    const t = useI18n();

    return (
        <div className="w-full h-full p-5">
            <div className="space-y-6">
                <div className="flex flex-col items-center gap-4 text-center pt-2">
                    <div className="inline-flex items-center gap-2 bg-muted/10 border border-border/40 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Gamepad2 className="h-4 w-4" />
                        </span>
                        {t("about.badge")}
                    </div>
                    <div className="flex items-center gap-3">
                        <Image src={logoSrc} alt="GGHub Logo" title="'Good Game'" width={42} height={42} className="rounded-md" />
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t("about.title")}</h1>
                    </div>
                    <p className={`${font.className} text-lg md:text-2xl text-foreground/80 leading-relaxed`}>
                        {t("about.subtitle")}
                    </p>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                    <div className="rounded-2xl border border-border/40 bg-background/30 p-5 flex flex-col gap-2">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                            <Compass className="h-4 w-4" />
                        </div>
                        <h2 className="text-sm font-semibold tracking-tight">{t("about.discoverTitle")}</h2>
                        <p className="text-xs text-muted-foreground leading-relaxed">{t("about.discoverDescription")}</p>
                    </div>
                    <div className="rounded-2xl border border-border/40 bg-background/30 p-5 flex flex-col gap-2">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                            <ListChecks className="h-4 w-4" />
                        </div>
                        <h2 className="text-sm font-semibold tracking-tight">{t("about.listTitle")}</h2>
                        <p className="text-xs text-muted-foreground leading-relaxed">{t("about.listDescription")}</p>
                    </div>
                    <div className="rounded-2xl border border-border/40 bg-background/30 p-5 flex flex-col gap-2">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                            <Users className="h-4 w-4" />
                        </div>
                        <h2 className="text-sm font-semibold tracking-tight">{t("about.connectTitle")}</h2>
                        <p className="text-xs text-muted-foreground leading-relaxed">{t("about.connectDescription")}</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-border/40 bg-background/40 p-5 space-y-5">
                    <h2 className="text-base md:text-lg font-semibold tracking-tight flex items-center gap-2">
                        {t("about.whyTitle")}
                        <Sparkles className="h-4 w-4 text-primary" />
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t("about.whyDescription")}</p>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex gap-3 items-start">
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
                                <Share2 className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold">{t("about.socialTitle")}</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">{t("about.socialDescription")}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 items-start">
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
                                <Gamepad2 className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold">{t("about.profileTitle")}</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">{t("about.profileDescription")}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 items-start">
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
                                <Users className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold">{t("about.similarPlayersTitle")}</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">{t("about.similarPlayersDescription")}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 items-start">
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
                                <Compass className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold">{t("about.explorationTitle")}</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">{t("about.explorationDescription")}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-border/40 bg-background/20 p-5 space-y-5">
                    <h2 className="text-base md:text-lg font-semibold tracking-tight">{t("about.howTitle")}</h2>
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                        <div className="flex-1 rounded-xl bg-muted/5 border border-border/30 p-4 space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground/70">{t("about.step1Label")}</p>
                            <p className="text-sm font-semibold">{t("about.step1Title")}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{t("about.step1Description")}</p>
                        </div>
                        <div className="hidden md:flex h-10 w-10 rounded-full border border-border/40 items-center justify-center text-muted-foreground/70 shrink-0">→</div>
                        <div className="flex-1 rounded-xl bg-muted/5 border border-border/30 p-4 space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground/70">{t("about.step2Label")}</p>
                            <p className="text-sm font-semibold">{t("about.step2Title")}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{t("about.step2Description")}</p>
                        </div>
                        <div className="hidden md:flex h-10 w-10 rounded-full border border-border/40 items-center justify-center text-muted-foreground/70 shrink-0">→</div>
                        <div className="flex-1 rounded-xl bg-muted/5 border border-border/30 p-4 space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground/70">{t("about.step3Label")}</p>
                            <p className="text-sm font-semibold">{t("about.step3Title")}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{t("about.step3Description")}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
