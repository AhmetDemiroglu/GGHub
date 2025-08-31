import { useAuthStore } from '@/core/stores/auth.store';
import axios from 'axios';

export const axiosInstance = axios.create({
  baseURL: 'https://localhost:7263/api',
});

axiosInstance.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; 

      try {
        const { refreshToken, login, logout } = useAuthStore.getState();
        if (!refreshToken) {
          logout();
          return Promise.reject(error);
        }

        const response = await axiosInstance.post('/auth/refresh', { refreshToken });
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

        login({ accessToken: newAccessToken, refreshToken: newRefreshToken });
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        return axiosInstance(originalRequest);
      } catch (_error) {
        const { logout } = useAuthStore.getState();
        logout();
        window.location.href = '/login'; 
        return Promise.reject(_error);
      }
    }

    return Promise.reject(error);
  }
);