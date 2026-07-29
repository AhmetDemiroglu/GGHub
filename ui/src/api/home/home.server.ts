import { HomeContent } from "@/models/home/home.model";
import { AppLocale } from "@/i18n/config";

/**
 * Ana sayfa içeriğini sunucuda çeker.
 *
 * Neden ayrı bir dosya: `axiosInstance` tarayıcıya bağlı (localStorage'dan token okuyan
 * interceptor'lar, refresh kuyruğu). Sunucuda düz `fetch` kullanmak hem daha hafif hem de
 * Next'in Data Cache'ini kullanabilmemizi sağlıyor.
 *
 * `/home/content` [AllowAnonymous] ve yanıtı yalnızca Accept-Language'e göre değişiyor
 * (HomeService `currentUserId` parametresini almasına rağmen kullanmıyor), bu yüzden dil
 * başına tek bir önbellek girdisi herkes için doğru.
 */
const REVALIDATE_SECONDS = 300;

export async function getHomeContentServer(locale: AppLocale): Promise<HomeContent | null> {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!baseUrl) return null;

    try {
        const response = await fetch(`${baseUrl}/api/home/content`, {
            headers: { "Accept-Language": locale },
            next: { revalidate: REVALIDATE_SECONDS, tags: [`home-content-${locale}`] },
        });

        if (!response.ok) return null;

        return (await response.json()) as HomeContent;
    } catch {
        // API erişilemezse sayfayı düşürme: HomeView istemcide kendi isteğini yapıp
        // skeleton'dan devam eder, yani eski davranışa geri düşülür.
        return null;
    }
}
