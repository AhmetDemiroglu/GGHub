"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Coins, Loader2, Languages, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { aiAdminApi } from "@/api/admin/ai-admin.api";
import type { AiAgentAdmin, AiAgentUpdate, AiPurgeReport, AiSettings } from "@/models/admin/ai-admin.model";
import { useI18n } from "@/core/contexts/locale-context";
import { StatsCard } from "@/core/components/admin/stats-card";
import { AiBadge } from "@/core/components/base/ai-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Switch } from "@/core/components/ui/switch";
import { Textarea } from "@/core/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/core/components/ui/dialog";
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

const fmtTry = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => n.toLocaleString("tr-TR");
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "-");

type NumericKey = {
    [K in keyof AiSettings]: AiSettings[K] extends number ? K : never;
}[keyof AiSettings];

/**
 * AI Botlari yonetimi: motorun ana salteri ve sinirlari, botlar, Gemini sayaci ve sahte hesap
 * temizligi. Motorun calismasi icin sunucu kapisi da (Railway env AiAgents__HostEnabled) acik olmali;
 * kapaliysa sayfanin basinda uyari gorunur.
 */
export default function AiAgentsPage() {
    const t = useI18n();
    const queryClient = useQueryClient();

    const settingsQuery = useQuery({ queryKey: ["ai-admin", "settings"], queryFn: aiAdminApi.getSettings });
    const agentsQuery = useQuery({ queryKey: ["ai-admin", "agents"], queryFn: aiAdminApi.getAgents });
    const usageQuery = useQuery({ queryKey: ["ai-admin", "usage"], queryFn: () => aiAdminApi.getUsage(30), refetchInterval: 60_000 });

    const [draft, setDraft] = useState<AiSettings | null>(null);
    useEffect(() => {
        if (settingsQuery.data) setDraft(settingsQuery.data);
    }, [settingsQuery.data]);

    const saveSettings = useMutation({
        mutationFn: (data: AiSettings) => aiAdminApi.updateSettings(data),
        onSuccess: (data) => {
            toast.success(t("aiAdmin.saved"));
            queryClient.setQueryData(["ai-admin", "settings"], data);
            queryClient.invalidateQueries({ queryKey: ["ai-admin", "usage"] });
        },
        onError: (error: Error) => toast.error(t("aiAdmin.saveError"), { description: error.message }),
    });

    const provision = useMutation({
        mutationFn: aiAdminApi.provisionAgents,
        onSuccess: (res) => {
            toast.success(t("aiAdmin.provisioned", { count: res.created }));
            queryClient.invalidateQueries({ queryKey: ["ai-admin", "agents"] });
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const [editing, setEditing] = useState<AiAgentAdmin | null>(null);
    const [agentDraft, setAgentDraft] = useState<AiAgentUpdate | null>(null);
    const updateAgent = useMutation({
        mutationFn: ({ userId, data }: { userId: number; data: AiAgentUpdate }) => aiAdminApi.updateAgent(userId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ai-admin", "agents"] });
            setEditing(null);
            toast.success(t("aiAdmin.saved"));
        },
        onError: (error: Error) => toast.error(t("aiAdmin.saveError"), { description: error.message }),
    });

    const toggleAgent = (agent: AiAgentAdmin, isEnabled: boolean) =>
        updateAgent.mutate({
            userId: agent.userId,
            data: {
                isEnabled,
                persona: agent.persona,
                favoriteGenres: agent.favoriteGenres,
                ratingBias: agent.ratingBias,
                dailyActionQuota: agent.dailyActionQuota,
            },
        });

    const [preview, setPreview] = useState<AiPurgeReport | null>(null);
    const [confirmText, setConfirmText] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const purgePreview = useMutation({
        mutationFn: aiAdminApi.purgePreview,
        onSuccess: (report) => setPreview(report),
        onError: (error: Error) => toast.error(t("aiAdmin.purgeError"), { description: error.message }),
    });
    const purge = useMutation({
        mutationFn: () => aiAdminApi.purge(confirmText),
        onSuccess: (report) => {
            setPreview(report);
            setConfirmText("");
            toast.success(t("aiAdmin.purgeDone"));
            queryClient.invalidateQueries();
        },
        onError: (error: Error) => toast.error(t("aiAdmin.purgeError"), { description: error.message }),
    });

    if (settingsQuery.isLoading || !draft) {
        return (
            <div className="flex h-64 items-center justify-center">
                {settingsQuery.isError ? (
                    <p className="text-sm text-muted-foreground">{t("aiAdmin.loadError")}</p>
                ) : (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                )}
            </div>
        );
    }

    const setNum = (key: NumericKey) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setDraft((d) => (d ? { ...d, [key]: Number(e.target.value.replace(",", ".")) } : d));

    const numberField = (key: NumericKey, label: string, step = "1") => (
        <div className="space-y-1.5">
            <Label htmlFor={`ai-${key}`} className="text-xs">{label}</Label>
            <Input id={`ai-${key}`} type="number" step={step} value={String(draft[key])} onChange={setNum(key)} />
        </div>
    );

    const budgets = usageQuery.data?.budgets ?? [];
    const translation = budgets.find((b) => b.source === "translation");
    const agentsBudget = budgets.find((b) => b.source === "ai-agent");
    const purgeTotal = preview ? Object.values(preview.counts).reduce((a, b) => a + b, 0) : 0;

    return (
        <div className="container space-y-6 px-6 py-6 lg:px-8 lg:py-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold">
                        <Bot className="h-6 w-6 text-violet-500" /> {t("aiAdmin.title")}
                    </h1>
                    <p className="text-sm text-muted-foreground">{t("aiAdmin.subtitle")}</p>
                </div>
                {draft.hostEnabled ? (
                    <Badge variant="success">{t("aiAdmin.hostOn")}</Badge>
                ) : (
                    <p className="max-w-md rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                        {t("aiAdmin.hostOff")}
                    </p>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <StatsCard
                    title={t("aiAdmin.budgetTranslation")}
                    value={translation ? t("aiAdmin.budgetOf", { spent: fmtTry(translation.spentTry), limit: fmtTry(translation.limitTry) }) : "-"}
                    icon={Languages}
                    description={
                        translation
                            ? t("aiAdmin.budgetDetail", {
                                  calls: fmtInt(translation.callCount),
                                  today: fmtTry(translation.spentTodayTry),
                                  share: fmtTry(translation.dailyShareTry),
                              })
                            : undefined
                    }
                />
                <StatsCard
                    title={t("aiAdmin.budgetAgents")}
                    value={agentsBudget ? t("aiAdmin.budgetOf", { spent: fmtTry(agentsBudget.spentTry), limit: fmtTry(agentsBudget.limitTry) }) : "-"}
                    icon={Coins}
                    description={
                        agentsBudget
                            ? t("aiAdmin.budgetDetail", {
                                  calls: fmtInt(agentsBudget.callCount),
                                  today: fmtTry(agentsBudget.spentTodayTry),
                                  share: fmtTry(agentsBudget.dailyShareTry),
                              })
                            : undefined
                    }
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("aiAdmin.settingsTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="ai-enabled" className="font-semibold">{t("aiAdmin.agentsEnabled")}</Label>
                        <Switch id="ai-enabled" checked={draft.agentsEnabled} onCheckedChange={(v) => setDraft({ ...draft, agentsEnabled: v })} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {numberField("translationMonthlyBudgetTry", t("aiAdmin.translationBudget"), "0.01")}
                        {numberField("agentMonthlyBudgetTry", t("aiAdmin.agentBudget"), "0.01")}
                        {numberField("usdToTryRate", t("aiAdmin.usdRate"), "0.01")}
                        <div className="space-y-1.5">
                            <Label className="text-xs">{t("aiAdmin.primaryModel")}</Label>
                            <Select value={draft.primaryModel} onValueChange={(v) => setDraft({ ...draft, primaryModel: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {draft.knownModels.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">{t("aiAdmin.fallbackModel")}</Label>
                            <Select value={draft.fallbackModel} onValueChange={(v) => setDraft({ ...draft, fallbackModel: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {draft.knownModels.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {numberField("primaryModelRpm", t("aiAdmin.primaryRpm"))}
                        {numberField("dailyActionsPerAgent", t("aiAdmin.dailyActions"))}
                        {numberField("maxAgentMessagesPerUserPerDay", t("aiAdmin.maxMessages"))}
                        {numberField("maxUnsolicitedDmPerUserPerWeek", t("aiAdmin.maxWelcome"))}
                        {numberField("maxAgentRepliesPerPost", t("aiAdmin.maxReplies"))}
                        {numberField("feedMaxAiSharePercent", t("aiAdmin.feedShare"))}
                        {numberField("activeFromHour", t("aiAdmin.activeFrom"))}
                        {numberField("activeToHour", t("aiAdmin.activeTo"))}
                    </div>
                    <Button onClick={() => saveSettings.mutate(draft)} disabled={saveSettings.isPending} className="cursor-pointer">
                        {saveSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {t("aiAdmin.save")}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle>{t("aiAdmin.agentsTitle")}</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => provision.mutate()} disabled={provision.isPending} className="cursor-pointer">
                        {provision.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                        {t("aiAdmin.provision")}
                    </Button>
                </CardHeader>
                <CardContent>
                    {(agentsQuery.data ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("aiAdmin.noAgents")}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("aiAdmin.colBot")}</TableHead>
                                        <TableHead>{t("aiAdmin.colEnabled")}</TableHead>
                                        <TableHead>{t("aiAdmin.colStats")}</TableHead>
                                        <TableHead>{t("aiAdmin.colTasks")}</TableHead>
                                        <TableHead>{t("aiAdmin.colLast")}</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {agentsQuery.data!.map((agent) => (
                                        <TableRow key={agent.userId}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={agent.profileImageUrl ?? undefined} alt={agent.username} />
                                                        <AvatarFallback>{agent.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="flex items-center gap-1 text-sm font-medium">
                                                            {agent.displayName} <AiBadge />
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">@{agent.username} · {agent.favoriteGenres}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Switch checked={agent.isEnabled} onCheckedChange={(v) => toggleAgent(agent, v)} />
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {fmtInt(agent.followerCount)} / {fmtInt(agent.postCount)} / {fmtInt(agent.reviewCount)}
                                            </TableCell>
                                            <TableCell className="text-sm">{fmtInt(agent.tasksToday)}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{fmtDate(agent.lastActivityAt)}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="cursor-pointer"
                                                    onClick={() => {
                                                        setEditing(agent);
                                                        setAgentDraft({
                                                            isEnabled: agent.isEnabled,
                                                            persona: agent.persona,
                                                            favoriteGenres: agent.favoriteGenres,
                                                            ratingBias: agent.ratingBias,
                                                            dailyActionQuota: agent.dailyActionQuota,
                                                        });
                                                    }}
                                                >
                                                    {t("aiAdmin.edit")}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t("aiAdmin.usageTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    {(usageQuery.data?.daily ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("aiAdmin.empty")}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("aiAdmin.colDay")}</TableHead>
                                    <TableHead>{t("aiAdmin.colSource")}</TableHead>
                                    <TableHead>{t("aiAdmin.colModel")}</TableHead>
                                    <TableHead className="text-right">{t("aiAdmin.colCalls")}</TableHead>
                                    <TableHead className="text-right">{t("aiAdmin.colInput")}</TableHead>
                                    <TableHead className="text-right">{t("aiAdmin.colOutput")}</TableHead>
                                    <TableHead className="text-right">{t("aiAdmin.colTry")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {usageQuery.data!.daily.map((row) => (
                                    <TableRow key={`${row.day}-${row.source}-${row.model}`}>
                                        <TableCell className="text-sm">{row.day}</TableCell>
                                        <TableCell className="text-sm">{row.source}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{row.model}</TableCell>
                                        <TableCell className="text-right text-sm">{fmtInt(row.callCount)}</TableCell>
                                        <TableCell className="text-right text-sm">{fmtInt(row.inputTokens)}</TableCell>
                                        <TableCell className="text-right text-sm">{fmtInt(row.outputTokens)}</TableCell>
                                        <TableCell className="text-right text-sm">{fmtTry(row.spentTry)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>{t("aiAdmin.tasksTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {(usageQuery.data?.taskStats24h ?? []).length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t("aiAdmin.empty")}</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("aiAdmin.colType")}</TableHead>
                                        <TableHead>{t("aiAdmin.colStatus")}</TableHead>
                                        <TableHead className="text-right">{t("aiAdmin.colCount")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {usageQuery.data!.taskStats24h.map((s) => (
                                        <TableRow key={`${s.type}-${s.status}`}>
                                            <TableCell className="text-xs">{s.type}</TableCell>
                                            <TableCell className="text-xs">{s.status}</TableCell>
                                            <TableCell className="text-right text-sm">{fmtInt(s.count)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>{t("aiAdmin.recentTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[480px] overflow-auto">
                        {(usageQuery.data?.recentTasks ?? []).length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t("aiAdmin.empty")}</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("aiAdmin.colBot")}</TableHead>
                                        <TableHead>{t("aiAdmin.colType")}</TableHead>
                                        <TableHead>{t("aiAdmin.colStatus")}</TableHead>
                                        <TableHead>{t("aiAdmin.colTarget")}</TableHead>
                                        <TableHead>{t("aiAdmin.colResult")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {usageQuery.data!.recentTasks.map((task) => (
                                        <TableRow key={task.id}>
                                            <TableCell className="text-xs">@{task.agentUsername}</TableCell>
                                            <TableCell className="text-xs">{task.type}</TableCell>
                                            <TableCell className="text-xs">
                                                {task.status}
                                                <div className="text-[10px] text-muted-foreground">{fmtDate(task.completedAt ?? task.scheduledAt)}</div>
                                            </TableCell>
                                            <TableCell className="text-xs">{task.targetUsername ? `@${task.targetUsername}` : "-"}</TableCell>
                                            <TableCell className="max-w-[360px] text-xs">
                                                <span className="line-clamp-3">{task.resultSummary ?? task.error ?? "-"}</span>
                                                {task.model ? (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {task.model} · {fmtInt(task.inputTokens)}/{fmtInt(task.outputTokens)} tk
                                                    </span>
                                                ) : null}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="border-destructive/40">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-destructive" /> {t("aiAdmin.purgeTitle")}
                    </CardTitle>
                    <CardDescription>{t("aiAdmin.purgeDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button variant="outline" onClick={() => purgePreview.mutate()} disabled={purgePreview.isPending} className="cursor-pointer">
                        {purgePreview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {t("aiAdmin.purgePreview")}
                    </Button>

                    {preview ? (
                        <div className="space-y-3">
                            {purgeTotal === 0 ? (
                                <p className="text-sm text-muted-foreground">{t("aiAdmin.purgeNothing")}</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3 lg:grid-cols-4">
                                    {Object.entries(preview.counts)
                                        .filter(([, v]) => v > 0)
                                        .map(([k, v]) => (
                                            <div key={k} className="flex justify-between border-b py-1">
                                                <span className="text-muted-foreground">{k}</span>
                                                <span className="font-medium">{fmtInt(v)}</span>
                                            </div>
                                        ))}
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                                {t("aiAdmin.affected", { games: preview.affectedGames, posts: preview.affectedPosts, lists: preview.affectedLists })}
                            </p>

                            {preview.dryRun && purgeTotal > 0 ? (
                                <div className="flex flex-wrap items-end gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="purge-confirm" className="text-xs">{t("aiAdmin.purgeConfirmLabel")}</Label>
                                        <Input id="purge-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="w-40" />
                                    </div>
                                    <Button
                                        variant="destructive"
                                        disabled={!["SİL", "SIL"].includes(confirmText.trim().toLocaleUpperCase("tr-TR")) || purge.isPending}
                                        onClick={() => setConfirmOpen(true)}
                                        className="cursor-pointer"
                                    >
                                        {purge.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        {t("aiAdmin.purgeRun")}
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("aiAdmin.purgeDialogTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("aiAdmin.purgeDialogDescription")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("aiAdmin.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-white hover:bg-destructive/90"
                            onClick={() => purge.mutate()}
                        >
                            {t("aiAdmin.purgeRun")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {t("aiAdmin.editTitle")}: {editing?.displayName}
                        </DialogTitle>
                    </DialogHeader>
                    {agentDraft ? (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="agent-persona" className="text-xs">{t("aiAdmin.persona")}</Label>
                                <Textarea
                                    id="agent-persona"
                                    rows={6}
                                    maxLength={2000}
                                    value={agentDraft.persona}
                                    onChange={(e) => setAgentDraft({ ...agentDraft, persona: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="agent-genres" className="text-xs">{t("aiAdmin.genres")}</Label>
                                <Input id="agent-genres" value={agentDraft.favoriteGenres} onChange={(e) => setAgentDraft({ ...agentDraft, favoriteGenres: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="agent-bias" className="text-xs">{t("aiAdmin.ratingBias")}</Label>
                                    <Input id="agent-bias" type="number" min={-2} max={2} value={agentDraft.ratingBias} onChange={(e) => setAgentDraft({ ...agentDraft, ratingBias: Number(e.target.value) })} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="agent-quota" className="text-xs">{t("aiAdmin.quota")}</Label>
                                    <Input id="agent-quota" type="number" min={0} max={50} value={agentDraft.dailyActionQuota} onChange={(e) => setAgentDraft({ ...agentDraft, dailyActionQuota: Number(e.target.value) })} />
                                </div>
                            </div>
                        </div>
                    ) : null}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditing(null)} className="cursor-pointer">{t("aiAdmin.cancel")}</Button>
                        <Button
                            onClick={() => editing && agentDraft && updateAgent.mutate({ userId: editing.userId, data: agentDraft })}
                            disabled={updateAgent.isPending}
                            className="cursor-pointer"
                        >
                            {t("aiAdmin.save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
