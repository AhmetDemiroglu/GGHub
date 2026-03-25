import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { AuthContext } from "@core/contexts/auth-context";
import { defaultLocale, localeCookieName, localeStorageKey } from "@/i18n/config";

type RefreshQueueItem = {
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
};

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

type RateLimitedAxiosError = AxiosError & {
    response?: AxiosError["response"] & {
        isRateLimitError?: boolean;
    };
};

export const axiosInstance = axios.create({
    baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api`,
    timeout: 15000,
});

const skipRefreshPaths = ["/auth/login", "/auth/register", "/auth/verify-email"];

let authContextRef: React.ContextType<typeof AuthContext> | null = null;

export function setAuthContextRef(context: React.ContextType<typeof AuthContext>) {
    authContextRef = context;
}

let isRefreshing = false;
let failedQueue: RefreshQueueItem[] = [];

const getBrowserLocale = () => {
    if (typeof window === "undefined") {
        return defaultLocale;
    }

    return (
        localStorage.getItem(localeStorageKey) ||
        document.cookie
            .split("; ")
            .find((item) => item.startsWith(`${localeCookieName}=`))
            ?.split("=")[1] ||
        defaultLocale
    );
};

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((pending) => {
        if (error) {
            pending.reject(error);
        } else {
            pending.resolve(token!);
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

        config.headers["Accept-Language"] = getBrowserLocale();
        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const typedError = error as RateLimitedAxiosError;
        if (typedError.response?.status === 429) {
            typedError.response.isRateLimitError = true;
            return Promise.reject(typedError);
        }

        const originalRequest = error.config as RetryableRequest;
        const isSkipRefreshPath = skipRefreshPaths.some((path) => originalRequest.url?.includes(path));

        if (error.response?.status === 401 && !originalRequest._retry && !isSkipRefreshPath) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return axiosInstance(originalRequest);
                    })
                    .catch((refreshError) => Promise.reject(refreshError));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = authContextRef?.refreshToken;
                if (!refreshToken || !authContextRef) {
                    authContextRef?.logout();
                    return Promise.reject(error);
                }

                const response = await axiosInstance.post("/auth/refresh", { token: refreshToken });
                const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

                authContextRef.login({ accessToken: newAccessToken, refreshToken: newRefreshToken });
                axiosInstance.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                processQueue(null, newAccessToken);
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                authContextRef?.logout();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);
