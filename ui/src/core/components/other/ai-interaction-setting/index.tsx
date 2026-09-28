"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot } from "lucide-react";
import { toast } from "sonner";

import { updateAiInteraction } from "@/api/profile/profile.api";
import { useAiConsent } from "@/core/components/other/ai-consent";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/core/components/ui/alert-dialog";
import { Label } from "@/core/components/ui/label";
import { Switch } from "@/core/components/ui/switch";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { cn } from "@/core/lib/utils";

interface AiInteractionSettingProps {
    className?: string;
    /** "card": ayarlar sayfasindaki bolum. "compact": mesajlar ekranindaki ince serit. */
    variant?: "card" | "compact";
}

/**
 * "AI hesaplarla etkilesim" ayari. Gizlilik ayarlarinda VE mesajlar ekraninda ayni bilesen.
 *
 * Varsayilan KAPALI. Acmak: anahtar onay penceresini acar (dogum tarihi + riza tiki), anahtar
 * ancak sunucu onayi kaydedince acik gorunur. Kapatmak: onay sorulur, riza geri alinir, botlarin
 * takibi kalkar. 18 yas alti kullanicida anahtar pasif. Kural sunucuda (AiInteractionPolicy).
 */
export function AiInteractionSetting({ className, variant = "card" }: AiInteractionSettingProps) {
    const t = useI18n();
    const locale = useCurrentLocale();
    const queryClient = useQueryClient();
    const { profile, open } = useAiConsent();
    const [confirmOff, setConfirmOff] = useState(false);

    const { mutate: turnOff, isPending } = useMutation({
        meta: { suppressGlobalToast: true },
        mutationFn: () => updateAiInteraction({ allow: false, source: "web" }),
        onSuccess: () => {
            toast.success(t("ai.disabled"));
            queryClient.invalidateQueries({ queryKey: ["my-profile"] });
            queryClient.invalidateQueries({ queryKey: ["profile"] });
        },
        onError: (error: Error) => toast.error(t("ai.updateError"), { description: error.message }),
    });

    if (!profile) return null;

    const reason = profile.aiInteractionBlockReason ?? null;
    const underage = reason === "underage";
    const isOn = !reason && profile.allowAiInteraction === true;

    const consentDate = profile.aiConsentAt
        ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(profile.aiConsentAt))
        : null;

    const note = underage
        ? t("ai.underage")
        : isOn
            ? consentDate
                ? t("ai.onSince", { date: consentDate })
                : null
            : reason === "needsBirthDate"
                ? t("ai.needsBirthDate")
                : t("ai.consentRequired");

    const handleChange = (next: boolean) => {
        if (next) {
            void open(reason === "needsBirthDate" ? "needsBirthDate" : "consentRequired");
        } else {
            setConfirmOff(true);
        }
    };

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
                    {variant === "card" ? <p className="text-sm text-muted-foreground">{t("ai.interactionDescription")}</p> : null}
                </div>
                <Switch
                    id={`ai-interaction-${variant}`}
                    checked={isOn}
                    disabled={underage || isPending}
                    onCheckedChange={handleChange}
                    aria-label={t("ai.interactionSwitch")}
                    className="cursor-pointer"
                />
            </div>
            {note ? <p className="mt-2 text-xs text-muted-foreground">{note}</p> : null}
            {variant === "card" && isOn ? <p className="mt-1 text-xs text-muted-foreground">{t("ai.revokeHint")}</p> : null}

            <AlertDialog open={confirmOff} onOpenChange={setConfirmOff}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("ai.disableTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("ai.disableDescription")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction className="cursor-pointer" onClick={() => turnOff()}>
                            {t("ai.disableConfirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
