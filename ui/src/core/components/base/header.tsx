"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";
import "dayjs/locale/tr";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, FileText, Gift, LayoutDashboard, List, LogIn, LogOut, Mail, Menu, Settings, Star, User, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { getUnreadMessageCount, getConversations } from "@/api/messages/messages.api";
import { getNotifications, getUnreadNotificationCount, markAllNotificationsAsRead } from "@/api/notifications/notifications.api";
import { getMyProfile } from "@/api/profile/profile.api";
import { ConversationDto } from "@/models/messages/message.model";
import { NotificationDto, NotificationType } from "@/models/notifications/notification.model";
import type { Profile } from "@/models/profile/profile.model";
import logoSrc from "@core/assets/logo.png";
import { useAuth } from "@core/hooks/use-auth";
import { getImageUrl } from "@/core/lib/get-image-url";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/core/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";
import { Separator } from "@/core/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/core/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/core/components/ui/tooltip";
import { CommandSearch } from "@/core/components/other/search/command-search";
import { LanguageSwitcher } from "@/core/components/base/language-switcher";
import { ThemeToggleButton } from "@/core/components/base/theme-toggle-button";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";

dayjs.extend(relativeTime);

export function Header() {
    const t = useI18n();
    const locale = useCurrentLocale();
    const { isAuthenticated, user, logout } = useAuth();
    const queryClient = useQueryClient();
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [messagesOpen, setMessagesOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        dayjs.locale(locale === "tr" ? "tr" : "en");
    }, [locale]);

    const { data: unreadNotifCount } = useQuery<{ count: number }>({
        queryKey: ["unread-notification-count"],
        queryFn: getUnreadNotificationCount,
        enabled: isAuthenticated && !!user,
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    const { data: notifications } = useQuery<NotificationDto[]>({
        queryKey: ["notifications"],
        queryFn: getNotifications,
        enabled: isAuthenticated && !!user && notificationOpen,
        staleTime: 60 * 1000,
    });

    const handleNotificationOpen = (open: boolean) => {
        setNotificationOpen(open);
        if (open && unreadNotifCount && unreadNotifCount.count > 0) {
            markAllNotificationsAsRead()
                .then(() => {
                    queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
                    queryClient.invalidateQueries({ queryKey: ["notifications"] });
                })
                .catch(() => undefined);
        }
    };

    const { data: unreadMsgCount } = useQuery<{ count: number }>({
        queryKey: ["unread-message-count"],
        queryFn: getUnreadMessageCount,
        enabled: isAuthenticated && !!user,
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    const { data: recentMessages } = useQuery<ConversationDto[]>({
        queryKey: ["recent-messages"],
        queryFn: getConversations,
        enabled: isAuthenticated && !!user && messagesOpen,
        staleTime: 30 * 1000,
    });

    const { data: profile } = useQuery<Profile>({
        queryKey: ["my-profile"],
        queryFn: getMyProfile,
        enabled: isAuthenticated && !!user,
        staleTime: 5 * 60 * 1000,
    });

    const notificationIcon = (type: NotificationType) => {
        switch (type) {
            case NotificationType.Follow:
                return <UserPlus className="h-5 w-5 text-blue-500" />;
            case NotificationType.ListFollow:
                return <List className="h-5 w-5 text-green-500" />;
            case NotificationType.Review:
                return <Star className="h-5 w-5 text-yellow-500" />;
            default:
                return <Bell className="h-5 w-5 text-muted-foreground" />;
        }
    };

    const localizeHref = (href: string) => {
        return href.startsWith("/") ? buildLocalizedPathname(href, locale) : href;
    };

    const handleLogout = () => {
        logout();
        toast.info(t("nav.logoutSuccess"));
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
            <div className="flex h-16 items-center gap-4 px-4 md:px-6">
                {/* Left zone: Logo */}
                <Link className="flex shrink-0 items-center" href={buildLocalizedPathname("/", locale)}>
                    <Image src={logoSrc} alt="GGHub logo" width={35} height={22} priority className="h-7 w-auto" />
                </Link>

                {/* Center zone: Search trigger */}
                <div className="hidden flex-1 justify-center md:flex">
                    <CommandSearch />
                </div>

                {/* Right zone */}
                <div className="ml-auto flex items-center gap-1">
                    {isAuthenticated && user ? (
                        <>
                            {/* Desktop actions */}
                            <div className="hidden items-center gap-1 md:flex">
                                <ThemeToggleButton />
                                <LanguageSwitcher />

                                <Separator orientation="vertical" className="mx-1 h-6" />

                                {/* Notifications */}
                                <Popover open={notificationOpen} onOpenChange={handleNotificationOpen}>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="relative h-9 w-9 cursor-pointer">
                                                        <Bell className="h-[1.15rem] w-[1.15rem]" />
                                                        {unreadNotifCount?.count ? (
                                                            <Badge variant="destructive" className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center p-0 text-[10px]">
                                                                {unreadNotifCount.count}
                                                            </Badge>
                                                        ) : null}
                                                    </Button>
                                                </PopoverTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{t("nav.notifications")}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <PopoverContent className="w-80 p-0" align="end">
                                        <div className="border-b p-3">
                                            <h3 className="font-semibold">{t("nav.notificationsTitle")}</h3>
                                        </div>
                                        <div className="max-h-96 overflow-y-auto">
                                            {notifications?.filter((item) => item.type !== NotificationType.Message).length ? (
                                                notifications
                                                    .filter((item) => item.type !== NotificationType.Message)
                                                    .map((notification) => {
                                                        const content = (
                                                            <div className="flex items-start gap-3">
                                                                {notificationIcon(notification.type)}
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-sm">{notification.message}</p>
                                                                    <p className="mt-1 text-xs text-muted-foreground">{dayjs(notification.createdAt).fromNow()}</p>
                                                                </div>
                                                            </div>
                                                        );

                                                        return notification.link ? (
                                                            <Link
                                                                key={notification.id}
                                                                href={localizeHref(notification.link)}
                                                                className={`block cursor-pointer border-b p-3 hover:bg-accent ${!notification.isRead ? "bg-accent/50" : ""}`}
                                                                onClick={() => setNotificationOpen(false)}
                                                            >
                                                                {content}
                                                            </Link>
                                                        ) : (
                                                            <div key={notification.id} className={`border-b p-3 ${!notification.isRead ? "bg-accent/50" : ""}`}>
                                                                {content}
                                                            </div>
                                                        );
                                                    })
                                            ) : (
                                                <div className="p-8 text-center text-sm text-muted-foreground">{t("nav.noNotifications")}</div>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {/* Messages */}
                                <Popover open={messagesOpen} onOpenChange={setMessagesOpen}>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="relative h-9 w-9 cursor-pointer">
                                                        <Mail className="h-[1.15rem] w-[1.15rem]" />
                                                        {unreadMsgCount?.count ? (
                                                            <Badge variant="destructive" className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center p-0 text-[10px]">
                                                                {unreadMsgCount.count}
                                                            </Badge>
                                                        ) : null}
                                                    </Button>
                                                </PopoverTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{t("nav.messages")}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <PopoverContent className="w-80 p-0" align="end">
                                        <div className="border-b p-3">
                                            <h3 className="font-semibold">{t("nav.messagesTitle")}</h3>
                                        </div>
                                        <div className="max-h-96 overflow-y-auto">
                                            {recentMessages?.length ? (
                                                recentMessages.slice(0, 5).map((conversation) => (
                                                    <Link
                                                        key={conversation.partnerId}
                                                        href={buildLocalizedPathname(`/messages/${conversation.partnerUsername}`, locale)}
                                                        className="block cursor-pointer border-b p-3 hover:bg-accent"
                                                        onClick={() => setMessagesOpen(false)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-10 w-10 shrink-0">
                                                                <AvatarImage src={getImageUrl(conversation.partnerProfileImageUrl)} alt={conversation.partnerUsername} />
                                                                <AvatarFallback>{conversation.partnerUsername.charAt(0).toUpperCase()}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="mb-1 flex items-center justify-between">
                                                                    <p className="truncate text-sm font-semibold">{conversation.partnerUsername}</p>
                                                                    {conversation.unreadCount > 0 ? (
                                                                        <Badge variant="default" className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center p-0 text-xs">
                                                                            {conversation.unreadCount}
                                                                        </Badge>
                                                                    ) : null}
                                                                </div>
                                                                <p className="truncate text-xs text-muted-foreground">{conversation.lastMessage}</p>
                                                                <p className="mt-1 text-xs text-muted-foreground">{dayjs(conversation.lastMessageSentAt).fromNow()}</p>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                ))
                                            ) : (
                                                <div className="p-8 text-center text-sm text-muted-foreground">{t("nav.noMessages")}</div>
                                            )}
                                        </div>
                                        <div className="border-t p-2">
                                            <Button variant="ghost" className="w-full text-sm" asChild>
                                                <Link href={buildLocalizedPathname("/messages", locale)} onClick={() => setMessagesOpen(false)}>
                                                    {t("nav.viewAllMessages")}
                                                </Link>
                                            </Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {/* Admin */}
                                {user.role === "Admin" ? (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="relative h-9 w-9 cursor-pointer" asChild>
                                                    <Link href={buildLocalizedPathname("/dashboard", locale)}>
                                                        <LayoutDashboard className="h-[1.15rem] w-[1.15rem]" />
                                                    </Link>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{t("nav.adminPanel")}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ) : null}

                                {/* Profile dropdown */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="ml-1 flex cursor-pointer items-center gap-2.5 rounded-full border border-border/50 bg-muted/50 py-1 pl-3 pr-1 transition-colors hover:bg-accent">
                                            <div className="hidden text-right sm:block">
                                                {profile?.firstName || profile?.lastName ? (
                                                    <p className="text-sm font-medium leading-tight">{[profile.firstName, profile.lastName].filter(Boolean).join(" ")}</p>
                                                ) : null}
                                                <p className="text-xs leading-tight text-muted-foreground">@{user.username}</p>
                                            </div>
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={getImageUrl(profile?.profileImageUrl)} alt={user.username} />
                                                <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56" align="end" forceMount>
                                        <DropdownMenuItem asChild>
                                            <Link href={buildLocalizedPathname(`/profiles/${user.username}`, locale)} className="cursor-pointer font-semibold">
                                                <User className="mr-2 h-4 w-4" />
                                                {user.username}
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <Link href={buildLocalizedPathname("/profile", locale)} className="flex cursor-pointer items-center">
                                                <Settings className="mr-2 h-4 w-4" />
                                                <span>{t("nav.profileSettings")}</span>
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href={buildLocalizedPathname("/wishlist", locale)} className="flex cursor-pointer items-center">
                                                <Gift className="mr-2 h-4 w-4" />
                                                <span>{t("nav.wishlist")}</span>
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href={buildLocalizedPathname("/my-reports", locale)} className="flex cursor-pointer items-center">
                                                <FileText className="mr-2 h-4 w-4" />
                                                <span>{t("nav.myReports")}</span>
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                                            <LogOut className="mr-2 h-4 w-4" />
                                            <span>{t("nav.logout")}</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Mobile actions */}
                            <div className="flex items-center gap-1 md:hidden">
                                <CommandSearch />
                                <Button variant="ghost" size="icon" className="relative h-9 w-9 cursor-pointer" onClick={() => setMobileMenuOpen(true)}>
                                    <Menu className="h-5 w-5" />
                                    {(unreadNotifCount?.count || unreadMsgCount?.count) ? (
                                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                                    ) : null}
                                </Button>
                            </div>

                            {/* Mobile Sheet menu */}
                            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                                <SheetContent side="right" className="w-72 p-0">
                                    <SheetTitle className="sr-only">Menu</SheetTitle>
                                    <SheetDescription className="sr-only">Navigation menu</SheetDescription>
                                    <div className="flex h-full flex-col">
                                        {/* Profile section */}
                                        <div className="border-b p-4 pt-10">
                                            <Link
                                                href={buildLocalizedPathname(`/profiles/${user.username}`, locale)}
                                                className="flex items-center gap-3"
                                                onClick={() => setMobileMenuOpen(false)}
                                            >
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={getImageUrl(profile?.profileImageUrl)} alt={user.username} />
                                                    <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    {profile?.firstName || profile?.lastName ? (
                                                        <p className="truncate text-sm font-medium">{[profile.firstName, profile.lastName].filter(Boolean).join(" ")}</p>
                                                    ) : null}
                                                    <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                                                </div>
                                            </Link>
                                        </div>

                                        {/* Navigation */}
                                        <nav className="flex-1 space-y-1 p-2">
                                            <Link
                                                href={buildLocalizedPathname("/profile", locale)}
                                                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                                                onClick={() => setMobileMenuOpen(false)}
                                            >
                                                <Settings className="h-4 w-4 text-muted-foreground" />
                                                {t("nav.profileSettings")}
                                            </Link>
                                            <Link
                                                href={buildLocalizedPathname("/wishlist", locale)}
                                                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                                                onClick={() => setMobileMenuOpen(false)}
                                            >
                                                <Gift className="h-4 w-4 text-muted-foreground" />
                                                {t("nav.wishlist")}
                                            </Link>
                                            <Link
                                                href={buildLocalizedPathname("/my-reports", locale)}
                                                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                                                onClick={() => setMobileMenuOpen(false)}
                                            >
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                {t("nav.myReports")}
                                            </Link>

                                            <Separator className="my-2" />

                                            <button
                                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                                                onClick={() => {
                                                    handleNotificationOpen(true);
                                                    setMobileMenuOpen(false);
                                                }}
                                            >
                                                <Bell className="h-4 w-4 text-muted-foreground" />
                                                {t("nav.notifications")}
                                                {unreadNotifCount?.count ? (
                                                    <Badge variant="destructive" className="ml-auto flex h-5 min-w-5 items-center justify-center p-0 text-xs">
                                                        {unreadNotifCount.count}
                                                    </Badge>
                                                ) : null}
                                            </button>
                                            <Link
                                                href={buildLocalizedPathname("/messages", locale)}
                                                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                                                onClick={() => setMobileMenuOpen(false)}
                                            >
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                {t("nav.messages")}
                                                {unreadMsgCount?.count ? (
                                                    <Badge variant="destructive" className="ml-auto flex h-5 min-w-5 items-center justify-center p-0 text-xs">
                                                        {unreadMsgCount.count}
                                                    </Badge>
                                                ) : null}
                                            </Link>

                                            {user.role === "Admin" ? (
                                                <Link
                                                    href={buildLocalizedPathname("/dashboard", locale)}
                                                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                                                    onClick={() => setMobileMenuOpen(false)}
                                                >
                                                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                                                    {t("nav.adminPanel")}
                                                </Link>
                                            ) : null}
                                        </nav>

                                        {/* Bottom controls */}
                                        <div className="border-t p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">{locale === "tr" ? "Tema" : "Theme"}</span>
                                                <ThemeToggleButton />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">{t("nav.language")}</span>
                                                <LanguageSwitcher />
                                            </div>

                                            <Separator />

                                            <button
                                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
                                                onClick={() => {
                                                    handleLogout();
                                                    setMobileMenuOpen(false);
                                                }}
                                            >
                                                <LogOut className="h-4 w-4" />
                                                {t("nav.logout")}
                                            </button>
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </>
                    ) : (
                        <>
                            {/* Unauthenticated: mobile search + login/register */}
                            <div className="flex items-center gap-1 md:hidden">
                                <CommandSearch />
                            </div>
                            <div className="hidden items-center gap-1 md:flex">
                                <ThemeToggleButton />
                                <LanguageSwitcher />
                                <Separator orientation="vertical" className="mx-1 h-6" />
                                <Button
                                    variant="ghost"
                                    onClick={() =>
                                        (window.location.href = `${buildLocalizedPathname("/login", locale)}?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`)
                                    }
                                    className="cursor-pointer"
                                >
                                    <LogIn className="mr-1 h-4 w-4" />
                                    {t("nav.login")}
                                </Button>
                                <Button
                                    onClick={() =>
                                        (window.location.href = `${buildLocalizedPathname("/register", locale)}?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`)
                                    }
                                    className="cursor-pointer"
                                >
                                    <UserPlus className="mr-1 h-4 w-4" />
                                    {t("nav.register")}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
