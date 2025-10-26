import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { AuthContext } from "@core/contexts/auth-context";

export const axiosInstance = axios.create({
    baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api`,
});

let authContextRef: React.ContextType<typeof AuthContext> | null = null;

export function setAuthContextRef(context: React.ContextType<typeof AuthContext>) {
    authContextRef = context;
}

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
            originalRequest._retry = true;

            try {
                const refreshToken = authContextRef?.refreshToken;
                if (!refreshToken || !authContextRef) {
                    authContextRef?.logout();
                    return Promise.reject(error);
                }

                const response = await axiosInstance.post("/auth/refresh", { refreshToken });
                const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

                authContextRef.login({ accessToken: newAccessToken, refreshToken: newRefreshToken });
                axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;

                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                return axiosInstance(originalRequest);
            } catch (_error) {
                authContextRef?.logout();
                window.location.href = "/login";
                return Promise.reject(_error);
            }
        }

        return Promise.reject(error);
    }
);