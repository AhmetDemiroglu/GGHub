"use client";

import { Game } from "@/models/gaming/game.model";
import { Globe, ShoppingBag, Info } from "lucide-react";
import React from "react";
import { ScoreBadge } from "../score-badge";
import { useI18n } from "@/core/contexts/locale-context";

/** Kunye paneli. Etiketler arayuz dilinde: eskiden hepsi sabit Turkceydi, Ingilizce sayfa karisik cikiyordu. */
export const GameSidebar = ({ game }: { game: Game }) => {
    const t = useI18n();

    const getStoreInfo = (store: { url?: string; domain?: string }) => {
        const href = store.url && store.url.length > 0 ? store.url : store.domain ? `https://${store.domain}` : "#";
        const label = store.url && store.url.length > 0 ? t("gameDetail.storeView") : t("gameDetail.storeGo");

        return { href, label };
    };

    return (
        <div className="space-y-8">
            {/* 1. Puanlama Rozetleri (Badge) */}
            <div className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">{t("gameDetail.ratingsTitle")}</h3>
                <div className="flex flex-wrap gap-4">
                    <ScoreBadge type="metacritic" score={game.metacritic} />
                    <ScoreBadge type="rawg" score={game.rating} />
                    {/* IGDB: diğer rozetler gibi HER ZAMAN görünür; puan yoksa "-" yazar.
                        Gizlemek "eksik/bozuk" hissi veriyordu. */}
                    <ScoreBadge type="igdb" score={game.igdbRating ?? null} />
                    <ScoreBadge type="gghub" score={game.gghubRating || null} />
                </div>
            </div>

            <div className="w-full h-px bg-border" />

            {/* 2. Künye Bilgileri (Grid) */}
            <div className="grid grid-cols-1 gap-y-6">
                <div>
                    <div className="text-sm text-muted-foreground mb-2">{t("gameDetail.platforms")}</div>
                    <div className="flex flex-wrap gap-2 text-sm text-foreground leading-relaxed">
                        {game.platforms?.length ? (
                            game.platforms.map((p, i) => (
                                <span key={p.slug}>
                                    <span className="underline decoration-muted-foreground/50 underline-offset-4 hover:decoration-foreground transition-all cursor-pointer">
                                        {p.name}
                                    </span>
                                    {i < game.platforms.length - 1 && <span className="text-muted-foreground mx-1">,</span>}
                                </span>
                            ))
                        ) : (
                            <span className="text-muted-foreground">{t("gameDetail.notSpecified")}</span>
                        )}
                    </div>
                </div>

                <div>
                    <div className="text-sm text-muted-foreground mb-2">{t("gameDetail.genres")}</div>
                    <div className="flex flex-wrap gap-2">
                        {game.genres?.length ? (
                            game.genres.map((g) => (
                                <span key={g.slug} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded border border-border hover:border-foreground/20 transition-colors cursor-pointer">
                                    {g.name}
                                </span>
                            ))
                        ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-sm text-muted-foreground mb-1">{t("gameDetail.developer")}</div>
                        <div className="text-sm text-foreground font-medium">{game.developers?.map((d) => d.name).join(", ") || "-"}</div>
                    </div>
                    <div>
                        <div className="text-sm text-muted-foreground mb-1">{t("gameDetail.publisher")}</div>
                        <div className="text-sm text-foreground font-medium">{game.publishers?.map((p) => p.name).join(", ") || "-"}</div>
                    </div>
                </div>

                {game.esrbRating && (
                    <div>
                        <div className="text-sm text-muted-foreground mb-1">{t("gameDetail.ageRating")}</div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary rounded-full text-xs font-bold text-secondary-foreground border border-border">
                            <Info size={14} />
                            {game.esrbRating}
                        </div>
                    </div>
                )}
            </div>

            <div className="w-full h-px bg-border" />

            {/* 3. Mağazalar (Where to Buy) */}
            {game.stores && game.stores.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <ShoppingBag size={16} /> {t("gameDetail.buyTitle")}
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                        {game.stores.map((store) => {
                            const { href, label } = getStoreInfo(store);

                            return (
                                <a
                                    key={store.storeName}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer nofollow"
                                    className="flex items-center justify-between p-3 rounded-lg bg-card/50 hover:bg-secondary border border-border hover:border-foreground/20 transition-all group"
                                >
                                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{store.storeName}</span>
                                    <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                                        {label}
                                        <ShoppingBag size={12} className="ml-1" />
                                    </span>
                                </a>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 4. Dış Bağlantılar */}
            {game.websiteUrl && (
                <div className="pt-2">
                    <a href={game.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <Globe size={14} />
                        {t("gameDetail.officialWebsite")}
                    </a>
                </div>
            )}
        </div>
    );
};
