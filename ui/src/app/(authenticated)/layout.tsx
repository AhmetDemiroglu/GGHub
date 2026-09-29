"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/core/contexts/sidebar-context";
import { Sidebar } from "@core/components/base/sidebar";
import { AppTopbar, APP_SCROLL_ID } from "@core/components/base/app-topbar";
import { Footer } from "@core/components/base/footer";
import { stripLocaleFromPathname } from "@/i18n/config";

/*
 * Kabuk: ust cubuk tum genisligi kaplar ve icerigin USTUNDE durur (absolute), kenar cubugu
 * ile icerik onun altindan baslar (padding-top: --topbar-h). Kaydirma kabi pencere degil
 * <main>; ust cubuk kopma efektini bu kabin scrollTop'undan okur (APP_SCROLL_ID).
 */
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const pathname = stripLocaleFromPathname(usePathname() || "/");
    const isMessagesPage = pathname.startsWith("/messages");

    return (
        <SidebarProvider>
            <div className="relative flex h-screen overflow-hidden">
                {/* Sidebar - persistent on desktop, Sheet overlay on mobile */}
                <Sidebar />

                {/* Main content area */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    <main
                        id={APP_SCROLL_ID}
                        className={
                            isMessagesPage
                                ? "flex-1 overflow-hidden pt-(--topbar-h)"
                                : "flex-1 overflow-y-auto p-2 pt-[calc(var(--topbar-h)+0.5rem)] md:p-4 md:pt-[calc(var(--topbar-h)+1rem)] 2xl:p-6 2xl:pt-[calc(var(--topbar-h)+1.5rem)]"
                        }
                    >
                        {isMessagesPage ? (
                            children
                        ) : (
                            <div className="flex min-h-full flex-col">
                                <div className="flex-1">{children}</div>
                                <Footer />
                            </div>
                        )}
                    </main>
                </div>

                <AppTopbar />
            </div>
        </SidebarProvider>
    );
}
