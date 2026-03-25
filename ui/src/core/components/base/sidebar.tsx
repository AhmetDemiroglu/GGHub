"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Gamepad2, Home, Library, List, MessageSquare } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@core/components/ui/tooltip";
import { buildLocalizedPathname } from "@/i18n/config";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";

interface SidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
    const t = useI18n();
    const locale = useCurrentLocale();
    const navLinks = [
        { href: "/", label: t("nav.home"), icon: Home },
        { href: "/discover", label: t("nav.discover"), icon: Gamepad2 },
        { href: "/lists", label: t("nav.lists"), icon: Library },
        { href: "/my-lists", label: t("nav.myLists"), icon: List },
        { href: "/messages", label: t("nav.messages"), icon: MessageSquare },
    ];

    return (
        <aside className={`relative flex h-full flex-col bg-background transition-all duration-300 ease-in-out ${isCollapsed ? "w-20" : "w-60"}`}>
            <div className="border-t px-4 pb-0 pt-4">
                <Button size="icon" variant="outline" className="w-full cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
                    {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
                </Button>
            </div>
            <nav className="flex-1 space-y-2 p-4">
                {navLinks.map((link) => {
                    const Icon = link.icon;
                    const href = buildLocalizedPathname(link.href, locale);

                    return isCollapsed ? (
                        <TooltipProvider key={link.href}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link href={href}>
                                        <Button variant="ghost" size="icon" className="w-full cursor-pointer">
                                            <Icon />
                                        </Button>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right">{link.label}</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ) : (
                        <Link href={href} key={link.href}>
                            <Button variant="ghost" className="w-full cursor-pointer justify-start gap-2">
                                <Icon /> {link.label}
                            </Button>
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
