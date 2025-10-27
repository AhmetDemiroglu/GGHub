"use client";

import { Header } from "@core/components/base/header";
import { Sidebar } from "@core/components/base/sidebar";
import React, { useState } from "react";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(true);

    return (
        <div className="relative flex h-screen flex-col overflow-hidden">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setSidebarCollapsed} />
                <main className="flex-1 overflow-hidden p-2 md:p-4 2xl:p-6 border-l">{children}</main>
            </div>
        </div>
    );
}
