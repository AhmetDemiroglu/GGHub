import { axiosInstance } from './client';
import type {
  NotificationDto,
  NotificationSettings,
  NotificationSettingsForUpdate,
} from '../models/notification';

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

/**
 * Tek bir bildirimi okundu yapar. Push bildirimine dokunulunca kullanilir: eskiden
 * push'tan icerige gidince rozet dusmuyordu, okundu olmasi icin zil ekranini tekrar
 * acmak gerekiyordu.
 */
export const markNotificationAsRead = (notificationId: number): Promise<void> => {
  return axiosInstance
    .put(`/notifications/${notificationId}/mark-read`)
    .then((response) => response.data);
};

export const getNotificationSettings = (): Promise<NotificationSettings> => {
  return axiosInstance
    .get<NotificationSettings>('/notifications/settings')
    .then((response) => response.data);
};

/** Kismi guncelleme; sunucu guncel ayarlarin TAMAMINI doner. */
export const updateNotificationSettings = (
  update: NotificationSettingsForUpdate,
): Promise<NotificationSettings> => {
  return axiosInstance
    .put<NotificationSettings>('/notifications/settings', update)
    .then((response) => response.data);
};
