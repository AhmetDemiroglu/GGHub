"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/en";
import "dayjs/locale/tr";
import { useQueryClient } from "@tanstack/react-query";
import { AtSign, Bell, Cake, Heart, List, MessageSquare, Repeat2, Reply, Star, ThumbsUp, UserPlus } from "lucide-react";
import { markAllNotificationsAsRead, markNotificationAsRead } from "@/api/notifications/notifications.api";
import { useNavigationData, useNotifications } from "@/core/hooks/use-navigation-data";
import { useLocalizedHref } from "@/core/hooks/use-localized-href";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { displayName } from "@/core/lib/display-name";
import { cn } from "@/core/lib/utils";
import { NotificationType, type NotificationDto } from "@/models/notifications/notification.model";
import { UserLink } from "@/core/components/base/user-link";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";

dayjs.extend(relativeTime);

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
        case NotificationType.PostLike:
            return { Icon: Heart, color: "text-rose-500" };
        case NotificationType.PostReply:
            return { Icon: MessageSquare, color: "text-sky-500" };
        case NotificationType.PostRepost:
            return { Icon: Repeat2, color: "text-emerald-500" };
        case NotificationType.Birthday:
            return { Icon: Cake, color: "text-fuchsia-500" };
        default:
            return { Icon: Bell, color: "text-muted-foreground" };
    }
};

/**
 * Bildirim metni. Backend mesaji okuyucunun dilinde TAM cumle uretir ve basina aktorun
 * gorunen adini koyar. Ad basta ise kalin + link yapilir, degilse mesaj duz basilir.
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

/**
 * Ust cubuktaki zil. Liste bir portal'da, asagi dogru acilir ve yuksekligi ekrana gore
 * sinirlanir: kenar cubugundaki eski yerinde alt satirlar ekran disinda kaliyordu.
 */
export function NotificationsMenu() {
    const t = useI18n();
    const locale = useCurrentLocale();
    const localizeHref = useLocalizedHref();
    const queryClient = useQueryClient();
    const { unreadNotifCount } = useNavigationData();
    const [open, setOpen] = useState(false);
    const { data: notifications } = useNotifications(open);

    useEffect(() => {
        dayjs.locale(locale === "tr" ? "tr" : "en");
    }, [locale]);

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    // Acilinca hepsi okundu sayilir. BILEREK boyle: X/Instagram deseni.
    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        if (next && unreadNotifCount && unreadNotifCount.count > 0) {
            markAllNotificationsAsRead().then(invalidate).catch(() => undefined);
        }
    };

    /** Tek bildirime tiklaninca da okundu isaretle (best-effort; hata akisi bozmaz). */
    const handleClick = (notification: NotificationDto) => {
        markNotificationAsRead(notification.id).then(invalidate).catch(() => undefined);
    };

    const unread = unreadNotifCount?.count ?? 0;
    const items = notifications?.filter((n) => n.type !== NotificationType.Message) ?? [];

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label={t("nav.notifications")}
                    className={cn(
                        "relative flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground",
                        open && "bg-accent text-foreground",
                    )}
                >
                    <Bell className="size-5" />
                    {unread > 0 ? (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background">
                            {unread > 99 ? "99+" : unread}
                        </span>
                    ) : null}
                </button>
            </PopoverTrigger>
            <PopoverContent
                side="bottom"
                align="end"
                sideOffset={10}
                collisionPadding={12}
                className="w-[22rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl p-0 shadow-[0_24px_60px_-20px_rgba(8,10,24,0.45)]"
            >
                <div className="border-b px-4 py-3">
                    <h3 className="font-semibold">{t("nav.notificationsTitle")}</h3>
                </div>
                <div className="max-h-[min(60vh,26rem)] overflow-y-auto">
                    {items.length ? (
                        items.map((notification) => {
                            const { Icon, color } = notificationIconMeta(notification.type);
                            const close = () => setOpen(false);

                            return (
                                // Satiri kaplayan link deseni: profil linkini ic ice <a> yapmadan
                                // hem satirin tamami hem de avatar/ad ayri ayri tiklanabilir kalir.
                                <div key={notification.id} className={cn("relative border-b p-3 last:border-b-0 hover:bg-accent", !notification.isRead && "bg-accent/50")}>
                                    {notification.link && (
                                        <Link
                                            href={localizeHref(notification.link)}
                                            className="absolute inset-0 z-10 cursor-pointer"
                                            aria-label={notification.message}
                                            onClick={() => {
                                                handleClick(notification);
                                                close();
                                            }}
                                        />
                                    )}
                                    <div className="flex items-start gap-3">
                                        {notification.actor ? (
                                            <div className="relative z-20 shrink-0">
                                                <UserLink user={notification.actor} variant="avatar" avatarClassName="h-9 w-9" onNavigate={close} />
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
                                            <NotificationMessage notification={notification} onNavigate={close} />
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
    );
}
