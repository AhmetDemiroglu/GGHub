"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

import { getMyProfile, giveAiConsent } from "@/api/profile/profile.api";
import { Button } from "@/core/components/ui/button";
import { Checkbox } from "@/core/components/ui/checkbox";
import { DatePicker } from "@/core/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/components/ui/dialog";
import { Label } from "@/core/components/ui/label";
import { useI18n } from "@/core/contexts/locale-context";
import { useAuth } from "@/core/hooks/use-auth";
import { useLocalizedHref } from "@/core/hooks/use-localized-href";
import { AiConsentReason, registerAiConsentHandler } from "@/core/lib/ai-consent-bridge";
import { AI_CONSENT_VERSION } from "@/models/profile/profile.model";

type Pending = { reason: AiConsentReason; resolve: (accepted: boolean) => void };

type AiConsentContextValue = { open: (reason?: AiConsentReason) => Promise<boolean> };

const AiConsentContext = createContext<AiConsentContextValue | null>(null);

/**
 * AI etkilesimi onay penceresinin sahibi. Kokte bir kez mount edilir (Providers).
 *
 * Iki giris yolu:
 *   1) axios interceptor: sunucu bota yazmayi 403 ai_consent_required ile reddedince
 *      (ai-consent-bridge) pencere acilir; onaylanirsa istek tekrarlanir.
 *   2) useAiConsent().open / ensure: ayarlar karti, bot profilindeki mesaj butonu gibi yerler.
 */
export function AiConsentProvider({ children }: { children: React.ReactNode }) {
    const [pending, setPending] = useState<Pending | null>(null);
    const pendingRef = useRef<Pending | null>(null);

    const open = useCallback(
        (reason: AiConsentReason = "consentRequired") =>
            new Promise<boolean>((resolve) => {
                // Acik bir pencere varken yenisi gelirse onceki "vazgecildi" sayilir.
                pendingRef.current?.resolve(false);
                const next = { reason, resolve };
                pendingRef.current = next;
                setPending(next);
            }),
        [],
    );

    const close = useCallback((accepted: boolean) => {
        pendingRef.current?.resolve(accepted);
        pendingRef.current = null;
        setPending(null);
    }, []);

    useEffect(() => {
        registerAiConsentHandler(open);
        return () => registerAiConsentHandler(null);
    }, [open]);

    return (
        <AiConsentContext.Provider value={{ open }}>
            {children}
            <AiConsentDialog pending={pending} onClose={close} />
        </AiConsentContext.Provider>
    );
}

/**
 * Onay penceresine erisim. `ensure()`: kullanici zaten uygunsa true, degilse pencereyi acar
 * ve sonucunu doner. Girissiz kullanicida false (cagiran giris sayfasina yonlendirir).
 */
export function useAiConsent() {
    const context = useContext(AiConsentContext);
    const { isAuthenticated } = useAuth();
    const { data: profile } = useQuery({
        queryKey: ["my-profile"],
        queryFn: getMyProfile,
        enabled: isAuthenticated,
        staleTime: 60 * 1000,
    });

    const reason = profile?.aiInteractionBlockReason ?? null;

    const ensure = useCallback(async () => {
        if (!context || !profile) return false;
        if (!reason) return true;
        if (reason === "loginRequired") return false;
        return context.open(reason);
    }, [context, profile, reason]);

    return {
        ensure,
        open: context?.open ?? (async () => false),
        profile,
        isAuthenticated,
        eligible: !!profile && !reason,
    };
}

function errorText(error: unknown, fallback: string) {
    if (error instanceof AxiosError) {
        const data = error.response?.data as string | { message?: string } | undefined;
        if (typeof data === "string" && data.length > 0) return data;
        if (data && typeof data === "object" && data.message) return data.message;
    }
    return fallback;
}

