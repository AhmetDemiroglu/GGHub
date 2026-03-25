"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/core/contexts/sidebar-context";
import { Sidebar, SidebarTrigger } from "@core/components/base/sidebar";
import { Footer } from "@core/components/base/footer";
import { stripLocaleFromPathname, buildLocalizedPathname } from "@/i18n/config";
import { useCurrentLocale } from "@/core/contexts/locale-context";
import logoSrc from "@core/assets/logo.png";

function MobileTopBar() {
    const locale = useCurrentLocale();
    return (
        <div className="flex h-12 items-center justify-between border-b border-border/40 bg-background/95 px-3 backdrop-blur-sm md:hidden">
            <SidebarTrigger />
            <Link href={buildLocalizedPathname("/", locale)} className="flex items-center">
                <Image src={logoSrc} alt="GGHub" width={32} height={20} priority className="h-6 w-auto" />
            </Link>
            <div className="w-9" /> {/* Spacer to center logo */}
        </div>
    );
}

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    const pathname = stripLocaleFromPathname(usePathname() || "/");
    const isMessagesPage = pathname.startsWith("/messages");
    const hideFooter = pathname.startsWith("/messages");

    return (
        <SidebarProvider>
            <div className="relative flex h-screen overflow-hidden">
                {/* Sidebar - persistent on desktop, Sheet overlay on mobile */}
                <Sidebar />

                {/* Main content area */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    {/* Mobile top bar with hamburger + logo (no search - it's in sidebar) */}
                    <MobileTopBar />

                    {/* Page content */}
                    <main className={`flex-1 ${isMessagesPage ? "overflow-hidden" : "overflow-y-auto p-2 md:p-4 2xl:p-6"}`}>
                        {isMessagesPage ? (
                            children
                        ) : (
                            <div className="flex min-h-full flex-col">
                                <div className="flex-1">{children}</div>
                                {!hideFooter ? <Footer /> : null}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
