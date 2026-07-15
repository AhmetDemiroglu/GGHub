import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

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

// Refresh cagrilari icin interceptor'suz ayri client: refresh'in kendi 401'i tekrar
// refresh tetiklemesin (recursion/deadlock olmaz). Authorization header'i da tasimaz;
// yenileme govdedeki refresh token ile yapilir.
const refreshClient = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
});

const skipRefreshPaths = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-email',
  '/auth/google',
  '/auth/apple',
  '/auth/refresh',
];

let accessTokenRef: string | null = null;
let refreshTokenRef: string | null = null;
let logoutCallbackRef: (() => void) | null = null;
let localeGetterRef: (() => string) | null = null;

export type RefreshResult = { accessToken: string; refreshToken: string };

// Refresh basarili olunca auth-context'in state + SecureStore'u guncellemesi icin callback.
let onTokensRefreshedRef: ((result: RefreshResult) => void) | null = null;

// Ayni anda birden fazla refresh gitmesin diye tek-ucus (single-flight) promise.
let refreshInFlight: Promise<RefreshResult> | null = null;

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

export function setOnTokensRefreshed(fn: (result: RefreshResult) => void) {
  onTokensRefreshedRef = fn;
}

export class NoRefreshTokenError extends Error {
  constructor() {
    super('no_refresh_token');
    this.name = 'NoRefreshTokenError';
  }
}

/**
 * Hata "gercek kimlik reddi" mi (refresh token gecersiz/suresi dolmus/revoked) yoksa
 * "gecici" mi (ag yok, timeout, 5xx)? SADECE gercek red'de logout edilir; boylece
 * Android cold-start'ta ag hazir olmadan gelen gecici hatalar kullaniciyi atmaz.
 */
export function isAuthRejection(error: unknown): boolean {
  const status = (error as AxiosError)?.response?.status;
  return status === 400 || status === 401 || status === 403;
}

/**
 * Access token'i yeniler. Hem response interceptor'u hem auth-context proaktif timer'i
 * BUNU cagirir; single-flight guard sayesinde ayni anda tek /auth/refresh gider. Boylece
 * rotating (tek-kullanimlik) refresh token yarismaz ve yanlislikla revoke olup logout
 * tetiklemez.
 */
export async function refreshAccessToken(): Promise<RefreshResult> {
  if (refreshInFlight) return refreshInFlight;

  const currentRefresh = refreshTokenRef;
  if (!currentRefresh) {
    return Promise.reject(new NoRefreshTokenError());
  }

  refreshInFlight = (async () => {
    try {
      const response = await refreshClient.post('/auth/refresh', {
        refreshToken: currentRefresh,
      });
      const result: RefreshResult = {
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      };
      accessTokenRef = result.accessToken;
      refreshTokenRef = result.refreshToken;
      axiosInstance.defaults.headers.common.Authorization = `Bearer ${result.accessToken}`;
      onTokensRefreshedRef?.(result);
      return result;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

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
      originalRequest?.url?.includes(path),
    );

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isSkipRefreshPath
    ) {
      originalRequest._retry = true;
      try {
        const { accessToken } = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Yalnizca gercek kimlik reddinde (veya refresh token hic yoksa) logout.
        // Gecici ag/timeout/5xx hatasinda oturumu KORU; sonraki istek yeniden dener.
        if (
          refreshError instanceof NoRefreshTokenError ||
          isAuthRejection(refreshError)
        ) {
          logoutCallbackRef?.();
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
