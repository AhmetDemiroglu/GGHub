"use client";

import { useQuery } from "@tanstack/react-query";
import { getUnreadMessageCount, getConversations } from "@/api/messages/messages.api";
import { getNotifications, getUnreadNotificationCount } from "@/api/notifications/notifications.api";
import { getMyProfile } from "@/api/profile/profile.api";
import { useAuth } from "@core/hooks/use-auth";
import type { ConversationDto } from "@/models/messages/message.model";
import type { NotificationDto } from "@/models/notifications/notification.model";
import type { Profile } from "@/models/profile/profile.model";

export function useNavigationData() {
    const { isAuthenticated, user } = useAuth();
    const enabled = isAuthenticated && !!user;

    const { data: unreadNotifCount } = useQuery<{ count: number }>({
        queryKey: ["unread-notification-count"],
        queryFn: getUnreadNotificationCount,
        enabled,
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    const { data: unreadMsgCount } = useQuery<{ count: number }>({
        queryKey: ["unread-message-count"],
        queryFn: getUnreadMessageCount,
        enabled,
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    const { data: profile } = useQuery<Profile>({
        queryKey: ["my-profile"],
        queryFn: getMyProfile,
        enabled,
        staleTime: 5 * 60 * 1000,
    });

    return { unreadNotifCount, unreadMsgCount, profile };
}

export function useNotifications(open: boolean) {
    const { isAuthenticated, user } = useAuth();

    return useQuery<NotificationDto[]>({
        queryKey: ["notifications"],
        queryFn: getNotifications,
        enabled: isAuthenticated && !!user && open,
        staleTime: 60 * 1000,
    });
}

export function useRecentMessages(open: boolean) {
    const { isAuthenticated, user } = useAuth();

    return useQuery<ConversationDto[]>({
        queryKey: ["recent-messages"],
        queryFn: getConversations,
        enabled: isAuthenticated && !!user && open,
        staleTime: 30 * 1000,
    });
}
