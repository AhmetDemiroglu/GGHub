import { AppLocale } from "./config";
import { enUSMessages } from "./messages/en-US";
import { trMessages } from "./messages/tr";
import type { MessageNode } from "./translate";

// Bu modul iki dilin paketini de STATIK ice alir: yalniz sunucu bilesenleri (layout, page)
// buradan getMessages okumali. Istemci bilesenleri "@/i18n/translate" kullanir; gerekce orada.
export { translate, getPathLocale, getLocalizedHref, loadMessages } from "./translate";
export type { Messages, MessageNode } from "./translate";

export const messagesByLocale = {
    tr: trMessages,
    "en-US": enUSMessages,
} satisfies Record<AppLocale, MessageNode>;

export const getMessages = (locale: AppLocale): MessageNode => {
    return messagesByLocale[locale];
};