function AiConsentDialog({ pending, onClose }: { pending: Pending | null; onClose: (accepted: boolean) => void }) {
    const t = useI18n();
    const localizeHref = useLocalizedHref();
    const queryClient = useQueryClient();
    const { isAuthenticated } = useAuth();
    const [accepted, setAccepted] = useState(false);
    const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);

    const { data: profile } = useQuery({
        queryKey: ["my-profile"],
        queryFn: getMyProfile,
        enabled: isAuthenticated && !!pending,
        staleTime: 60 * 1000,
    });

    useEffect(() => {
        if (pending) {
            setAccepted(false);
            setBirthDate(undefined);
            setError(null);
        }
    }, [pending]);

    const needsBirthDate = !profile?.dateOfBirth;
    const underage = pending?.reason === "underage" || profile?.aiInteractionBlockReason === "underage";

    const { mutate, isPending } = useMutation({
        mutationFn: () =>
            giveAiConsent({
                accept: true,
                textVersion: AI_CONSENT_VERSION,
                source: "web",
                dateOfBirth: needsBirthDate && birthDate ? format(birthDate, "yyyy-MM-dd") : null,
            }),
        meta: { suppressGlobalToast: true },
        onSuccess: (updated) => {
            queryClient.setQueryData(["my-profile"], updated);
            queryClient.invalidateQueries({ queryKey: ["my-profile"] });
            queryClient.invalidateQueries({ queryKey: ["profile"] });
            toast.success(t("aiConsent.enabled"));
            onClose(true);
        },
        onError: (err) => setError(errorText(err, t("aiConsent.error"))),
    });

    const canSubmit = accepted && (!needsBirthDate || !!birthDate) && !isPending;

    return (
        <Dialog open={!!pending} onOpenChange={(open) => (!open ? onClose(false) : undefined)}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
                <div aria-hidden className="-mx-6 -mt-6 mb-1 h-24 overflow-hidden rounded-t-lg bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400">
                    <div className="flex h-full items-center justify-center gap-3 text-4xl">
                        <span className="animate-bounce [animation-delay:-0.2s]">🤖</span>
                        <span className="animate-bounce">💬</span>
                        <span className="animate-bounce [animation-delay:-0.4s]">🎮</span>
                    </div>
                </div>

                {underage ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>{t("aiConsent.underageTitle")}</DialogTitle>
                            <DialogDescription>{t("aiConsent.underageText")}</DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button onClick={() => onClose(false)} className="cursor-pointer">
                                {t("aiConsent.close")}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>{t("aiConsent.title")}</DialogTitle>
                            <DialogDescription>{t("aiConsent.intro")}</DialogDescription>
                        </DialogHeader>

                        <ul className="space-y-2 text-sm">
                            {(["point1", "point2", "point3", "point4"] as const).map((key, index) => (
                                <li key={key} className="flex gap-2">
                                    <span aria-hidden className="shrink-0">{["🤖", "🔒", "📬", "🔞"][index]}</span>
                                    <span className="text-muted-foreground">{t(`aiConsent.${key}`)}</span>
                                </li>
                            ))}
                        </ul>
                        <Link
                            href={`${localizeHref("/privacy")}#ai-consent`}
                            target="_blank"
                            className="text-xs font-medium text-primary hover:underline"
                        >
                            {t("aiConsent.readMore")}
                        </Link>

                        {needsBirthDate ? (
                            <div className="space-y-1.5 rounded-lg border p-3">
                                <Label>{t("aiConsent.birthDateLabel")}</Label>
                                <DatePicker date={birthDate} onDateChange={setBirthDate} placeholder={t("aiConsent.birthDatePlaceholder")} className="w-full" />
                                <p className="text-xs text-muted-foreground">{t("aiConsent.birthDateHint")}</p>
                            </div>
                        ) : null}

                        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-violet-500/40 bg-violet-500/5 p-3">
                            <Checkbox checked={accepted} onCheckedChange={(value) => setAccepted(value === true)} className="mt-0.5" />
                            <span className="text-sm font-medium">{t("aiConsent.checkbox")}</span>
                        </label>

                        {error ? <p className="text-sm text-destructive">{error}</p> : null}

                        <p className="text-xs text-muted-foreground">{t("aiConsent.footer")}</p>

                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => onClose(false)} className="cursor-pointer">
                                {t("aiConsent.cancel")}
                            </Button>
                            <Button onClick={() => mutate()} disabled={!canSubmit} className="cursor-pointer">
                                {t("aiConsent.confirm")}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
