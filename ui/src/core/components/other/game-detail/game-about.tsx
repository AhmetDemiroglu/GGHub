"use client";

import { Game } from "@/models/gaming/game.model";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { gameApi } from "@/api/gaming/game.api";
import { toast } from "sonner";
import { cn } from "@core/lib/utils";
import { getLocaleFlag, getLocaleLabel } from "@/i18n/config";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";

export const GameAbout = ({ game }: { game: Game }) => {
    const queryClient = useQueryClient();
    const locale = useCurrentLocale();
    const t = useI18n();
    const [isExpanded, setIsExpanded] = useState(false);
    const [language, setLanguage] = useState<"tr" | "en">("en");

    useEffect(() => {
        setLanguage(locale === "tr" && game.descriptionTr ? "tr" : "en");
    }, [locale, game.descriptionTr]);

    const { mutate: translateGame, isPending: isTranslating } = useMutation({
        mutationFn: () => gameApi.translate(game.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["game"] });
            toast.success(t("gameDetail.translationCompleteTitle"), { description: t("gameDetail.translationCompleteDescription") });
        },
    });

    const activeDescription = language === "tr" && game.descriptionTr ? game.descriptionTr : game.description || game.descriptionTr;

    if (!activeDescription) return null;

    const isLongContent = activeDescription.length > 500;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">{t("gameDetail.aboutTitle")}</h2>

                <div className="flex items-center gap-2">
                    {game.descriptionTr ? (
                        <div className="flex items-center rounded-lg border border-border bg-secondary/50 p-1">
                            <button
                                onClick={() => setLanguage("en")}
                                className={cn(
                                    "cursor-pointer rounded-md px-3 py-1 text-xs font-bold transition-all",
                                    language === "en" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <span className="flex items-center gap-1">
                                    <span aria-hidden>{getLocaleFlag("en-US")}</span>
                                    <span>{getLocaleLabel("en-US")}</span>
                                </span>
                            </button>
                            <button
                                onClick={() => setLanguage("tr")}
                                className={cn(
                                    "flex cursor-pointer items-center gap-1 rounded-md px-3 py-1 text-xs font-bold transition-all",
                                    language === "tr" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <span className="flex items-center gap-1">
                                    <span aria-hidden>{getLocaleFlag("tr")}</span>
                                    <span>{getLocaleLabel("tr")}</span>
                                </span>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => translateGame()}
                            disabled={isTranslating}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-400 transition-all hover:bg-purple-500/20 disabled:opacity-50"
                        >
                            {isTranslating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            {isTranslating ? t("gameDetail.translating") : t("gameDetail.translateToTurkish")}
                        </button>
                    )}
                </div>
            </div>

            <div className={`relative text-lg leading-relaxed font-light text-muted-foreground transition-all duration-300 ${!isExpanded && isLongContent ? "max-h-[300px] overflow-hidden" : ""}`}>
                <div
                    className="prose prose-p:my-4 max-w-none prose-a:text-primary prose-p:text-muted-foreground dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: activeDescription }}
                />

                {!isExpanded && isLongContent ? <div className="absolute bottom-0 left-0 h-32 w-full bg-linear-to-t from-background to-transparent" /> : null}
            </div>

            {isLongContent ? (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="cursor-pointer rounded bg-secondary px-4 py-2 text-xs font-bold uppercase tracking-widest text-secondary-foreground transition-colors hover:bg-secondary/80"
                >
                    {isExpanded ? t("common.showLess") : t("common.showMore")}
                </button>
            ) : null}
        </div>
    );
};
