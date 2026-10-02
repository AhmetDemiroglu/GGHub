import { UNTRACKED_PREFIXES } from "@/core/lib/site-analytics";

/**
 * Meta (Facebook / Instagram) pikseli.
 *
 * Neden var: Meta reklamin "baglanti tiklamasini" sayar ama sayfanin gercekten acildigini
 * piksel olmadan goremez. Piksel PageView'i Ads Manager'da "acilis sayfasi goruntulemesi"
 * olur ve kampanya bu olaya gore optimize edilebilir; bos tiklamaya para odenmez.
 *
 * ID gizli degil (her sayfanin kaynaginda gorunur), bu yuzden ortam degiskeni yerine burada:
 * Railway'de ayar gerektirmez. Bos birakilirsa piksel hic yuklenmez.
 * Kaynak: Meta Events Manager > Veri kaynaklari > piksel (veri seti) ID'si.
 */
export const META_PIXEL_ID = "1680008650179328";

declare global {
    interface Window {
        fbq?: (...args: unknown[]) => void;
    }
}

/**
 * Root layout'ta beforeInteractive calisir: ilk PageView hidrasyonu BEKLEMEZ. /download-app
 * 5 sn sonra magazaya yonlendiriyor ve reklamdan gelen ziyaretci hizli cikiyor; PageView
 * React yuklendikten sonra gitseydi en degerli ziyaretleri kaybederdik.
 * Yonetim paneli rotalari site analitigiyle ayni listeden ayiklanir.
 */
export function metaPixelBootstrapScript(): string {
    if (!META_PIXEL_ID) return "";
    return `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
(function(){
  var p = location.pathname.replace(/^\\/(tr|en-US)(?=\\/|$)/, '') || '/';
  var skip = ${JSON.stringify(UNTRACKED_PREFIXES)}.some(function(x){ return p.indexOf(x) === 0; });
  if (!skip) fbq('track', 'PageView');
})();
`;
}

/** Istemci tarafi gezinmelerde (ilk sayfa haric, onu bootstrap gonderir) cagrilir. */
export function metaPixelPageView() {
    if (!META_PIXEL_ID) return;
    window.fbq?.("track", "PageView");
}

/**
 * Ozel olay. Ads Manager'da "Ozel donusum" yapilip kampanya buna gore optimize edilebilir.
 * Olcum kullanici akisini asla bozmaz.
 */
export function metaPixelCustom(name: string, params?: Record<string, unknown>) {
    if (!META_PIXEL_ID) return;
    try {
        window.fbq?.("trackCustom", name, params);
    } catch {
        // yut
    }
}
