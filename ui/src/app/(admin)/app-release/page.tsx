"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Smartphone, Wrench } from "lucide-react";
import { toast } from "sonner";

import { appReleaseAdminApi } from "@/api/admin/app-release-admin.api";
import type { AppReleasePolicy } from "@/models/admin/app-release-admin.model";
import { useI18n } from "@/core/contexts/locale-context";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Switch } from "@/core/components/ui/switch";
import { Textarea } from "@/core/components/ui/textarea";

type TextKey = {
    [K in keyof AppReleasePolicy]: AppReleasePolicy[K] extends string | null ? K : never;
}[keyof AppReleasePolicy];

type ApiError = Error & { response?: { data?: { message?: string } } };

const fmtDate = (s: string) => new Date(s).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });

/**
 * Mobil surum politikasi: platform basina minimum (zorunlu) ve onerilen surum, artı bakim modu.
 * Karar sunucuda verilir (AppReleaseService.EvaluateAsync); uygulama acilista sorar.
 */
export default function AppReleasePage() {
    const t = useI18n();
    const queryClient = useQueryClient();

    const policyQuery = useQuery({ queryKey: ["app-release", "policy"], queryFn: appReleaseAdminApi.getPolicy });
    const [draft, setDraft] = useState<AppReleasePolicy | null>(null);
    useEffect(() => {
        if (policyQuery.data) setDraft(policyQuery.data);
    }, [policyQuery.data]);

    const save = useMutation({
        mutationFn: (data: AppReleasePolicy) => appReleaseAdminApi.updatePolicy(data),
        onSuccess: (data) => {
            toast.success(t("appReleaseAdmin.saved"));
            queryClient.setQueryData(["app-release", "policy"], data);
        },
        onError: (error: ApiError) =>
            toast.error(t("appReleaseAdmin.saveError"), { description: error.response?.data?.message ?? error.message }),
    });

    if (policyQuery.isLoading || !draft) {
        return (
            <div className="flex h-64 items-center justify-center">
                {policyQuery.isError ? (
                    <p className="text-sm text-muted-foreground">{t("appReleaseAdmin.loadError")}</p>
                ) : (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                )}
            </div>
        );
    }

    const setText = (key: TextKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft((d) => (d ? { ...d, [key]: e.target.value } : d));

    const versionField = (key: TextKey, label: string) => (
        <div className="space-y-1.5">
            <Label htmlFor={`ar-${key}`} className="text-xs">{label}</Label>
            <Input id={`ar-${key}`} placeholder="1.3.0" value={draft[key] ?? ""} onChange={setText(key)} />
        </div>
    );

    return (
        <div className="container space-y-6 px-6 py-6 lg:px-8 lg:py-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold">
                        <Smartphone className="h-6 w-6 text-violet-500" /> {t("appReleaseAdmin.title")}
                    </h1>
                    <p className="text-sm text-muted-foreground">{t("appReleaseAdmin.subtitle")}</p>
                </div>
                {draft.maintenanceEnabled ? (
                    <Badge variant="destructive">{t("appReleaseAdmin.maintenanceOn")}</Badge>
                ) : (
                    <Badge variant="success">{t("appReleaseAdmin.maintenanceOff")}</Badge>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wrench className="h-4 w-4" /> {t("appReleaseAdmin.maintenanceTitle")}
                    </CardTitle>
                    <CardDescription>{t("appReleaseAdmin.maintenanceDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="ar-maintenance" className="font-semibold">{t("appReleaseAdmin.maintenanceEnabled")}</Label>
                        <Switch
                            id="ar-maintenance"
                            checked={draft.maintenanceEnabled}
                            onCheckedChange={(v) => setDraft({ ...draft, maintenanceEnabled: v })}
                        />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="ar-maintenanceMessageTr" className="text-xs">{t("appReleaseAdmin.maintenanceMessageTr")}</Label>
                            <Textarea
                                id="ar-maintenanceMessageTr"
                                rows={3}
                                maxLength={500}
                                placeholder={t("appReleaseAdmin.maintenanceMessagePlaceholder")}
                                value={draft.maintenanceMessageTr ?? ""}
                                onChange={setText("maintenanceMessageTr")}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="ar-maintenanceMessageEn" className="text-xs">{t("appReleaseAdmin.maintenanceMessageEn")}</Label>
                            <Textarea
                                id="ar-maintenanceMessageEn"
                                rows={3}
                                maxLength={500}
                                placeholder={t("appReleaseAdmin.maintenanceMessagePlaceholder")}
                                value={draft.maintenanceMessageEn ?? ""}
                                onChange={setText("maintenanceMessageEn")}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t("appReleaseAdmin.versionsTitle")}</CardTitle>
                    <CardDescription>{t("appReleaseAdmin.versionsDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4 rounded-lg border p-4">
                            <p className="font-semibold">iOS</p>
                            {versionField("iosMinVersion", t("appReleaseAdmin.minVersion"))}
                            {versionField("iosRecommendedVersion", t("appReleaseAdmin.recommendedVersion"))}
                            <div className="space-y-1.5">
                                <Label htmlFor="ar-iosStoreUrl" className="text-xs">{t("appReleaseAdmin.storeUrl")}</Label>
                                <Input id="ar-iosStoreUrl" value={draft.iosStoreUrl} onChange={setText("iosStoreUrl")} />
                            </div>
                        </div>
                        <div className="space-y-4 rounded-lg border p-4">
                            <p className="font-semibold">Android</p>
                            {versionField("androidMinVersion", t("appReleaseAdmin.minVersion"))}
                            {versionField("androidRecommendedVersion", t("appReleaseAdmin.recommendedVersion"))}
                            <div className="space-y-1.5">
                                <Label htmlFor="ar-androidStoreUrl" className="text-xs">{t("appReleaseAdmin.storeUrl")}</Label>
                                <Input id="ar-androidStoreUrl" value={draft.androidStoreUrl} onChange={setText("androidStoreUrl")} />
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{t("appReleaseAdmin.versionsHint")}</p>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button onClick={() => save.mutate(draft)} disabled={save.isPending} className="cursor-pointer">
                            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {t("appReleaseAdmin.save")}
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            {t("appReleaseAdmin.updatedAt", { date: fmtDate(draft.updatedAt) })}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
