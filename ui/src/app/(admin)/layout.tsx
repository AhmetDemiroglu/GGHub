"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@core/hooks/use-auth";
import { AdminSidebarNav } from "@/core/components/admin/admin-sidebar-nav";
import { Menu } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/core/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import logoSrc2 from "@core/assets/logo2.png";
import Link from "next/link";
import Image from "next/image";

const FullPageLoader = () => (
    <div className="flex h-screen w-full items-center justify-center">
        <p>Yükleniyor...</p>
    </div>
);

export default function AdminLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { user, isAuthenticated, isLoading } = useAuth();
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    useEffect(() => {
        if (isLoading) return;
        if (!isAuthenticated) {
            router.replace("/login");
            return;
        }
        if (user?.role !== "Admin") {
            router.replace("/discover");
            return;
        }
    }, [isLoading, isAuthenticated, user, router]);

    if (isLoading || !isAuthenticated || user?.role !== "Admin") {
        return <FullPageLoader />;
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden">
            <header className="sticky top-0 z-40 w-full border-b bg-background px-4 md:hidden">
                <div className="flex h-16 items-center justify-between">
                    <Link href="/dashboard" className="flex items-center" onClick={() => setIsSheetOpen(false)}>
                        <Image src={logoSrc2} alt="GGHub Logo" width={80} className="transition-transform group-hover:scale-110" />
                    </Link>

                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Menüyü aç</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[240px] p-0">
                            <VisuallyHidden>
                                <SheetTitle>Ana Menü</SheetTitle>
                            </VisuallyHidden>
                            <div className="h-full px-6 py-6 lg:py-8">
                                <AdminSidebarNav user={user} onLinkClick={() => setIsSheetOpen(false)} />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <aside className="hidden w-[240px] flex-col border-r bg-background md:flex">
                    <div className="flex-1 overflow-y-auto">
                        <div className="h-full px-6 py-6 lg:py-8">
                            <AdminSidebarNav user={user} />
                        </div>
                    </div>
                </aside>
                <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
        </div>
    );
}
