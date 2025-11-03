import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { AuthContext } from "@core/contexts/auth-context";

export const axiosInstance = axios.create({
    baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api`,
});

let authContextRef: React.ContextType<typeof AuthContext> | null = null;

export function setAuthContextRef(context: React.ContextType<typeof AuthContext>) {
    authContextRef = context;
}

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token!);
        }
    });
    failedQueue = [];
};

axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const accessToken = authContextRef?.accessToken;

        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return axiosInstance(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = authContextRef?.refreshToken;
                if (!refreshToken || !authContextRef) {
                    authContextRef?.logout();
                    window.location.href = "/login";
                    return Promise.reject(error);
                }

                const response = await axiosInstance.post("/auth/refresh", { token: refreshToken });
                const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

                authContextRef.login({ accessToken: newAccessToken, refreshToken: newRefreshToken });
                axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;

                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                processQueue(null, newAccessToken);

                return axiosInstance(originalRequest);
            } catch (_error) {
                processQueue(_error, null);

                authContextRef?.logout();
                window.location.href = "/login";
                return Promise.reject(_error);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);
