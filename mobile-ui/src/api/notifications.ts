import { axiosInstance } from './client';
import type { NotificationDto } from '../models/notification';

export const getNotifications = (): Promise<NotificationDto[]> => {
  return axiosInstance
    .get('/notifications')
    .then((response) => response.data);
};

export const getUnreadNotificationCount = (): Promise<{ count: number }> => {
  return axiosInstance
    .get('/notifications/unread-count')
    .then((response) => response.data);
};

export const markAllNotificationsAsRead = (): Promise<void> => {
  return axiosInstance
    .put('/notifications/mark-all-read')
    .then((response) => response.data);
};
