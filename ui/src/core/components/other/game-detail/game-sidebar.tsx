import { Game } from "@/models/gaming/game.model";
import { Globe, Users, ShoppingBag, Info } from "lucide-react";
import React from "react";
import { ScoreBadge } from "../score-badge";

export const GameSidebar = ({ game }: { game: Game }) => {

    const getStoreInfo = (store: { url?: string; domain?: string }) => {
        const href = store.url && store.url.length > 0
            ? store.url
            : store.domain ? `https://${store.domain}` : "#";

        const label = store.url && store.url.length > 0 ? "İncele" : "Mağazaya Git";

        return { href, label };
    };

    return (
        <div className="space-y-8">
            {/* 1. Puanlama Rozetleri (Badge) */}
            <div className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Puanlar</h3>
                <div className="flex gap-4">
                    {/* Metacritic */}
                    <ScoreBadge type="metacritic" score={game.metacritic} />
                    {/* RAWG */}
                    <ScoreBadge type="rawg" score={game.rating} />
                    {/* GGHub (Henüz backend hesaplaması yok, null geçiyoruz) */}
                    <ScoreBadge type="gghub" score={null} />
                </div>
            </div>

            <div className="w-full h-px bg-border" />

            {/* 2. Künye Bilgileri (Grid) */}
            <div className="grid grid-cols-1 gap-y-6">

                {/* Platformlar */}
                <div>
                    <div className="text-sm text-muted-foreground mb-2">Platformlar</div>
                    <div className="flex flex-wrap gap-2 text-sm text-foreground leading-relaxed"> {/* text-white yerine text-foreground */}
                        {game.platforms?.map((p, i) => (
                            <span key={p.slug}>
                                <span className="underline decoration-muted-foreground/50 underline-offset-4 hover:decoration-foreground transition-all cursor-pointer">
                                    {p.name}
                                </span>
                                {i < game.platforms.length - 1 && <span className="text-muted-foreground mx-1">,</span>}
                            </span>
                        )) || <span className="text-muted-foreground">Belirtilmemiş</span>}
                    </div>
                </div>

                {/* Türler */}
                <div>
                    <div className="text-sm text-muted-foreground mb-2">Türler</div>
                    <div className="flex flex-wrap gap-2">
                        {game.genres?.map((g) => (
                            // bg-zinc-800 -> bg-secondary, text-zinc-300 -> text-secondary-foreground
                            <span key={g.slug} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded border border-border hover:border-foreground/20 transition-colors cursor-pointer">
                                {g.name}
                            </span>
                        )) || <span className="text-muted-foreground text-sm">-</span>}
                    </div>
                </div>

                {/* Geliştirici & Yayıncı */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-sm text-muted-foreground mb-1">Geliştirici</div>
                        <div className="text-sm text-foreground font-medium"> {/* text-white -> text-foreground */}
                            {game.developers?.map(d => d.name).join(", ") || "-"}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-muted-foreground mb-1">Yayıncı</div>
                        <div className="text-sm text-foreground font-medium">
                            {game.publishers?.map(p => p.name).join(", ") || "-"}
                        </div>
                    </div>
                </div>

                {/* Yaş Sınırı (ESRB) */}
                {game.esrbRating && (
                    <div>
                        <div className="text-sm text-muted-foreground mb-1">Yaş Sınırı</div>
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
                        <ShoppingBag size={16} /> Satın Al
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                        {game.stores.map((store) => {
                            const { href, label } = getStoreInfo(store);

                            return (
                                <a
                                    key={store.storeName}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-3 rounded-lg bg-card/50 hover:bg-secondary border border-border hover:border-foreground/20 transition-all group"
                                >
                                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                        {store.storeName}
                                    </span>
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
                    <a
                        href={game.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Globe size={14} />
                        Resmi Web Sitesi
                    </a>
                </div>
            )}
        </div>
    );
};