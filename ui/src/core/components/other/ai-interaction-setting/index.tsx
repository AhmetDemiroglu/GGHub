"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot } from "lucide-react";
import { toast } from "sonner";

import { getMyProfile, updateAiInteraction } from "@/api/profile/profile.api";
import { Label } from "@/core/components/ui/label";
import { Switch } from "@/core/components/ui/switch";
import { useI18n } from "@/core/contexts/locale-context";
import { useLocalizedHref } from "@/core/hooks/use-localized-href";
import { cn } from "@/core/lib/utils";
import type { AiInteractionBlockReason } from "@/models/profile/profile.model";

interface AiInteractionSettingProps {
    className?: string;
    /** "card": ayarlar sayfasindaki bolum. "compact": mesajlar ekranindaki ince serit. */
    variant?: "card" | "compact";
}

/**
 * "AI hesaplarla etkilesim" anahtari. Gizlilik ayarlarinda VE mesajlar ekraninda ayni bilesen.
 *
 * Dogum tarihi yoksa ya da 18 yas altindaysa anahtar PASIF: Gemini API sartlari geregi botlar
 * yalnizca 18+ ve dogum tarihini girmis kullanicilarla etkilesir. Kural sunucuda
 * (AiInteractionPolicy); burasi yalnizca durumu dogru gosterir.
 */
export function AiInteractionSetting({ className, variant = "card" }: AiInteractionSettingProps) {
    const t = useI18n();
    const localizeHref = useLocalizedHref();
    const queryClient = useQueryClient();

    const { data: profile } = useQuery({
        queryKey: ["my-profile"],
        queryFn: getMyProfile,
        staleTime: 60 * 1000,
    });

    const { mutate, isPending } = useMutation({
        mutationFn: (allow: boolean) => updateAiInteraction({ allow }),
        onSuccess: () => {
            toast.success(t("ai.updated"));
            queryClient.invalidateQueries({ queryKey: ["my-profile"] });
        },
        onError: (error: Error) => toast.error(t("ai.updateError"), { description: error.message }),
    });

    if (!profile) return null;

    const reason = (profile.aiInteractionBlockReason ?? null) as AiInteractionBlockReason | null;
    // Yas/dogum tarihi engeli anahtari kilitler; "optedOut" yalnizca ayarin kapali oldugunu soyler.
    const locked = reason === "needsBirthDate" || reason === "underage";
    const checked = !locked && (profile.allowAiInteraction ?? true);

    const note = reason === "needsBirthDate"
        ? t("ai.needsBirthDate")
        : reason === "underage"
            ? t("ai.underage")
            : null;

    return (
        <div
            className={cn(
                variant === "card" ? "rounded-lg border p-4" : "rounded-md border border-violet-500/30 bg-violet-500/5 px-3 py-2",
                className,
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                    <Label htmlFor={`ai-interaction-${variant}`} className="flex items-center gap-1.5 font-semibold">
                        <Bot className="size-4 text-violet-500" aria-hidden />
                        {t("ai.interactionTitle")}
                    </Label>
                    {variant === "card" ? (
                        <p className="text-sm text-muted-foreground">{t("ai.interactionDescription")}</p>
                    ) : null}
                </div>
                <Switch
                    id={`ai-interaction-${variant}`}
                    checked={checked}
                    disabled={locked || isPending}
                    onCheckedChange={(next) => mutate(next)}
                    aria-label={t("ai.interactionSwitch")}
                    className="cursor-pointer"
                />
            </div>
            {note ? (
                <p className="mt-2 text-xs text-muted-foreground">
                    {note}{" "}
                    {reason === "needsBirthDate" ? (
                        <Link href={localizeHref("/profile")} className="font-medium text-primary hover:underline">
                            {t("ai.addBirthDate")}
                        </Link>
                    ) : null}
                </p>
            ) : null}
        </div>
    );
}
