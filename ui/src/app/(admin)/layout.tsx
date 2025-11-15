"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@core/hooks/use-auth";
import { AdminSidebarNav } from "@/core/components/admin/admin-sidebar-nav";

const FullPageLoader = () => (
    <div className="flex h-screen w-full items-center justify-center">
        <p>Yükleniyor...</p>
    </div>
);

export default function AdminLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { user, isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (isLoading) return;
        if (!isAuthenticated) {
            router.replace("/login");
            return;
        }
        if (user?.role !== "Admin") {
            router.replace("/");
            return;
        }
    }, [isLoading, isAuthenticated, user, router]);

    if (isLoading || !isAuthenticated || user?.role !== "Admin") {
        return <FullPageLoader />;
    }

    return (
        <div className="flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 h-screen">
            <aside className="fixed top-0 z-30 h-screen w-full shrink-0 overflow-y-auto border-r md:sticky md:block">
                <div className="h-full p-4 lg:p-6">
                    <AdminSidebarNav user={user} />
                </div>
            </aside>

            <main className="relative py-6 lg:py-8 pr-9 overflow-y-auto h-screen">{children}</main>
        </div>
    );
}
