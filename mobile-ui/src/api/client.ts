import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

type RefreshQueueItem = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

type RateLimitedAxiosError = AxiosError & {
  response?: AxiosError['response'] & {
    isRateLimitError?: boolean;
  };
};

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || 'https://api.gghub.social';

export const axiosInstance = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
});

const skipRefreshPaths = ['/auth/login', '/auth/register', '/auth/verify-email'];

let accessTokenRef: string | null = null;
let refreshTokenRef: string | null = null;
let logoutCallbackRef: (() => void) | null = null;
let localeGetterRef: (() => string) | null = null;

let isRefreshing = false;
let failedQueue: RefreshQueueItem[] = [];

export function setAuthTokens(access: string | null, refresh: string | null) {
  accessTokenRef = access;
  refreshTokenRef = refresh;
}

export function setLogoutCallback(fn: () => void) {
  logoutCallbackRef = fn;
}

export function setLocaleGetter(fn: () => string) {
  localeGetterRef = fn;
}

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
    if (accessTokenRef) {
      config.headers.Authorization = `Bearer ${accessTokenRef}`;
    }

    const locale = localeGetterRef ? localeGetterRef() : 'en-US';
    config.headers['Accept-Language'] = locale;

    return config;
  },
  (error: AxiosError) => Promise.reject(error),
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
    const isSkipRefreshPath = skipRefreshPaths.some((path) =>
      originalRequest.url?.includes(path),
    );

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isSkipRefreshPath
    ) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
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
        if (!refreshTokenRef) {
          logoutCallbackRef?.();
          return Promise.reject(error);
        }

        const response = await axiosInstance.post('/auth/refresh', {
          token: refreshTokenRef,
        });
        const {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        } = response.data;

        setAuthTokens(newAccessToken, newRefreshToken);
        axiosInstance.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logoutCallbackRef?.();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
