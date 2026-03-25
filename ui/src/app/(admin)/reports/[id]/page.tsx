"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
    ArrowLeft,
    MessageSquare,
    ShieldAlert,
    CheckCircle2,
    ExternalLink,
    Loader2,
    User,
    FileText,
    List,
    MessageCircle,
    Quote,
    AlignLeft,
    UserSearch,
} from "lucide-react";
import { getReportDetail, respondToReport } from "@/api/admin/admin.api";
import { ReportStatus } from "@/models/report/report.model";
import type { AdminReportDetail } from "@/models/admin/admin.model";
import { queryClient } from "@core/components/base/providers";
import { getImageUrl } from "@/core/lib/get-image-url";
import { translateReportStatus, getReportStatusVariant, translateEntityType } from "@/core/lib/report.utils";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/core/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Textarea } from "@/core/components/ui/textarea";
import { Separator } from "@/core/components/ui/separator";
import { useI18n } from "@/core/contexts/locale-context";

export default function ReportDetailPage() {
    const t = useI18n();
    const params = useParams();
    const reportId = Number(params.id);
    const [responseText, setResponseText] = useState("");

    const {
        data: report,
        isLoading,
        isError,
    } = useQuery<AdminReportDetail>({
        queryKey: ["adminReportDetail", reportId],
        queryFn: async () => (await getReportDetail(reportId)).data,
        enabled: !!reportId,
    });

    const { mutate: respondMutate, isPending: isResponding } = useMutation({
        mutationFn: () => respondToReport(reportId, { response: responseText }),
        onSuccess: () => {
            toast.success(t("admin.reportDetail.respondedSuccess"));
            queryClient.invalidateQueries({ queryKey: ["adminReportDetail", reportId] });
            queryClient.invalidateQueries({ queryKey: ["adminDashboardReports"] });
            setResponseText("");
        },
        onError: (err: { response?: { data?: { message?: string } } }) => {
            toast.error(err.response?.data?.message || t("admin.reportDetail.genericError"));
        },
    });

    const handleRespond = () => {
        if (responseText.length < 5) {
            toast.error(t("admin.reportDetail.minResponseError"));
            return;
        }

        respondMutate();
    };

    const getEntityIcon = (type: string) => {
        switch (type) {
            case "User":
                return <User className="h-4 w-4" />;
            case "List":
                return <List className="h-4 w-4" />;
            case "Comment":
                return <MessageCircle className="h-4 w-4" />;
            case "Review":
                return <FileText className="h-4 w-4" />;
            default:
                return <ShieldAlert className="h-4 w-4" />;
        }
    };

    const getContentLabels = (type: string) => {
        switch (type) {
            case "User":
                return {
                    title: t("admin.reportDetail.contentLabels.userTitle"),
                    content: t("admin.reportDetail.contentLabels.userContent"),
                };
            case "List":
                return {
                    title: t("admin.reportDetail.contentLabels.listTitle"),
                    content: t("admin.reportDetail.contentLabels.listContent"),
                };
            case "Comment":
                return {
                    title: t("admin.reportDetail.contentLabels.commentTitle"),
                    content: t("admin.reportDetail.contentLabels.commentContent"),
                };
            case "Review":
                return {
                    title: t("admin.reportDetail.contentLabels.reviewTitle"),
                    content: t("admin.reportDetail.contentLabels.reviewContent"),
                };
            default:
                return {
                    title: t("admin.reportDetail.contentLabels.defaultTitle"),
                    content: t("admin.reportDetail.contentLabels.defaultContent"),
                };
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">{t("admin.reportDetail.loading")}</div>;
    }

    if (isError || !report) {
        return <div className="p-8 text-center text-destructive">{t("admin.reportDetail.notFound")}</div>;
    }

    const isResolved = report.status === ReportStatus.Resolved || report.status === ReportStatus.Ignored;
    const labels = getContentLabels(report.entityType);
    const reportTitle = t("admin.reportDetail.title", { id: String(report.id) });

    return (
        <div className="container flex flex-col gap-6 py-6 lg:py-8 px-6 lg:px-8">
            <div className="flex flex-col gap-2">
                <Button asChild variant="ghost" className="-ml-3 w-fit h-auto px-3 py-1 text-muted-foreground hover:text-foreground cursor-pointer">
                    <Link href="/reports">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t("admin.reportDetail.backToReports")}
                    </Link>
                </Button>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">{reportTitle}</h1>
                        <Badge variant={getReportStatusVariant(report.status)} className="text-sm px-2.5 py-0.5">
                            {translateReportStatus(report.status)}
                        </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{format(new Date(report.reportedAt), "dd MMM yyyy, HH:mm", { locale: tr })}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <ShieldAlert className="h-5 w-5 text-primary" />
                                {t("admin.reportDetail.detailsTitle")}
                            </CardTitle>
                            <CardDescription>{t("admin.reportDetail.detailsDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-0">
                            <div className="space-y-1.5">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                    <Quote className="h-3 w-3" /> {t("admin.reportDetail.complaintReason")}
                                </h3>
                                <div className="p-3 bg-muted/30 rounded-md text-sm border border-border/50 text-foreground/90">{report.reason}</div>
                            </div>

                            <Separator />

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                        <AlignLeft className="h-3 w-3" /> {t("admin.reportDetail.reportedContent")}
                                    </h3>
                                    <Badge variant="outline" className="gap-1 font-normal text-xs h-5">
                                        {getEntityIcon(report.entityType)}
                                        {translateEntityType(report.entityType)}
                                    </Badge>
                                </div>

                                <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
                                    <div className="bg-muted/40 px-4 py-2 border-b flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground font-medium">{labels.title}</span>
                                        <span className="text-sm font-semibold text-foreground truncate max-w-[250px] sm:max-w-[400px]">{report.reportedEntityTitle}</span>
                                    </div>
                                    <div className="p-4">
                                        <span className="text-xs text-muted-foreground block mb-1 font-medium">{labels.content}</span>
                                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                            {report.reportedContent || <span className="text-muted-foreground italic">{t("admin.reportDetail.noContent")}</span>}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={isResolved ? "border-green-500/30 bg-green-500/5" : ""}>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                {isResolved ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <MessageSquare className="h-5 w-5" />}
                                {isResolved ? t("admin.reportDetail.resultTitle") : t("admin.reportDetail.actionTitle")}
                            </CardTitle>
                            <CardDescription>{isResolved ? t("admin.reportDetail.resultDescription") : t("admin.reportDetail.actionDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {isResolved ? (
                                <div className="space-y-2">
                                    <h3 className="text-sm font-medium">{t("admin.reportDetail.adminResponse")}</h3>
                                    <div className="text-sm p-4 bg-background rounded-md border shadow-sm">
                                        {report.adminResponse || <span className="text-muted-foreground italic">{t("admin.reportDetail.closedWithoutResponse")}</span>}
                                    </div>
                                    {report.resolvedAt && (
                                        <p className="text-xs text-muted-foreground text-right pt-1">
                                            {t("admin.reportDetail.closedAt", {
                                                date: format(new Date(report.resolvedAt), "dd MMM yyyy, HH:mm", { locale: tr }),
                                            })}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <Textarea
                                        placeholder={t("admin.reportDetail.responsePlaceholder")}
                                        className="min-h-[100px] resize-none"
                                        value={responseText}
                                        onChange={(e) => setResponseText(e.target.value)}
                                    />
                                    <div className="flex justify-end">
                                        <Button onClick={handleRespond} disabled={isResponding || responseText.length < 5} className="cursor-pointer">
                                            {isResponding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {t("admin.reportDetail.respondAndClose")}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1 flex flex-col gap-4">
                    <Card>
                        <CardHeader className="py-0 px-4 bg-muted/20">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <UserSearch className="h-5 w-5" /> {t("admin.reportDetail.ownerTitle")}
                            </CardTitle>
                            <CardDescription>{t("admin.reportDetail.ownerDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent className="py-0 px-4 m-0">
                            <Link
                                href={`/users/${report.accusedUserId}`}
                                className="flex items-center justify-between p-3 border rounded-md hover:bg-accent transition-colors group cursor-pointer"
                                title={t("admin.reportDetail.manageUserTitle")}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <Avatar className="h-10 w-10 border">
                                        <AvatarImage src={getImageUrl(report.accusedProfileImage)} />
                                        <AvatarFallback>{report.accusedUsername.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-semibold truncate text-foreground">{report.accusedUsername}</span>
                                        <span className="text-xs text-muted-foreground">ID: {report.accusedUserId}</span>
                                    </div>
                                </div>
                                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </Link>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="py-0 px-4 bg-muted/20">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <User className="h-5 w-5" /> {t("admin.reportDetail.reporterTitle")}
                            </CardTitle>
                            <CardDescription>{t("admin.reportDetail.reporterDescription")}</CardDescription>
                        </CardHeader>
                        <CardContent className="py-0 px-4 m-0">
                            <Link
                                href={`/users/${report.reporterId}`}
                                className="flex items-center justify-between p-3 border rounded-md hover:bg-accent transition-colors group cursor-pointer"
                                title={t("admin.reportDetail.viewUserTitle")}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <Avatar className="h-10 w-10 border">
                                        <AvatarImage src={getImageUrl(report.reporterProfileImage)} />
                                        <AvatarFallback>{report.reporterUsername.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-semibold truncate text-foreground">{report.reporterUsername}</span>
                                        <span className="text-xs text-muted-foreground">ID: {report.reporterId}</span>
                                    </div>
                                </div>
                                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
