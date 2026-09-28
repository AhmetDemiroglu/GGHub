import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { AuthContext } from "@core/contexts/auth-context";
import { getClientLocale } from "@core/lib/client-locale";
import { AI_CONSENT_ERROR_CODE, AiConsentReason, requestAiConsent } from "@core/lib/ai-consent-bridge";

type RefreshQueueItem = {
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
};

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean; _aiConsentRetry?: boolean };

type RateLimitedAxiosError = AxiosError & {
    response?: AxiosError["response"] & {
        isRateLimitError?: boolean;
    };
};

export const axiosInstance = axios.create({
    baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api`,
    timeout: 15000,
});

const skipRefreshPaths = ["/auth/login", "/auth/register", "/auth/verify-email", "/auth/google", "/auth/apple"];

let authContextRef: React.ContextType<typeof AuthContext> | null = null;

export function setAuthContextRef(context: React.ContextType<typeof AuthContext>) {
    authContextRef = context;
}

let isRefreshing = false;
let failedQueue: RefreshQueueItem[] = [];

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

        // Ekranda gorunen dil (URL yolu) once: sunucu bot/kulup verisini bu dile gore suzer.
        config.headers["Accept-Language"] = getClientLocale();
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

        // Bota yazma denemesi rizasiz: onay penceresini ac, onaylanirsa istegi BIR kez tekrarla.
        // Vazgecilirse hata "is kurali" olarak isaretlenir; global toast basilmaz.
        const errorBody = error.response?.data as { code?: string; reason?: AiConsentReason } | undefined;
        if (error.response?.status === 403 && errorBody?.code === AI_CONSENT_ERROR_CODE && originalRequest && !originalRequest._aiConsentRetry) {
            const accepted = await requestAiConsent(errorBody.reason ?? "consentRequired");
            if (accepted) {
                originalRequest._aiConsentRetry = true;
                return axiosInstance(originalRequest);
            }
            (error as AxiosError & { isBusinessError?: boolean }).isBusinessError = true;
            return Promise.reject(error);
        }

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

                const response = await axiosInstance.post("/auth/refresh", { refreshToken });
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
