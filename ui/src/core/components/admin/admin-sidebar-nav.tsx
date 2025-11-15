"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@core/lib/utils";
import { buttonVariants } from "@core/components/ui/button";
import { LayoutDashboard, Users, AlertCircle, ArrowLeftToLine } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@core/components/ui/avatar";
import type { AuthenticatedUser } from "@/models/auth/auth.model";
import Image from "next/image";
import logoSrc2 from "@core/assets/logo2.png";

const getImageUrl = (path: string | null | undefined): string | undefined => {
    if (!path) {
        return undefined;
    }
    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
    return `${API_BASE}${path}`;
};

const navItems = [
    {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Kullanıcılar",
        href: "/users",
        icon: Users,
    },
    {
        title: "Raporlar",
        href: "/reports",
        icon: AlertCircle,
    },
];

export const AdminSidebarNav = ({ user }: { user: AuthenticatedUser | null }) => {
    const pathname = usePathname();

    return (
        <div className="flex h-full flex-col">
            <div className="mb-6 flex flex-col gap-4">
                <Link href="/" className="flex items-center justify-center gap-2.5 w-full cursor-pointer group">
                    <Image src={logoSrc2} alt="GGHub Logo" width={100} className="transition-transform group-hover:scale-105" />
                </Link>

                {user && (
                    <div className="flex flex-row items-center gap-3 rounded-md border p-3">
                        <Avatar className="h-10 w-10 cursor-pointer">
                            <AvatarImage src={getImageUrl(user.profileImageUrl)} alt={user.username} />
                            <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{user.username}</span>
                            <span className="text-xs text-muted-foreground">Yönetici</span>
                        </div>
                    </div>
                )}
            </div>

            <nav className="flex flex-1 flex-col gap-2">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            buttonVariants({
                                variant: pathname === item.href ? "secondary" : "ghost",
                            }),
                            "justify-start gap-2"
                        )}
                    >
                        <item.icon className="h-4 w-4" />
                        {item.title}
                    </Link>
                ))}
            </nav>

            <hr className="my-4" />
            <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "justify-start gap-2")}>
                <ArrowLeftToLine className="h-4 w-4" />
                Ana Siteye Dön
            </Link>
        </div>
    );
};
