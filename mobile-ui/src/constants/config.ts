export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.gghub.social';

// OAuth (set in .env / EAS env). Social buttons stay hidden until the Google client IDs exist.
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
export const OAUTH_ENABLED = Boolean(GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID);

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
