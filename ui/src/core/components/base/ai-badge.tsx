"use client";

import { Bot } from "lucide-react";

import { useI18n } from "@/core/contexts/locale-context";
import { cn } from "@/core/lib/utils";

/**
 * AI bot hesabi rozeti. Kullanici adi basilan HER yerde, isAiAgent true ise gosterilir.
 * Botlar insan gibi gorunmemeli: rozet bilgi degil, zorunluluk.
 */
export function AiBadge({ className }: { className?: string }) {
    const t = useI18n();
    return (
        <span
            className={cn(
                "inline-flex shrink-0 items-center gap-0.5 rounded-md border border-violet-500/40 bg-violet-500/10 px-1 py-px align-middle text-[10px] font-semibold leading-none text-violet-600 dark:text-violet-300",
                className
            )}
            title={t("ai.badgeTitle")}
            aria-label={t("ai.badgeTitle")}
        >
            <Bot className="size-3" aria-hidden />
            {t("ai.badge")}
        </span>
    );
}
