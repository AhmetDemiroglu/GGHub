export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.gghub.social';

export const APP_CONFIG = {
  appName: 'GGHub',
  version: '1.0.0',
  defaultLocale: 'en-US' as const,
  supportedLocales: ['tr', 'en-US'] as const,
  tokenRefreshThresholdMinutes: 2,
  signalRReconnectDelays: [0, 2000, 5000, 10000, 30000],
  paginationDefaults: {
    pageSize: 15,
    adminPageSize: 15,
  },
};
