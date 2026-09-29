import { Skeleton } from "@/core/components/ui/skeleton";
import AiClubPromoSlide from "./ai-club-promo-slide";

/**
 * Ana sayfanin akis sirasindaki kabugu: HomePage /home/content cevabini beklerken bu cizilir.
 *
 * Neden promo slayti burada: Lighthouse'ta LCP elemani hero'daki AI Kulubu basligi ve LCP'nin
 * %84'u "render delay" idi (5.8 sn). Baslik hicbir veri gerektirmedigi halde API cevabini ve
 * akisin sonunu bekliyordu, cunku sayfanin tamami tek Suspense sinirinin icindeydi. Simdi ayni
 * slayt veriden bagimsiz, ilk HTML parcasiyla iner ve ilk boyada gorunur; icerik gelince
 * HomeView ayni slayti karuselin 1. sirasina koyar. Yukseklikler birebir ayni (340/420 px),
 * yer degistirme olmaz. Slaytin kendi sorgusu (ai-club) react-query anahtariyla paylasilir,
 * ikinci kez istek atilmaz.
 */
export default function HomeStreamingFallback() {
    return (
        <div className="space-y-5 pb-10">
            <section>
                <AiClubPromoSlide />
            </section>
            <Skeleton className="h-12 w-full rounded-xl" />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="space-y-3 xl:col-span-8">
                    {[1, 2, 3].map((item) => (
                        <Skeleton key={item} className="h-32 rounded-xl" />
                    ))}
                </div>
                <div className="space-y-4 xl:col-span-4">
                    <Skeleton className="h-64 rounded-xl" />
                    <Skeleton className="h-48 rounded-xl" />
                </div>
            </div>
        </div>
    );
}
