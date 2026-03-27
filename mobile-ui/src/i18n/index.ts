import { trMessages } from './messages/tr';
import { enUSMessages } from './messages/en-US';

export type AppLocale = 'tr' | 'en-US';
export type Messages = typeof enUSMessages;

const messages: Record<AppLocale, Messages> = {
  tr: trMessages as unknown as Messages,
  'en-US': enUSMessages,
};

export const getMessages = (locale: AppLocale): Messages => messages[locale];
export const defaultLocale: AppLocale = 'en-US';
export const supportedLocales: AppLocale[] = ['tr', 'en-US'];

export const getLocaleLabel = (locale: AppLocale): string =>
  locale === 'tr' ? 'T\u00FCrk\u00E7e' : 'English (US)';

export const getLocaleFlag = (locale: AppLocale): string =>
  locale === 'tr' ? '\uD83C\uDDF9\uD83C\uDDF7' : '\uD83C\uDDFA\uD83C\uDDF8';

export const isLocale = (value: string): value is AppLocale =>
  supportedLocales.includes(value as AppLocale);

export const normalizeLocale = (value?: string | null): AppLocale | null => {
  if (!value) return null;
  const normalized = value.trim();
  if (isLocale(normalized)) return normalized;
  const lower = normalized.toLowerCase();
  if (lower === 'tr' || lower === 'tr-tr') return 'tr';
  if (lower === 'en' || lower === 'en-us') return 'en-US';
  return null;
};
