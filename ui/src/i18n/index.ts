import { AppLocale, buildLocalizedPathname, defaultLocale, isLocale } from "./config";
import { enUSMessages } from "./messages/en-US";
import { trMessages } from "./messages/tr";

type MessageNode = {
    [key: string]: string | MessageNode;
};

export const messagesByLocale = {
    tr: trMessages,
    "en-US": enUSMessages,
} satisfies Record<AppLocale, MessageNode>;

export type Messages = MessageNode;

export const getMessages = (locale: AppLocale): Messages => {
    return messagesByLocale[locale];
};

const getValueByPath = (messages: Record<string, unknown>, path: string): unknown => {
    return path.split(".").reduce<unknown>((accumulator, segment) => {
        if (accumulator && typeof accumulator === "object" && segment in accumulator) {
            return (accumulator as Record<string, unknown>)[segment];
        }

        return undefined;
    }, messages);
};

export const translate = (messages: Messages, key: string, values?: Record<string, string | number>) => {
    const template = getValueByPath(messages as unknown as Record<string, unknown>, key);
    if (typeof template !== "string") {
        return key;
    }

    if (!values) {
        return template;
    }

    return Object.entries(values).reduce((result, [token, value]) => {
        return result.replaceAll(`{${token}}`, String(value));
    }, template);
};

export const getPathLocale = (pathname?: string | null): AppLocale => {
    const firstSegment = pathname?.split("/").filter(Boolean)[0];
    return firstSegment && isLocale(firstSegment) ? firstSegment : defaultLocale;
};

export const getLocalizedHref = (pathname: string, locale: AppLocale) => buildLocalizedPathname(pathname, locale);
