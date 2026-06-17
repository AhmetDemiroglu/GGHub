import { Platform } from 'react-native';
import { axiosInstance } from './client';

export const registerPushToken = (token: string): Promise<void> => {
  return axiosInstance
    .post('/notifications/register-token', { token, platform: Platform.OS })
    .then((response) => response.data);
};

export const unregisterPushToken = (token: string): Promise<void> => {
  return axiosInstance
    .post('/notifications/unregister-token', { token })
    .then((response) => response.data);
};
