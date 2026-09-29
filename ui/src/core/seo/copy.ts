import { getMessages, translate } from "@/i18n";
import type { AppLocale } from "@/i18n/config";

/**
 * SEO metinlerinin tek okuma yolu: i18n `seo.*` anahtarlari. Sunucu tarafi (generateMetadata,
 * JSON-LD, llms.txt) icindir; istemci bilesenleri useI18n kullanmaya devam eder.
 */
export const seoCopy = (locale: AppLocale, key: string, values?: Record<string, string | number>) =>
    translate(getMessages(locale), `seo.${key}`, values);
