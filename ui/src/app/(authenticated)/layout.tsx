"use client";

import { Header } from "@core/components/base/header";
import { Sidebar } from "@core/components/base/sidebar";
import { Footer } from "@core/components/base/footer";
import React, { useState } from "react";
import { usePathname } from "next/navigation";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(true);
    const pathname = usePathname();
    const isMessagesPage = pathname?.startsWith("/messages");
    const hideFooter = pathname?.startsWith("/messages");

    return (
        <div className="relative flex h-screen flex-col overflow-hidden">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setSidebarCollapsed} />
                <main className={`flex-1 p-2 md:p-4 2xl:p-6 border-l ${isMessagesPage ? "overflow-hidden" : "overflow-y-auto"}`}>
                    {isMessagesPage ? (
                        children
                    ) : (
                        <div className="min-h-full flex flex-col">
                            <div className="flex-1">{children}</div>
                            {!hideFooter && <Footer />}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
