"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, getReports, getRecentUsers, getRecentReviews } from "@/api/admin/admin.api";
import { getTopUsers, getTopLists, getTopRatedGames } from "@/api/analytics/analytics.api";
import type { DashboardStats, AdminReport, AdminUserSummary, RecentReview } from "@/models/admin/admin.model";
import type { PaginatedResponse } from "@/models/system/api.model";
import type { TopUser, TopList, TopGame } from "@/models/analytics/analytics.model";
import { ReportStatus } from "@/models/report/report.model";
import { Users, ShieldAlert, Library, Star } from "lucide-react";
import { StatsCard } from "@/core/components/admin/stats-card";
import { RecentReports } from "@/core/components/admin/recent-reports";
import { AdminQuickSearch } from "@/core/components/admin/admin-quick-search";
import { RecentUsersList } from "@/core/components/admin/recent-users-list";
import { RecentReviewsList } from "@/core/components/admin/recent-reviews-list";
import { TopUsersCard } from "@/core/components/admin/top-users-card";
import { TopListsCard } from "@/core/components/admin/top-lists-card";
import { TopGamesCard } from "@/core/components/admin/top-games-card";
import { useI18n } from "@/core/contexts/locale-context";

export default function DashboardPage() {
    const t = useI18n();

    const { data: statsData, isLoading: isLoadingStats } = useQuery<DashboardStats>({
        queryKey: ["adminDashboardStats"],
        queryFn: async () => (await getDashboardStats()).data,
    });

    const { data: reportsData, isLoading: isLoadingReports, isError: isErrorReports } = useQuery<PaginatedResponse<AdminReport>>({
        queryKey: ["adminDashboardReports"],
        queryFn: async () =>
            (
                await getReports({
                    page: 1,
                    pageSize: 5,
                    statusFilter: ReportStatus.Open,
                    sortBy: "createdAt",
                    sortDirection: "desc",
                })
            ).data,
    });

    const { data: recentUsersData, isLoading: isLoadingRecentUsers } = useQuery<AdminUserSummary[]>({
        queryKey: ["adminRecentUsers"],
        queryFn: async () => (await getRecentUsers(5)).data,
    });

    const { data: recentReviewsData, isLoading: isLoadingRecentReviews } = useQuery<RecentReview[]>({
        queryKey: ["adminRecentReviews"],
        queryFn: async () => (await getRecentReviews(5)).data,
    });

    const { data: topUsersData, isLoading: isLoadingTopUsers } = useQuery<TopUser[]>({
        queryKey: ["analyticsTopUsers"],
        queryFn: async () => (await getTopUsers(5)).data,
    });

    const { data: topListsData, isLoading: isLoadingTopLists } = useQuery<TopList[]>({
        queryKey: ["analyticsTopLists"],
        queryFn: async () => (await getTopLists(5)).data,
    });

    const { data: topGamesData, isLoading: isLoadingTopGames } = useQuery<TopGame[]>({
        queryKey: ["analyticsTopGames"],
        queryFn: async () => (await getTopRatedGames(5)).data,
    });

    const isLoading = isLoadingStats || isLoadingReports || isLoadingRecentUsers || isLoadingRecentReviews || isLoadingTopUsers || isLoadingTopLists || isLoadingTopGames;

    if (isLoading) {
        return (
            <div>
                <h2 className="text-3xl font-bold tracking-tight">{t("admin.dashboard")}</h2>
                <p className="text-muted-foreground">{t("admin.loadingStats")}</p>
            </div>
        );
    }

    if (isErrorReports) {
        return (
            <div>
                <h2 className="text-3xl font-bold tracking-tight">{t("admin.loadErrorTitle")}</h2>
                <p className="text-destructive">{t("admin.loadErrorDescription")}</p>
            </div>
        );
    }

    const pendingReports = reportsData?.items || [];

    return (
        <div className="container flex flex-col gap-8 px-6 py-6 lg:px-8 lg:py-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">{t("admin.dashboard")}</h2>
                <p className="text-muted-foreground">{t("admin.dashboardDescription")}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard title={t("admin.totalUsers")} value={statsData?.totalUsers ?? 0} icon={Users} />
                <StatsCard title={t("admin.bannedUsers")} value={statsData?.bannedUsers ?? 0} icon={ShieldAlert} />
                <StatsCard title={t("admin.pendingReports")} value={statsData?.pendingReports ?? 0} icon={Library} />
                <StatsCard title={t("admin.totalReviews")} value={statsData?.totalReviews ?? 0} icon={Star} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <RecentReports reports={pendingReports} />
                <AdminQuickSearch />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <RecentUsersList users={recentUsersData || []} />
                <RecentReviewsList reviews={recentReviewsData || []} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <TopUsersCard users={topUsersData || []} />
                <TopListsCard lists={topListsData || []} />
                <TopGamesCard games={topGamesData || []} />
            </div>
        </div>
    );
}
