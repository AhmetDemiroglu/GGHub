import Image from "next/image";
import logoSrc from "@core/assets/logo.png";
import Link from "next/link";
import { useAuth } from "@core/hooks/use-auth";
import { Button } from "@/core/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/core/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Profile } from "@/models/profile/profile.model";
import { getMyProfile } from "@/api/profile/profile.api";
import { SearchBar } from "@/core/components/other/search/search-bar";
import { Bell, Mail, LogIn, LogOut, UserPlus, List, Star, Settings } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getNotifications, getUnreadNotificationCount, markAllNotificationsAsRead } from "@/api/notifications/notifications.api";
import { NotificationDto, NotificationType } from "@/models/notifications/notification.model";
import { Badge } from "@/core/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";
import { useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { getConversations } from "@/api/messages/messages.api";
import { getUnreadMessageCount } from "@/api/messages/messages.api";
import { ConversationDto } from "@/models/messages/message.model";
import "dayjs/locale/tr";

dayjs.extend(relativeTime);
dayjs.locale("tr");

export function Header() {
    const { isAuthenticated, user, logout } = useAuth();

    const [notificationOpen, setNotificationOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: unreadNotifCount } = useQuery({
        queryKey: ["unread-notification-count"],
        queryFn: getUnreadNotificationCount,
        enabled: isAuthenticated && !!user,
        refetchInterval: 10000,
    });

    const { data: notifications } = useQuery<NotificationDto[]>({
        queryKey: ["notifications"],
        queryFn: getNotifications,
        enabled: isAuthenticated && !!user && notificationOpen,
    });

    const handleNotificationOpen = (open: boolean) => {
        setNotificationOpen(open);

        if (open && unreadNotifCount && unreadNotifCount.count > 0) {
            markAllNotificationsAsRead()
                .then(() => {
                    queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
                    queryClient.invalidateQueries({ queryKey: ["notifications"] });
                })
                .catch(() => {});
        }
    };

    const [messagesOpen, setMessagesOpen] = useState(false);

    const { data: unreadMsgCount } = useQuery({
        queryKey: ["unread-message-count"],
        queryFn: getUnreadMessageCount,
        enabled: isAuthenticated && !!user,
        refetchInterval: 10000,
    });

    const { data: recentMessages } = useQuery<ConversationDto[]>({
        queryKey: ["recent-messages"],
        queryFn: getConversations,
        enabled: isAuthenticated && !!user && messagesOpen,
    });

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

    const getNotificationIcon = (type: NotificationType) => {
        switch (type) {
            case NotificationType.Follow:
                return <UserPlus className="h-5 w-5 text-blue-500" />;
            case NotificationType.ListFollow:
                return <List className="h-5 w-5 text-green-500" />;
            case NotificationType.Review:
                return <Star className="h-5 w-5 text-yellow-500" />;
            default:
                return <Bell className="h-8 w-5 text-muted-foreground" />;
        }
    };

    const enabled = isAuthenticated && !!user;
    const { data } = useQuery<Profile>({
        queryKey: ["my-profile"],
        queryFn: getMyProfile,
        enabled,
        staleTime: 5 * 60 * 1000,
    });

    const router = useRouter();
    const handleLogout = () => {
        logout();
        router.push("/");
        toast.info("Başarıyla çıkış yapıldı.");
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-6">
                <Link className="mr-3 flex items-center space-x-2" href="/">
                    <Image src={logoSrc} alt="GGHub Logo" width={35} height={22} priority className="h-8 w-auto" />
                </Link>
                <div className="flex items-center ml-auto mr-1">
                    <SearchBar />

                    {/* Kullanıcı giriş yapmış mı? */}
                    {isAuthenticated && user ? (
                        <div className="flex items-center gap-2 ml-4">
                            {/* Notifications Bell */}
                            <Popover open={notificationOpen} onOpenChange={handleNotificationOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="relative cursor-pointer">
                                        <Bell className="h-5 w-5" />
                                        {unreadNotifCount && unreadNotifCount.count > 0 && (
                                            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                                                {unreadNotifCount.count}
                                            </Badge>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0" align="end">
                                    <div className="border-b p-3">
                                        <h3 className="font-semibold">Bildirimler</h3>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        {notifications && notifications.length > 0 ? (
                                            notifications
                                                .filter((n) => n.type !== NotificationType.Message)
                                                .map((notification) => {
                                                    const timeAgo = dayjs(notification.createdAt).fromNow();
                                                    const icon = getNotificationIcon(notification.type);

                                                    const content = (
                                                        <div className="flex items-start gap-3">
                                                            {icon}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm">{notification.message}</p>
                                                                <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                                                            </div>
                                                        </div>
                                                    );

                                                    return notification.link ? (
                                                        <Link
                                                            key={notification.id}
                                                            href={notification.link}
                                                            className={`block p-3 border-b hover:bg-accent cursor-pointer ${!notification.isRead ? "bg-accent/50" : ""}`}
                                                            onClick={() => setNotificationOpen(false)}
                                                        >
                                                            {content}
                                                        </Link>
                                                    ) : (
                                                        <div key={notification.id} className={`p-3 border-b ${!notification.isRead ? "bg-accent/50" : ""}`}>
                                                            {content}
                                                        </div>
                                                    );
                                                })
                                        ) : (
                                            <div className="p-8 text-center text-sm text-muted-foreground">Bildirim yok</div>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {/* Messages */}
                            <Popover open={messagesOpen} onOpenChange={setMessagesOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="relative cursor-pointer">
                                        <Mail className="h-5 w-5" />
                                        {unreadMsgCount && unreadMsgCount.count > 0 && (
                                            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                                                {unreadMsgCount.count}
                                            </Badge>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0" align="end">
                                    <div className="border-b p-3">
                                        <h3 className="font-semibold">Mesajlar</h3>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        {recentMessages && recentMessages.length > 0 ? (
                                            recentMessages.slice(0, 5).map((conversation) => {
                                                const avatarSrc = getImageUrl(conversation.partnerProfileImageUrl);
                                                const timeAgo = dayjs(conversation.lastMessageSentAt).fromNow();

                                                return (
                                                    <Link
                                                        key={conversation.partnerId}
                                                        href={`/messages/${conversation.partnerUsername}`}
                                                        className="block p-3 border-b hover:bg-accent cursor-pointer"
                                                        onClick={() => setMessagesOpen(false)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-10 w-10 flex-shrink-0">
                                                                <AvatarImage src={avatarSrc} alt={conversation.partnerUsername} />
                                                                <AvatarFallback>{conversation.partnerUsername.charAt(0).toUpperCase()}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <p className="font-semibold text-sm truncate">{conversation.partnerUsername}</p>
                                                                    {conversation.unreadCount > 0 && (
                                                                        <Badge variant="default" className="ml-2 flex-shrink-0 h-5 w-5 flex items-center justify-center p-0 text-xs">
                                                                            {conversation.unreadCount}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-muted-foreground truncate">{conversation.lastMessage}</p>
                                                                <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                );
                                            })
                                        ) : (
                                            <div className="p-8 text-center text-sm text-muted-foreground">Mesaj yok</div>
                                        )}
                                    </div>
                                    <div className="border-t p-2">
                                        <Button variant="ghost" className="w-full text-sm" asChild>
                                            <Link href="/messages" onClick={() => setMessagesOpen(false)}>
                                                Tüm Mesajları Gör
                                            </Link>
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {/* Profile Avatar */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-8 w-8 ml-3 rounded-full">
                                        <Avatar className="h-10 w-10 cursor-pointer">
                                            <AvatarImage src={getImageUrl(data?.profileImageUrl)} alt={user.username} />
                                            <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel asChild>
                                        <Link href={`/profiles/${user.username}`} className="cursor-pointer">
                                            {user.username}
                                        </Link>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/profile" className="cursor-pointer flex items-center">
                                            <Settings className="mr-2 h-4 w-4" />
                                            <span>Profil Yönetimi</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Çıkış Yap</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ) : (
                        // Giriş ve Kayıt ol butonları
                        <div className="flex items-center space-x-2">
                            <Button asChild variant="ghost">
                                <Link href="/login">
                                    <LogIn className="mr-1 h-4 w-4" />
                                    Giriş Yap
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link href="/register">
                                    <UserPlus className="mr-1 h-4 w-4" />
                                    Kayıt Ol
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
