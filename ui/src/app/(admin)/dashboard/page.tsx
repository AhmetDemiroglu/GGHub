"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, getReports } from "@/api/admin/admin.api";
import type { DashboardStats, AdminReport } from "@/models/admin/admin.model";
import { ReportStatus } from "@/models/admin/admin.model";
import { Users, ShieldAlert, Library, Star } from "lucide-react";
import { StatsCard } from "@/core/components/admin/stats-card";
import { RecentReports } from "@/core/components/admin/recent-reports";

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

    if (isLoadingStats || isLoadingReports) {
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
                <p className="text-muted-foreground">Platformun genel istatistiklerine hoş geldiniz.</p>
            </div>
            {/* İstatistik Kartları */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard title="Toplam Kullanıcı" value={statsData?.totalUsers ?? 0} icon={Users} />
                <StatsCard title="Askıdaki Kullanıcılar" value={statsData?.bannedUsers ?? 0} icon={ShieldAlert} />
                <StatsCard title="Bekleyen Raporlar" value={statsData?.pendingReports ?? 0} icon={Library} />
                <StatsCard title="Toplam İnceleme" value={statsData?.totalReviews ?? 0} icon={Star} />
            </div>
            {/* Rapor Tablosu */}
            <div>
                <RecentReports reports={pendingReports || []} />
            </div>
        </div>
    );
}
