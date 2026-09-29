"use client";

import { useState } from "react";
import { Smartphone } from "lucide-react";
import { MobileAppDialog, PlatformGlyph, isPhoneOrTablet, type MobilePlatform } from "@/core/components/other/public/mobile-app-dialog";
import { useI18n } from "@/core/contexts/locale-context";
import { APP_STORE_URL, GOOGLE_PLAY_URL } from "@/core/lib/store-links";
import { cn } from "@/core/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/core/components/ui/tooltip";

const STORE_URL: Record<MobilePlatform, string | null> = { ios: APP_STORE_URL, android: GOOGLE_PLAY_URL };

/**
 * Ust cubugun sag ucundaki "mobil uygulamayi denedin mi?" rozeti. Masaustunde magaza
 * ikonlari QR'li indirme penceresini acar; telefonda QR anlamsiz oldugu icin dogrudan
 * ilgili magazaya gidilir (StoreButtons ile ayni kural). Dar ekranda tek ikona iner.
 */
export function AppDownloadBadge({ className }: { className?: string }) {
    const t = useI18n();
    const [platform, setPlatform] = useState<MobilePlatform | null>(null);

    const open = (target: MobilePlatform) => {
        const url = STORE_URL[target];
        if (isPhoneOrTablet() && url) {
            window.open(url, "_blank", "noopener,noreferrer");
            return;
        }
        setPlatform(target);
    };

    return (
        <TooltipProvider delayDuration={300}>
            <div className={cn("flex items-center", className)}>
                {/* md ve ustu: metin + iki magaza ikonu */}
                <div className="topbar-field hidden items-center gap-0.5 rounded-full border border-border/60 bg-muted/40 py-0.5 pl-3 pr-1 md:flex">
                    <span className="mr-1.5 hidden whitespace-nowrap text-xs font-medium text-muted-foreground lg:inline">{t("topbar.appBadge")}</span>
                    <StoreIconButton label={t("topbar.appStore")} onClick={() => open("ios")}>
                        <PlatformGlyph platform="ios" className="size-3.5" />
                    </StoreIconButton>
                    <StoreIconButton label={t("topbar.googlePlay")} onClick={() => open("android")}>
                        <PlatformGlyph platform="android" className="size-3.5" />
                    </StoreIconButton>
                </div>

                {/* Mobil web: tek ikon, pencere acar (telefonda magazaya gider). */}
                <button
                    type="button"
                    aria-label={t("topbar.appBadgeAria")}
                    onClick={() => open(/Android/i.test(navigator.userAgent) ? "android" : "ios")}
                    className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground md:hidden"
                >
                    <Smartphone className="size-5" />
                </button>
            </div>
            <MobileAppDialog platform={platform} onClose={() => setPlatform(null)} />
        </TooltipProvider>
    );
}

function StoreIconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label={label}
                    onClick={onClick}
                    className="flex size-7 cursor-pointer items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-background hover:text-foreground hover:shadow-sm"
                >
                    {children}
                </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
    );
}
