"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";
import "dayjs/locale/tr";
import { useQueryClient } from "@tanstack/react-query";
import {
    AtSign,
    Bell,
    Crown,
    FileText,
    Gamepad2,
    Gift,
    Home,
    LayoutDashboard,
    Library,
    List,
    LogIn,
    LogOut,
    Heart,
    Mail,
    Menu,
    MessageSquare,
    Reply,
    PanelLeftClose,
    PanelLeftOpen,
    Search,
    Settings,
    Star,
    ThumbsUp,
    User,
    UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import logoSrc from "@core/assets/logo.png";
import { useAuth } from "@core/hooks/use-auth";
import { useSidebar } from "@/core/contexts/sidebar-context";
import { useMediaQuery } from "@/core/hooks/use-media-query";
import { useNavigationData, useNotifications, useRecentMessages } from "@/core/hooks/use-navigation-data";
import { getImageUrl } from "@/core/lib/get-image-url";
import { displayName } from "@/core/lib/display-name";
import { cn } from "@/core/lib/utils";
import { markAllNotificationsAsRead, markNotificationAsRead } from "@/api/notifications/notifications.api";
import { NotificationType, type NotificationDto } from "@/models/notifications/notification.model";
import { UserLink } from "@/core/components/base/user-link";

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/core/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/core/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";
import { Separator } from "@/core/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/core/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/core/components/ui/tooltip";
import { CommandSearch } from "@/core/components/other/search/command-search";
import { LanguageSwitcher } from "@/core/components/base/language-switcher";
import { ThemeToggleButton } from "@/core/components/base/theme-toggle-button";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { useLocalizedHref } from "@/core/hooks/use-localized-href";

dayjs.extend(relativeTime);

// ─── Notification icon map ───────────────────────────────────────────────────
type IconComponent = React.ComponentType<{ className?: string }>;

/** Tur basina ikon + renk. Avatar rozetinde ve aktoru olmayan bildirimlerde ayni kaynak kullanilir. */
const notificationIconMeta = (type: NotificationType): { Icon: IconComponent; color: string } => {
    switch (type) {
        case NotificationType.Follow:
            return { Icon: UserPlus, color: "text-blue-500" };
        case NotificationType.ListFollow:
            return { Icon: List, color: "text-green-500" };
        case NotificationType.Review:
            return { Icon: Star, color: "text-yellow-500" };
        case NotificationType.ListComment:
            return { Icon: MessageSquare, color: "text-sky-500" };
        case NotificationType.CommentReply:
            return { Icon: Reply, color: "text-teal-500" };
        case NotificationType.CommentLike:
            return { Icon: Heart, color: "text-red-500" };
        case NotificationType.ListRating:
            return { Icon: Star, color: "text-amber-500" };
        case NotificationType.ReviewComment:
            return { Icon: MessageSquare, color: "text-indigo-500" };
        case NotificationType.ReviewCommentReply:
            return { Icon: Reply, color: "text-violet-500" };
        case NotificationType.ReviewCommentLike:
            return { Icon: ThumbsUp, color: "text-pink-500" };
        case NotificationType.Mention:
            return { Icon: AtSign, color: "text-orange-500" };
        default:
            return { Icon: Bell, color: "text-muted-foreground" };
    }
};

/**
 * Bildirim metni. Backend mesaji okuyucunun dilinde TAM cumle uretir ve basina aktorun
 * gorunen adini koyar. Ad basta ise kalin + link yapilir, degilse mesaj duz basilir.
 * Eslesmezse sessizce duz metne duser; asla patlamaz.
 */
function NotificationMessage({ notification, onNavigate }: { notification: NotificationDto; onNavigate?: () => void }) {
    const actor = notification.actor;
    const name = actor ? displayName(actor) : "";

    if (!actor || !name || !notification.message.startsWith(name)) {
        return <p className="text-sm">{notification.message}</p>;
    }

    return (
        <p className="text-sm">
            {/* z-20: satiri kaplayan link'in USTUNDE kalip kendi tiklamasini almali. */}
            <UserLink user={actor} variant="name" className="relative z-20 font-semibold hover:underline" onNavigate={onNavigate} />
            {notification.message.slice(name.length)}
        </p>
    );
}

// ─── Sidebar Trigger (hamburger button for mobile) ───────────────────────────
export function SidebarTrigger() {
    const { setMobileOpen } = useSidebar();
    const { unreadNotifCount, unreadMsgCount } = useNavigationData();
    const hasUnread = !!(unreadNotifCount?.count || unreadMsgCount?.count);

    return (
        <Button variant="ghost" size="icon" className="relative h-9 w-9 cursor-pointer md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
            {hasUnread && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />}
        </Button>
    );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
export function Sidebar() {
    const { isCollapsed, isMobileOpen, setMobileOpen } = useSidebar();
    const isMobile = useMediaQuery("(max-width: 767px)");

    const sidebarContent = <SidebarInner isMobile={isMobile} />;

    if (isMobile) {
        return (
            <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
                <SheetContent side="left" className="w-72 p-0">
                    <SheetTitle className="sr-only">Menu</SheetTitle>
                    <SheetDescription className="sr-only">Navigation menu</SheetDescription>
                    {sidebarContent}
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <aside
            data-collapsed={isCollapsed}
            className={`relative flex h-full shrink-0 flex-col border-r border-border/40 bg-background/95 backdrop-blur-sm transition-[width] duration-300 ease-in-out ${isCollapsed ? "w-[72px]" : "w-60"} overflow-hidden`}
        >
            {sidebarContent}
        </aside>
    );
}

// ─── Sidebar Inner Content ────────────────────────────────────────────────────
function SidebarInner({ isMobile }: { isMobile: boolean }) {
    const t = useI18n();
    const locale = useCurrentLocale();
    const pathname = usePathname();
    const localizeHref = useLocalizedHref();
    const { isCollapsed, toggleCollapsed, setMobileOpen } = useSidebar();
    const { isAuthenticated, user, logout } = useAuth();
    const { unreadNotifCount, unreadMsgCount, profile } = useNavigationData();
    const queryClient = useQueryClient();

    const [notificationOpen, setNotificationOpen] = useState(false);
    const [messagesOpen, setMessagesOpen] = useState(false);
    const [logoutOpen, setLogoutOpen] = useState(false);

    const { data: notifications } = useNotifications(notificationOpen);
    const { data: recentMessages } = useRecentMessages(messagesOpen);

    // Collapsed state is always false on mobile (always expanded)
    const collapsed = isMobile ? false : isCollapsed;

    useEffect(() => {
        dayjs.locale(locale === "tr" ? "tr" : "en");
    }, [locale]);

    const handleLogout = () => {
        logout();
        toast.info(t("nav.logoutSuccess"));
        if (isMobile) setMobileOpen(false);
    };

    // Popover acilinca hepsini okundu isaretle. BILEREK boyle: X/Instagram deseni.
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

    /** Tek bildirime tiklanınca da okundu isaretle (best-effort; hata akisi bozmaz). */
    const handleNotificationClick = (notification: NotificationDto) => {
        markNotificationAsRead(notification.id)
            .then(() => {
                queryClient.invalidateQueries({ queryKey: ["notifications"] });
                queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
            })
            .catch(() => undefined);
    };

    const isActive = (href: string) => {
        const strippedPathname = pathname?.replace(/^\/(tr|en-US)/, "") || "/";
        const normalizedPathname = strippedPathname === "" ? "/" : strippedPathname;
        if (href === "/") return normalizedPathname === "/";
        return normalizedPathname.startsWith(href);
    };

    const onLinkClick = () => {
        if (isMobile) setMobileOpen(false);
    };

    // ─── Nav items ────────────────────────────────────────────────────────────
    const mainNavItems = [
        { href: "/", label: t("nav.home"), icon: Home },
        { href: "/discover", label: t("nav.discover"), icon: Gamepad2 },
        ...(isAuthenticated
            ? [
                  { href: "/lists", label: t("nav.lists"), icon: Library },
                  { href: "/my-lists", label: t("nav.myLists"), icon: List },
              ]
            : []),
    ];

    return (
        <div className="flex h-full flex-col" data-collapsed={collapsed}>
            {/* ── Header: Logo ────────────────────────────────────────────── */}
            <div className={`flex items-center border-b border-border/40 ${collapsed ? "justify-center px-2 py-3" : "px-4 py-3"}`}>
                <Link href={localizeHref("/")} className="flex shrink-0 items-center" onClick={onLinkClick}>
                    <Image src={logoSrc} alt="GGHub" width={35} height={22} priority className={collapsed ? "h-5 w-auto" : "h-7 w-auto"} />
                </Link>
            </div>

            {/* ── Search ──────────────────────────────────────────────────── */}
            <div className="border-b border-border/40 px-2 py-1">
                <CommandSearch variant="sidebar" collapsed={collapsed} />
            </div>

            {/* ── Main Navigation ────────────────────────────────────────── */}
            <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
                {mainNavItems.map((item) => (
                    <NavItem key={item.href} href={localizeHref(item.href)} label={item.label} icon={item.icon} active={isActive(item.href)} collapsed={collapsed} onClick={onLinkClick} />
                ))}

                {/* Messages with badge (mobile only - desktop uses the popover below) */}
                {isAuthenticated && isMobile && (
                    <NavItem
                        href={localizeHref("/messages")}
                        label={t("nav.messages")}
                        icon={MessageSquare}
                        active={isActive("/messages")}
                        collapsed={collapsed}
                        badge={unreadMsgCount?.count}
                        onClick={onLinkClick}
                    />
                )}

                {/* ── Notifications ──────────────────────────────────────── */}
                {isAuthenticated && (
                    <>
                        <div className="sidebar-section py-1">
                            <Separator className="my-1" />
                        </div>

                        {/* Notifications popover */}
                        <Popover open={notificationOpen} onOpenChange={handleNotificationOpen}>
                            <PopoverTrigger asChild>
                                <NavButton label={t("nav.notifications")} icon={Bell} collapsed={collapsed} badge={unreadNotifCount?.count} />
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0" side={isMobile ? "bottom" : "right"} align="start">
                                <div className="border-b p-3">
                                    <h3 className="font-semibold">{t("nav.notificationsTitle")}</h3>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications?.filter((n) => n.type !== NotificationType.Message).length ? (
                                        notifications
                                            .filter((n) => n.type !== NotificationType.Message)
                                            .map((notification) => {
                                                const { Icon, color } = notificationIconMeta(notification.type);
                                                const closePopover = () => {
                                                    setNotificationOpen(false);
                                                    onLinkClick();
                                                };

                                                return (
                                                    // Satiri kaplayan link deseni: profil linkini ic ice <a> yapmadan
                                                    // hem satirin tamami hem de avatar/ad ayri ayri tiklanabilir kalir.
                                                    <div
                                                        key={notification.id}
                                                        className={`relative border-b p-3 hover:bg-accent ${!notification.isRead ? "bg-accent/50" : ""}`}
                                                    >
                                                        {notification.link && (
                                                            <Link
                                                                href={localizeHref(notification.link)}
                                                                className="absolute inset-0 z-10 cursor-pointer"
                                                                aria-label={notification.message}
                                                                onClick={() => {
                                                                    handleNotificationClick(notification);
                                                                    closePopover();
                                                                }}
                                                            />
                                                        )}
                                                        <div className="flex items-start gap-3">
                                                            {notification.actor ? (
                                                                <div className="relative z-20 shrink-0">
                                                                    <UserLink
                                                                        user={notification.actor}
                                                                        variant="avatar"
                                                                        avatarClassName="h-9 w-9"
                                                                        onNavigate={closePopover}
                                                                    />
                                                                    {/* Dekoratif rozet: pointer-events-none olmasa avatarin kosesinde olu tiklama alani olurdu. */}
                                                                    <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background ring-1 ring-border">
                                                                        <Icon className={cn("h-2.5 w-2.5", color)} />
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                // Eski satirlar / silinmis hesaplar: aktor yok, genel ikona duseriz.
                                                                <Icon className={cn("h-5 w-5 shrink-0", color)} />
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <NotificationMessage notification={notification} onNavigate={closePopover} />
                                                                <p className="mt-1 text-xs text-muted-foreground">{dayjs(notification.createdAt).fromNow()}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                    ) : (
                                        <div className="p-8 text-center text-sm text-muted-foreground">{t("nav.noNotifications")}</div>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Messages popover (desktop sidebar) */}
                        {!isMobile && (
                            <Popover open={messagesOpen} onOpenChange={setMessagesOpen}>
                                <PopoverTrigger asChild>
                                    <NavButton label={t("nav.messages")} icon={Mail} collapsed={collapsed} badge={unreadMsgCount?.count} />
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0" side="right" align="start">
                                    <div className="border-b p-3">
                                        <h3 className="font-semibold">{t("nav.messagesTitle")}</h3>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {recentMessages?.length ? (
                                            recentMessages.slice(0, 5).map((conversation) => {
                                                // ConversationDto ad/soyad tasimiyor; displayName() username'e duser.
                                                // Gercek ad + isProfileAccessible icin tam UserDto; eski yanitlarda duz alanlara duseriz.
                                                const partner = conversation.partner ?? {
                                                    username: conversation.partnerUsername,
                                                    profileImageUrl: conversation.partnerProfileImageUrl,
                                                };
                                                const closePopover = () => setMessagesOpen(false);

                                                return (
                                                    // Satiri kaplayan link: thread'e gider; avatar/ad z-20 ile ustte kalip profile gider.
                                                    <div key={conversation.partnerId} className="relative border-b p-3 hover:bg-accent">
                                                        <Link
                                                            href={localizeHref(`/messages/${conversation.partnerUsername}`)}
                                                            className="absolute inset-0 z-10 cursor-pointer"
                                                            aria-label={t("nav.messagesTitle")}
                                                            onClick={closePopover}
                                                        />
                                                        <div className="flex items-center gap-3">
                                                            <UserLink
                                                                user={partner}
                                                                variant="avatar"
                                                                className="relative z-20 shrink-0"
                                                                avatarClassName="h-9 w-9"
                                                                avatarFallback={conversation.partnerUsername.charAt(0).toUpperCase()}
                                                                onNavigate={closePopover}
                                                            />
                                                            <div className="min-w-0 flex-1">
                                                                <div className="mb-0.5 flex items-center justify-between">
                                                                    <UserLink
                                                                        user={partner}
                                                                        variant="name"
                                                                        className="relative z-20 truncate text-sm font-semibold hover:underline"
                                                                        onNavigate={closePopover}
                                                                    />
                                                                    {conversation.unreadCount > 0 && (
                                                                        <Badge variant="default" className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center p-0 text-xs">
                                                                            {conversation.unreadCount}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <p className="truncate text-xs text-muted-foreground">{conversation.lastMessage}</p>
                                                                <p className="mt-0.5 text-xs text-muted-foreground">{dayjs(conversation.lastMessageSentAt).fromNow()}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="p-8 text-center text-sm text-muted-foreground">{t("nav.noMessages")}</div>
                                        )}
                                    </div>
                                    <div className="border-t p-2">
                                        <Button variant="ghost" className="w-full text-sm" asChild>
                                            <Link href={localizeHref("/messages")} onClick={() => setMessagesOpen(false)}>
                                                {t("nav.viewAllMessages")}
                                            </Link>
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )}

                        {/* Admin Panel */}
                        {user?.role === "Admin" && (
                            <>
                                <div className="sidebar-section py-1">
                                    <Separator className="my-1" />
                                </div>
                                <NavItem
                                    href={localizeHref("/dashboard")}
                                    label={t("nav.adminPanel")}
                                    icon={LayoutDashboard}
                                    active={isActive("/dashboard")}
                                    collapsed={collapsed}
                                    onClick={onLinkClick}
                                />
                            </>
                        )}
                    </>
                )}
            </nav>

            {/* ── Bottom Section ──────────────────────────────────────────── */}
            <div className="mt-auto border-t border-border/40">
                {/* Collapse toggle (desktop only) */}
                {!isMobile && (
                    <div className={`border-b border-border/40 ${collapsed ? "px-2 py-2" : "px-3 py-2"}`}>
                        <button
                            onClick={toggleCollapsed}
                            className={`flex w-full cursor-pointer items-center rounded-lg px-2 py-2 text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground ${collapsed ? "justify-center" : "gap-3"}`}
                        >
                            {collapsed ? <PanelLeftOpen className="h-[1.15rem] w-[1.15rem]" /> : <PanelLeftClose className="h-[1.15rem] w-[1.15rem]" />}
                            {!collapsed && <span className="sidebar-label text-sm font-medium">{locale === "tr" ? "Daralt" : "Collapse"}</span>}
                        </button>
                    </div>
                )}

                {/* Theme & Language Controls - separated to prevent interference */}
                <div className={`flex items-center border-b border-border/40 ${collapsed ? "flex-col gap-3 px-2 py-3" : "justify-between px-4 py-3"}`}>
                    <div className="shrink-0">
                        <ThemeToggleButton />
                    </div>
                    <div className="shrink-0">
                        <LanguageSwitcher vertical={collapsed} />
                    </div>
                </div>

                {/* User Card / Login */}
                {isAuthenticated && user ? (
                    <div className={`${collapsed ? "px-2 py-3" : "px-3 py-3"}`}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-accent ${collapsed ? "justify-center" : ""}`}
                                >
                                    <Avatar className={collapsed ? "h-9 w-9" : "h-8 w-8"}>
                                        <AvatarImage src={getImageUrl(profile?.profileImageUrl)} alt={user.username} />
                                        <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    {!collapsed && (
                                        <div className="sidebar-label min-w-0 text-left">
                                            {profile?.firstName || profile?.lastName ? (
                                                <p className="truncate text-sm font-medium leading-tight">{[profile.firstName, profile.lastName].filter(Boolean).join(" ")}</p>
                                            ) : null}
                                            <p className="truncate text-xs leading-tight text-muted-foreground">@{user.username}</p>
                                        </div>
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" side={isMobile ? "top" : "right"} align={isMobile ? "end" : "start"}>
                                <DropdownMenuItem asChild>
                                    <Link href={localizeHref(`/profiles/${user.username}`)} className="cursor-pointer font-semibold" onClick={onLinkClick}>
                                        <User className="mr-2 h-4 w-4" />
                                        {user.username}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href={localizeHref("/profile")} className="flex cursor-pointer items-center" onClick={onLinkClick}>
                                        <Settings className="mr-2 h-4 w-4" />
                                        <span>{t("nav.profileSettings")}</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={localizeHref("/wishlist")} className="flex cursor-pointer items-center" onClick={onLinkClick}>
                                        <Gift className="mr-2 h-4 w-4" />
                                        <span>{t("nav.wishlist")}</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={localizeHref("/favorites")} className="flex cursor-pointer items-center" onClick={onLinkClick}>
                                        <Crown className="mr-2 h-4 w-4" />
                                        <span>{t("nav.favorites")}</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={localizeHref("/my-reports")} className="flex cursor-pointer items-center" onClick={onLinkClick}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        <span>{t("nav.myReports")}</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="cursor-pointer text-destructive focus:text-destructive"
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        setLogoutOpen(true);
                                    }}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>{t("nav.logout")}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{t("nav.logout")}</AlertDialogTitle>
                                    <AlertDialogDescription>{t("nav.logoutConfirm")}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="cursor-pointer">{t("common.cancel")}</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleLogout}
                                        className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        {t("nav.logout")}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                ) : (
                    <div className={`${collapsed ? "space-y-2 px-2 py-3" : "flex gap-2 px-4 py-3"}`}>
                        {collapsed ? (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="default"
                                            size="icon"
                                            className="w-full cursor-pointer"
                                            onClick={() => (window.location.href = `${localizeHref("/login")}?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
                                        >
                                            <LogIn className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">{t("nav.login")}</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    className="flex-1 cursor-pointer"
                                    onClick={() => {
                                        onLinkClick();
                                        window.location.href = `${localizeHref("/login")}?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`;
                                    }}
                                >
                                    <LogIn className="mr-1.5 h-4 w-4" />
                                    <span className="sidebar-label">{t("nav.login")}</span>
                                </Button>
                                <Button
                                    className="flex-1 cursor-pointer"
                                    onClick={() => {
                                        onLinkClick();
                                        window.location.href = `${localizeHref("/register")}?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`;
                                    }}
                                >
                                    <UserPlus className="mr-1.5 h-4 w-4" />
                                    <span className="sidebar-label">{t("nav.register")}</span>
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── NavItem Component ────────────────────────────────────────────────────────
interface NavItemProps {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    active: boolean;
    collapsed: boolean;
    badge?: number;
    onClick?: () => void;
}

function NavItem({ href, label, icon: Icon, active, collapsed, badge, onClick }: NavItemProps) {
    const item = (
        <Link
            href={href}
            onClick={onClick}
            className={`group relative flex items-center rounded-lg transition-colors ${
                collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"
            } ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}
        >
            {/* Active indicator bar */}
            {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />}

            <Icon className={`h-[1.15rem] w-[1.15rem] shrink-0 ${active ? "text-foreground" : ""}`} />

            {!collapsed && <span className="sidebar-label truncate text-sm font-medium">{label}</span>}

            {/* Badge */}
            {badge ? (
                collapsed ? (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                ) : (
                    <Badge variant="destructive" className="sidebar-label ml-auto flex h-5 min-w-5 items-center justify-center p-0 text-xs">
                        {badge}
                    </Badge>
                )
            ) : null}
        </Link>
    );

    if (collapsed) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>{item}</TooltipTrigger>
                    <TooltipContent side="right">
                        <span>{label}</span>
                        {badge ? <Badge variant="destructive" className="ml-2 h-4 px-1 text-[10px]">{badge}</Badge> : null}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return item;
}

// ─── NavButton Component (for popovers like notifications) ────────────────────
interface NavButtonProps {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    collapsed: boolean;
    badge?: number;
}

const NavButton = React.forwardRef<HTMLButtonElement, NavButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>>(
    ({ label, icon: Icon, collapsed, badge, ...props }, ref) => {
        const btn = (
            <button
                ref={ref}
                {...props}
                className={`group relative flex w-full cursor-pointer items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground ${
                    collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"
                }`}
            >
                <Icon className="h-[1.15rem] w-[1.15rem] shrink-0" />
                {!collapsed && <span className="sidebar-label truncate text-sm font-medium">{label}</span>}
                {badge ? (
                    collapsed ? (
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                    ) : (
                        <Badge variant="destructive" className="sidebar-label ml-auto flex h-5 min-w-5 items-center justify-center p-0 text-xs">
                            {badge}
                        </Badge>
                    )
                ) : null}
            </button>
        );

        if (collapsed) {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>{btn}</TooltipTrigger>
                        <TooltipContent side="right">
                            <span>{label}</span>
                            {badge ? <Badge variant="destructive" className="ml-2 h-4 px-1 text-[10px]">{badge}</Badge> : null}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }

        return btn;
    }
);
NavButton.displayName = "NavButton";
