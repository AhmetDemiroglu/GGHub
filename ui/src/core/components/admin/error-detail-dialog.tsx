"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, EyeOff, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getErrorGroup, updateErrorStatus } from "@/api/admin/error-log.api";
import type { ErrorEvent, ErrorLogStatus } from "@/models/admin/error-log.model";
import { errorEndpoint, formatErrorForClipboard } from "@/core/lib/error-log-format";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/core/components/ui/dialog";
import { cn } from "@/core/lib/utils";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";

interface ErrorDetailDialogProps {
    /** Acik olan hata grubu; null ise pencere kapali. */
    groupId: number | null;
    onClose: () => void;
}

export const errorStatusLabel = (t: ReturnType<typeof useI18n>, status: ErrorLogStatus) => {
    switch (status) {
        case "resolved":
            return t("admin.errors.statusResolved");
        case "ignored":
            return t("admin.errors.statusIgnored");
        default:
            return t("admin.errors.statusOpen");
    }
};

export const errorStatusVariant = (status: ErrorLogStatus): "destructive" | "secondary" | "outline" => {
    if (status === "open") return "destructive";
    return status === "resolved" ? "secondary" : "outline";
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="break-words text-sm">{children}</dd>
    </div>
);

export function ErrorDetailDialog({ groupId, onClose }: ErrorDetailDialogProps) {
    const t = useI18n();
    const locale = useCurrentLocale();
    const queryClient = useQueryClient();
    const [eventIndex, setEventIndex] = React.useState(0);

    React.useEffect(() => {
        setEventIndex(0);
    }, [groupId]);

    const { data: group, isLoading } = useQuery({
        queryKey: ["adminErrorGroup", groupId],
        queryFn: async () => (await getErrorGroup(groupId!)).data,
        enabled: groupId !== null,
    });

    const statusMutation = useMutation({
        mutationFn: (status: ErrorLogStatus) => updateErrorStatus(groupId!, status),
        onSuccess: () => {
            toast.success(t("admin.errors.statusUpdated"));
            queryClient.invalidateQueries({ queryKey: ["adminErrorGroups"] });
            queryClient.invalidateQueries({ queryKey: ["adminErrorGroup", groupId] });
            queryClient.invalidateQueries({ queryKey: ["adminErrorSummary"] });
        },
        onError: () => toast.error(t("admin.errors.statusUpdateFailed")),
    });

    const formatDate = (value: string) => new Date(value).toLocaleString(locale === "tr" ? "tr-TR" : "en-US");
    const event: ErrorEvent | undefined = group?.events[eventIndex];

    const copy = async () => {
        if (!group) return;
        try {
            await navigator.clipboard.writeText(formatErrorForClipboard(group, event));
            toast.success(t("admin.errors.copied"));
        } catch {
            toast.error(t("admin.errors.copyFailed"));
        }
    };

    return (
        <Dialog open={groupId !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent size="xl" className="flex max-h-[90vh] flex-col gap-4 overflow-hidden">
                <DialogHeader className="min-w-0 pr-8">
                    <DialogTitle className="break-words font-mono text-base">{group ? errorEndpoint(group) : t("admin.errors.title")}</DialogTitle>
                    <DialogDescription className="break-words">{group ? group.exceptionType : t("admin.errors.detailLoading")}</DialogDescription>
                </DialogHeader>

                {isLoading || !group ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">{t("admin.errors.detailLoading")}</p>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={errorStatusVariant(group.status)}>{errorStatusLabel(t, group.status)}</Badge>
                            <Button size="sm" onClick={copy} className="cursor-pointer gap-2">
                                <Copy className="h-4 w-4" />
                                {t("admin.errors.copy")}
                            </Button>
                            {group.status !== "resolved" ? (
                                <Button size="sm" variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate("resolved")} className="cursor-pointer gap-2">
                                    <Check className="h-4 w-4" />
                                    {t("admin.errors.markResolved")}
                                </Button>
                            ) : null}
                            {group.status !== "ignored" ? (
                                <Button size="sm" variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate("ignored")} className="cursor-pointer gap-2">
                                    <EyeOff className="h-4 w-4" />
                                    {t("admin.errors.markIgnored")}
                                </Button>
                            ) : null}
                            {group.status !== "open" ? (
                                <Button size="sm" variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate("open")} className="cursor-pointer gap-2">
                                    <RotateCcw className="h-4 w-4" />
                                    {t("admin.errors.reopen")}
                                </Button>
                            ) : null}
                        </div>

                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                            <p className="break-words rounded-md border bg-muted/40 p-3 text-sm">{group.message}</p>

                            <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                <Field label={t("admin.errors.occurrences")}>{group.count.toLocaleString()}</Field>
                                <Field label={t("admin.errors.httpStatus")}>{group.statusCode ?? "-"}</Field>
                                <Field label={t("admin.errors.firstSeen")}>{formatDate(group.firstSeenAt)}</Field>
                                <Field label={t("admin.errors.lastSeen")}>{formatDate(group.lastSeenAt)}</Field>
                                {group.logger ? (
                                    <div className="col-span-2 md:col-span-4">
                                        <Field label={t("admin.errors.logger")}>{group.logger}</Field>
                                    </div>
                                ) : null}
                            </dl>

                            {group.status === "resolved" ? <p className="text-xs text-muted-foreground">{t("admin.errors.resolvedHint")}</p> : null}

                            {group.events.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t("admin.errors.noEvents")}</p>
                            ) : (
                                <>
                                    <div>
                                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("admin.errors.recentEvents")}</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {group.events.map((item, index) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setEventIndex(index)}
                                                    className={cn(
                                                        "cursor-pointer rounded-md border px-2 py-1 text-xs transition-colors hover:bg-accent",
                                                        index === eventIndex && "border-primary bg-accent font-medium",
                                                    )}
                                                >
                                                    {formatDate(item.occurredAt)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {event ? (
                                        <>
                                            <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                {event.path ? (
                                                    <Field label={t("admin.errors.request")}>
                                                        <span className="font-mono text-xs">
                                                            {event.method} {event.path}
                                                            {event.queryString ?? ""}
                                                        </span>
                                                    </Field>
                                                ) : null}
                                                <Field label={t("admin.errors.user")}>{event.userId ? `${event.username ?? "-"} (#${event.userId})` : t("admin.errors.anonymous")}</Field>
                                                {event.traceId ? (
                                                    <Field label={t("admin.errors.traceId")}>
                                                        <span className="font-mono text-xs">{event.traceId}</span>
                                                    </Field>
                                                ) : null}
                                                {event.environment ? <Field label={t("admin.errors.environment")}>{event.environment}</Field> : null}
                                                {event.userAgent ? (
                                                    <div className="md:col-span-2">
                                                        <Field label={t("admin.errors.userAgent")}>
                                                            <span className="text-xs">{event.userAgent}</span>
                                                        </Field>
                                                    </div>
                                                ) : null}
                                            </dl>

                                            {event.innerChain ? (
                                                <div>
                                                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("admin.errors.innerChain")}</h4>
                                                    <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-3 text-xs">{event.innerChain}</pre>
                                                </div>
                                            ) : null}

                                            <div>
                                                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("admin.errors.stackTrace")}</h4>
                                                {event.stackTrace ? (
                                                    <pre className="max-h-80 overflow-auto rounded-md border bg-muted/40 p-3 text-xs leading-relaxed">{event.stackTrace}</pre>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">{t("admin.errors.noStack")}</p>
                                                )}
                                            </div>
                                        </>
                                    ) : null}
                                </>
                            )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
