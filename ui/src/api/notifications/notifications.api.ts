import { axiosInstance } from "@core/lib/axios";
import { NotificationDto } from "@/models/notifications/notification.model";

export const getNotifications = (): Promise<NotificationDto[]> => {
    return axiosInstance
        .get("/notifications")
        .then((response) => response.data)
        .catch((error) => {
            throw error;
        });
};

export const getUnreadNotificationCount = (): Promise<{ count: number }> => {
    return axiosInstance
        .get("/notifications/unread-count")
        .then((response) => response.data)
        .catch((error) => {
            throw error;
        });
};

export const markAllNotificationsAsRead = (): Promise<void> => {
    return axiosInstance
        .put("/notifications/mark-all-read")
        .then((response) => response.data)
        .catch((error) => {
            throw error;
        });
};
