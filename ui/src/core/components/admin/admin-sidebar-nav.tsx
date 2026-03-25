"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertCircle, ArrowLeftToLine, LayoutDashboard, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@core/components/ui/avatar";
import { buttonVariants } from "@core/components/ui/button";
import { cn } from "@core/lib/utils";
import { getImageUrl } from "@/core/lib/get-image-url";
import type { AuthenticatedUser } from "@/models/auth/auth.model";
import { buildLocalizedPathname, stripLocaleFromPathname } from "@/i18n/config";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import logoSrc2 from "@core/assets/logo2.png";

interface AdminSidebarNavProps {
    user: AuthenticatedUser | null;
    onLinkClick?: () => void;
}

export const AdminSidebarNav = ({ user, onLinkClick }: AdminSidebarNavProps) => {
    const t = useI18n();
    const locale = useCurrentLocale();
    const pathname = stripLocaleFromPathname(usePathname() || "/");
    const navItems = [
        { title: t("admin.dashboard"), href: "/dashboard", icon: LayoutDashboard },
        { title: t("admin.users"), href: "/users", icon: Users },
        { title: t("admin.reports"), href: "/reports", icon: AlertCircle },
    ];

    return (
        <div className="flex h-full flex-col">
            <div className="mb-6 flex flex-col gap-6">
                <Link href={buildLocalizedPathname("/", locale)} className="group flex w-full items-center justify-center gap-2.5" onClick={onLinkClick}>
                    <Image src={logoSrc2} alt="GGHub logo" width={120} className="transition-transform group-hover:scale-110" />
                </Link>
                {user ? (
                    <div className="flex flex-row items-center gap-3 rounded-md border p-3">
                        <Avatar className="h-10 w-10 cursor-pointer">
                            <AvatarImage src={getImageUrl(user.profileImageUrl)} alt={user.username} />
                            <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>

                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{user.username}</span>
                            <span className="text-xs text-muted-foreground">Admin</span>
                        </div>
                    </div>
                ) : null}
            </div>

            <nav className="flex flex-1 flex-col gap-2">
                {navItems.map((item) => {
                    const href = buildLocalizedPathname(item.href, locale);
                    const isActive = pathname === item.href;

                    return (
                        <Link key={item.href} href={href} className={cn(buttonVariants({ variant: isActive ? "secondary" : "ghost" }), "justify-start gap-2")} onClick={onLinkClick}>
                            <item.icon className="h-4 w-4" /> {item.title}
                        </Link>
                    );
                })}
            </nav>

            <hr className="my-4" />
            <Link href={buildLocalizedPathname("/", locale)} className={cn(buttonVariants({ variant: "outline" }), "justify-start gap-2")} onClick={onLinkClick}>
                <ArrowLeftToLine className="h-4 w-4" />
                {t("admin.backToSite")}
            </Link>
        </div>
    );
};
