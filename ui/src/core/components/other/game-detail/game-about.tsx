import { Game } from "@/models/gaming/game.model";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { gameApi } from "@/api/gaming/game.api";
import { toast } from "sonner";
import { cn } from "@core/lib/utils";

export const GameAbout = ({ game }: { game: Game }) => {
    const queryClient = useQueryClient();
    const [isExpanded, setIsExpanded] = useState(false);

    const [language, setLanguage] = useState<'tr' | 'en'>(game.descriptionTr ? 'tr' : 'en');

    useEffect(() => {
        if (game.descriptionTr) {
            setLanguage('tr');
        }
    }, [game.descriptionTr]);

    const { mutate: translateGame, isPending: isTranslating } = useMutation({
        mutationFn: () => gameApi.translate(game.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["game"] });

            toast.success("Çeviri Tamamlandı", { description: "Oyun açıklaması Türkçe'ye çevrildi." });
        },
    });

    const activeDescription = language === 'tr' && game.descriptionTr
        ? game.descriptionTr
        : game.description;

    if (!activeDescription) return null;

    const isLongContent = activeDescription.length > 500;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Hakkında</h2>

                {/* Dil Kontrolleri */}
                <div className="flex items-center gap-2">
                    {game.descriptionTr ? (
                        // DURUM 1
                        <div className="flex items-center bg-secondary/50 p-1 rounded-lg border border-border">
                            <button
                                onClick={() => setLanguage('en')}
                                className={cn(
                                    "px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer",
                                    language === 'en' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                EN
                            </button>
                            <button
                                onClick={() => setLanguage('tr')}
                                className={cn(
                                    "px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer",
                                    language === 'tr' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                TR
                            </button>
                        </div>
                    ) : (
                        // DURUM 2
                        <button
                            onClick={() => translateGame()}
                            disabled={isTranslating}
                            className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                        >
                            {isTranslating ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Sparkles size={14} />
                            )}
                            {isTranslating ? "Çevriliyor..." : "Türkçe'ye Çevir (AI)"}
                        </button>
                    )}
                </div>
            </div>

            {/* Metin İçeriği */}
            <div className={`relative text-muted-foreground leading-relaxed text-lg font-light transition-all duration-300 ${!isExpanded && isLongContent ? "max-h-[300px] overflow-hidden" : ""}`}>
                <div
                    className="prose dark:prose-invert max-w-none prose-p:my-4 prose-a:text-primary prose-p:text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: activeDescription }}
                />

                {/* Fade out efekti */}
                {!isExpanded && isLongContent && (
                    <div className="absolute bottom-0 left-0 w-full h-32 bg-linear-to-t from-background to-transparent" />
                )}
            </div>

            {/* Daha Fazla Göster Butonu */}
            {isLongContent && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs font-bold uppercase tracking-widest bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded transition-colors cursor-pointer"
                >
                    {isExpanded ? "Daha Az Göster" : "Daha Fazla Göster"}
                </button>
            )}
        </div>
    );
};