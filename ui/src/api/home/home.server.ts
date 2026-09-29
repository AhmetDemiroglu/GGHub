import { HomeContent } from "@/models/home/home.model";
import { AppLocale } from "@/i18n/config";
import { serverGet } from "@/api/server-fetch";

/**
 * Ana sayfa icerigini sunucuda ceker (ortak gerekce ve zaman asimi: api/server-fetch.ts).
 *
 * `/home/content` [AllowAnonymous] ve yaniti yalnizca Accept-Language'e gore degisiyor
 * (HomeService `currentUserId` parametresini almasina ragmen kullanmiyor), bu yuzden dil
 * basina tek bir onbellek girdisi herkes icin dogru.
 */
const REVALIDATE_SECONDS = 300;

export async function getHomeContentServer(locale: AppLocale): Promise<HomeContent | null> {
    const { data } = await serverGet<HomeContent>("/api/home/content", {
        locale,
        revalidate: REVALIDATE_SECONDS,
        tags: [`home-content-${locale}`],
    });
    // API erisilemezse sayfayi dusurme: HomeView istemcide kendi istegini yapip skeleton'dan devam eder.
    return data;
}
