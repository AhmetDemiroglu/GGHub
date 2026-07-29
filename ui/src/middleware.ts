import { NextRequest, NextResponse } from "next/server";
import { buildLocalizedPathname, countryToLocale, defaultLocale, isLocale, localeCookieName, localeManualCookieName, normalizeLocale, parseAcceptLanguage } from "@/i18n/config";

const publicFilePattern = /\.(.*)$/;

const resolveLocale = (request: NextRequest) => {
    // Kullanıcı language switcher ile bilinçli seçim yaptıysa, cookie'yi koru
    const isManualSelection = request.cookies.get(localeManualCookieName)?.value === "1";
    if (isManualSelection) {
        const cookieLocale = normalizeLocale(request.cookies.get(localeCookieName)?.value);
        if (cookieLocale) {
            return cookieLocale;
        }
    }

    // 1. Tarayıcının dil tercihi (Accept-Language). Kullanıcının SEÇTİĞİ dil, bulunduğu
    //    ülkeden daha güçlü bir sinyaldir: VPN / seyahat / kurumsal proxy durumunda IP
    //    yanıltır, tarayıcı dili yanıltmaz.
    //    NOT: Bu kontrol eskiden coğrafi konumdan SONRA geliyordu; countryToLocale hiçbir
    //    zaman null dönmediği ve Vercel her istekte ülke header'ı gönderdiği için burası
    //    production'da hiç çalışmayan ölü koddu (Türkçe tarayıcı + TR olmayan IP -> en-US).
    const acceptLanguageLocale = parseAcceptLanguage(request.headers.get("accept-language"));
    if (acceptLanguageLocale) {
        return acceptLanguageLocale;
    }

    // 2. Accept-Language yoksa/desteklenmiyorsa coğrafi konuma düş (Vercel, Cloudflare, vb.)
    const country =
        request.headers.get("x-vercel-ip-country") ??
        request.headers.get("cf-ipcountry") ??
        request.headers.get("x-country-code");

    if (country) {
        return countryToLocale(country);
    }

    return defaultLocale;
};

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname.startsWith("/images") ||
        pathname.startsWith("/og") ||
        pathname.startsWith("/download-app") ||
        pathname === "/download" ||
        publicFilePattern.test(pathname)
    ) {
        return NextResponse.next();
    }

    const pathnameLocale = pathname.split("/").filter(Boolean)[0];

    if (pathnameLocale && isLocale(pathnameLocale)) {
        const response = NextResponse.next();
        response.cookies.set(localeCookieName, pathnameLocale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
        return response;
    }

    const locale = resolveLocale(request);
    const localizedPathname = buildLocalizedPathname(pathname, locale);
    const targetUrl = request.nextUrl.clone();
    targetUrl.pathname = localizedPathname;

    // Kök yol + varsayılan dil: redirect yerine rewrite. 307 tam bir gidiş-dönüş demek ve
    // yavaş mobil bağlantıda Lighthouse bunu ~910 ms olarak ölçtü. Rewrite'ta URL "/" olarak
    // kalır, içerik doğrudan döner. Çift içerik riski yok: sayfanın generateMetadata'sı
    // canonical olarak zaten /en-US bildiriyor.
    // Türkçe çözümlenen ziyaretçi eskisi gibi /tr'ye yönlendirilmeye devam ediyor, çünkü
    // dilin URL'de görünmesi paylaşılabilirlik açısından önemli.
    const response =
        pathname === "/" && locale === defaultLocale ? NextResponse.rewrite(targetUrl) : NextResponse.redirect(targetUrl);

    response.cookies.set(localeCookieName, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return response;
}

export const config = {
    matcher: ["/((?!_next|.*\\..*).*)"],
};
