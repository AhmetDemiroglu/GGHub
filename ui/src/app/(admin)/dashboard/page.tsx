"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, getReports, getRecentUsers, getRecentReviews } from "@/api/admin/admin.api";
import type { DashboardStats, AdminReport, AdminUserSummary, RecentReview } from "@/models/admin/admin.model";
import { ReportStatus } from "@/models/admin/admin.model";
import { Users, ShieldAlert, Library, Star } from "lucide-react";
import { StatsCard } from "@/core/components/admin/stats-card";
import { RecentReports } from "@/core/components/admin/recent-reports";
import { AdminQuickSearch } from "@/core/components/admin/admin-quick-search";
import { RecentUsersList } from "@/core/components/admin/recent-users-list";
import { RecentReviewsList } from "@/core/components/admin/recent-reviews-list";

export default function DashboardPage() {
    const { data: statsData, isLoading: isLoadingStats } = useQuery<DashboardStats>({
        queryKey: ["adminDashboardStats"],
        queryFn: async () => (await getDashboardStats()).data,
    });

    const {
        data: reportsData,
        isLoading: isLoadingReports,
        isError: isErrorReports,
    } = useQuery<AdminReport[]>({
        queryKey: ["adminReports"],
        queryFn: async () => (await getReports()).data,
    });

    const { data: recentUsersData, isLoading: isLoadingRecentUsers } = useQuery<AdminUserSummary[]>({
        queryKey: ["adminRecentUsers"],
        queryFn: async () => (await getRecentUsers(5)).data,
    });

    const { data: recentReviewsData, isLoading: isLoadingRecentReviews } = useQuery<RecentReview[]>({
        queryKey: ["adminRecentReviews"],
        queryFn: async () => (await getRecentReviews(5)).data,
    });

    const isLoading = isLoadingStats || isLoadingReports || isLoadingRecentUsers || isLoadingRecentReviews;
    if (isLoading) {
        return (
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground">İstatistikler yükleniyor...</p>
            </div>
        );
    }

    if (isErrorReports) {
        console.error("Raporlar yüklenirken hata oluştu.");
        return (
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Hata</h2>
                <p className="text-destructive">Veriler yüklenirken bir hata oluştu.</p>
            </div>
        );
    }

    const pendingReports = reportsData?.filter((report) => report.status === ReportStatus.Open).slice(0, 5);

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground">Bu bölümde platformun genel istatistiklerini inceleyebilirsiniz.</p>
            </div>
            {/* İstatistik Kartları */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard title="Toplam Kullanıcı" value={statsData?.totalUsers ?? 0} icon={Users} />
                <StatsCard title="Askıdaki Kullanıcılar" value={statsData?.bannedUsers ?? 0} icon={ShieldAlert} />
                <StatsCard title="Bekleyen Raporlar" value={statsData?.pendingReports ?? 0} icon={Library} />
                <StatsCard title="Toplam İnceleme" value={statsData?.totalReviews ?? 0} icon={Star} />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Sol: Rapor Tablosu */}
                <div>
                    <RecentReports reports={pendingReports || []} />
                </div>

                {/* Sağ: Hızlı Arama Modülü */}
                <div>
                    <AdminQuickSearch />
                </div>
            </div>

            {/* Son Aktiviteler */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Son Kullanıcılar */}
                <div>
                    <RecentUsersList users={recentUsersData || []} />
                </div>

                {/* Son İncelemeler */}
                <div>
                    <RecentReviewsList reviews={recentReviewsData || []} />
                </div>
            </div>
        </div>
    );
}
