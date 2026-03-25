import { cookies } from "next/headers";
import { defaultLocale, localeCookieName, normalizeLocale } from "./config";

export const resolveLocaleFromCookies = async () => {
    const cookieStore = await cookies();
    return normalizeLocale(cookieStore.get(localeCookieName)?.value) ?? defaultLocale;
};
