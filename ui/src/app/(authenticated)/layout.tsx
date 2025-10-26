"use client";

import { Header } from "@core/components/base/header";
import { Sidebar } from "@core/components/base/sidebar";
import React, { useState } from "react";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(true);

    return (
        <div className="relative flex min-h-screen flex-col">
            <Header />
            <div className="flex flex-1">
                <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setSidebarCollapsed} />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 2xl:p-10 border-l">{children}</main>
            </div>
        </div>
    );
}
