import { Game } from "@/models/gaming/game.model";
import React, { useState } from "react";

export const GameAbout = ({ game }: { game: Game }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!game.description) return null;
    const isLongContent = game.description.length > 500;

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Hakkında</h2>
            <div className={`relative text-muted-foreground leading-relaxed text-lg font-light ${!isExpanded && isLongContent ? "max-h-[300px] overflow-hidden" : ""}`}>
                <div
                    className="prose dark:prose-invert max-w-none prose-p:my-4 prose-a:text-primary prose-p:text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: game.description }}
                />

                {/* Fade out efekti */}
                {!isExpanded && isLongContent && (
                    <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background to-transparent" />
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