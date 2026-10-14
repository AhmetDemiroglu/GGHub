/**
 * Bakim modu. Backend (Railway "GGHub / api") durdurulunca site ve mobil uygulama buradan cevap alir.
 *
 * Iki anahtar var, ikisi de yalniz middleware'de okunur:
 *   - MAINTENANCE_MODE=1 (Railway "GGHub / UI" degiskeni): web'in her sayfasi bu statik sayfayi 503 ile doner.
 *     Sayfa React/kok layout kullanmaz, backend'e hic istek atmaz; backend kapaliyken de calisir.
 *   - api.gghub.social alan adi UI servisine tasinirsa: o host'a gelen her istege bakim cevabi verilir.
 *     Mobilin acilis kapisi (GET /api/app-release/check) "maintenance" alir ve magazadaki MEVCUT surumler
 *     yeni yayin gerekmeden kendi bakim ekranini (BlockedScreen) gosterir. Bu dal bayraga bagli degildir:
 *     normal calismada api host'u bu servise hic gelmez.
 * /maintenance yolu her zaman acik onizlemedir (200 + noindex).
 * Adim adim kullanim: docs/bakim-modu.md
 */

export type MaintenanceLocale = "tr" | "en";

const RETRY_AFTER_SECONDS = "3600";

const STORE_URLS = {
    ios: "https://apps.apple.com/us/app/gghub-games-community/id6781281375",
    android: "https://play.google.com/store/apps/details?id=com.gghub.mobile",
} as const;

const MOBILE_MESSAGE = {
    tr: "Size daha iyi bir hizmet verebilmek için GGHub'ı yeniliyoruz. Kısa bir süre sonra geri döneceğiz.",
    en: "We're upgrading GGHub to serve you better. We'll be back soon.",
} as const;

const COPY = {
    tr: {
        htmlLang: "tr",
        docTitle: "GGHub bakımda",
        badge: "Bakım çalışması sürüyor",
        title: "Bakımdayız",
        lead: "Size daha iyi bir hizmet verebilmek için GGHub'ı yeniliyoruz.",
        body: "Kısa bir süre sonra daha güçlü haliyle geri döneceğiz. Anlayışınız için teşekkür ederiz.",
        footer: "GGHub ekibi",
        svgLabel: "Vinçlerin GGHub binasını inşa ettiği hareketli çizim",
    },
    en: {
        htmlLang: "en",
        docTitle: "GGHub is under maintenance",
        badge: "Maintenance in progress",
        title: "We're under maintenance",
        lead: "We're upgrading GGHub to serve you better.",
        body: "We'll be back soon, stronger than before. Thanks for your patience.",
        footer: "The GGHub team",
        svgLabel: "Animated drawing of cranes building the GGHub tower",
    },
} as const;

export const isMaintenanceModeOn = () => process.env.MAINTENANCE_MODE === "1";

export const isApiHost = (host: string | null) => (host ?? "").split(":")[0].toLowerCase().startsWith("api.");

/** Web sayfasi. status 503 = arama motorlari icin "gecici", 200 = /maintenance onizlemesi. */
export function maintenancePageResponse(locale: MaintenanceLocale, status: 200 | 503) {
    const headers: Record<string, string> = {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-robots-tag": "noindex",
    };
    if (status === 503) headers["retry-after"] = RETRY_AFTER_SECONDS;
    return new Response(renderMaintenancePage(locale), { status, headers });
}

/** Web'in kendi /api route handler'lari ve api host'unun geri kalani: JSON 503. */
export function maintenanceJsonResponse() {
    return new Response(JSON.stringify({ message: "maintenance", maintenance: true }), {
        status: 503,
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "retry-after": RETRY_AFTER_SECONDS },
    });
}

/**
 * Backend AppReleaseCheckDto'nun aynasi (GGHub.Application/Dtos/AppReleaseDtos.cs). Mobil AppReleaseGate
 * yalniz status'e bakar; "maintenance" gelince navigator yerine BlockedScreen acilir.
 */
export function appReleaseMaintenanceResponse(url: URL) {
    const platform = url.searchParams.get("platform") === "android" ? "android" : "ios";
    const body = {
        status: "maintenance",
        platform,
        currentVersion: url.searchParams.get("version") ?? "",
        minVersion: null,
        recommendedVersion: null,
        storeUrl: STORE_URLS[platform],
        maintenanceMessageTr: MOBILE_MESSAGE.tr,
        maintenanceMessageEn: MOBILE_MESSAGE.en,
    };
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
}

/*
 * Sahne (viewBox 720x420): solda buyuk kule vinc yerden sandik alip binanin tepesine birakir, sagda kucuk
 * vinc celik kiris tasir, binanin cephesinde "GGHub" tabelasi parlar, iskelede kaynak kivilcimi var.
 * Hareketler SMIL (animate/animateTransform): ic ice donusumlerde CSS transform-origin karisiyor, SMIL'de
 * her pivot kendi yerel koordinatinda. Azaltilmis hareket isteyen ziyaretcide pauseAnimations() ile durur.
 * Buyuk vinc dongusu 10 sn: keyTimes araba (x), halat boyu (y2), sandik gorunurlugu ayni zaman cizelgesinde.
 */
const CRANE_KEY_TIMES = "0;0.12;0.22;0.34;0.55;0.66;0.74;0.84;1";
const TROLLEY_X = "230 0;230 0;230 0;230 0;400 0;400 0;400 0;400 0;230 0";
const CABLE_Y = "150;300;300;150;150;174;174;150;150";
const LOAD_Y = "0 150;0 300;0 300;0 150;0 150;0 174;0 174;0 150;0 150";
const EASE = "0.45 0 0.55 1";
const SPLINES = Array(8).fill(EASE).join(";");

const SCENE_SVG = (label: string) => `
<svg class="scene" viewBox="0 0 720 420" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#22d3ee"/><stop offset="0.5" stop-color="#3b82f6"/><stop offset="1" stop-color="#d946ef"/>
    </linearGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="720" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0f172a" stop-opacity="0"/><stop offset="0.12" stop-color="#0f172a"/>
      <stop offset="0.88" stop-color="#0f172a"/><stop offset="1" stop-color="#0f172a" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="groundLine" x1="0" y1="0" x2="720" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#475569" stop-opacity="0"/><stop offset="0.12" stop-color="#475569"/>
      <stop offset="0.88" stop-color="#475569"/><stop offset="1" stop-color="#475569" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="groundDown" x1="0" y1="340" x2="0" y2="420" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/>
    </linearGradient>
    <mask id="groundMask"><rect x="0" y="340" width="720" height="80" fill="url(#groundDown)"/></mask>
    <linearGradient id="tower" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1e293b"/><stop offset="1" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="glowC" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#22d3ee" stop-opacity="0.35"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></radialGradient>
    <radialGradient id="glowF" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#d946ef" stop-opacity="0.3"/><stop offset="1" stop-color="#d946ef" stop-opacity="0"/></radialGradient>
    <pattern id="hazard" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="8" height="16" fill="#fbbf24"/><rect x="8" width="8" height="16" fill="#111827"/>
      <animateTransform attributeName="patternTransform" type="translate" additive="sum" values="0 0;16 0" dur="1.6s" repeatCount="indefinite"/>
    </pattern>
    <clipPath id="signClip"><text x="425" y="262" text-anchor="middle" font-size="46" font-weight="800" font-family="inherit" letter-spacing="1">GGHub</text></clipPath>
    <g id="crate">
      <rect x="-15" y="0" width="30" height="24" rx="4" fill="url(#brand)"/>
      <rect x="-15" y="0" width="30" height="24" rx="4" fill="none" stroke="#fff" stroke-opacity="0.35"/>
      <path d="M-8 9h16a4 4 0 0 1 0 8h-1.5l-2-2h-9l-2 2H-8a4 4 0 0 1 0-8z" fill="#0b1020" fill-opacity="0.75"/>
      <circle cx="4" cy="13" r="1.2" fill="#fff"/><path d="M-5.5 13h3M-4 11.5v3" stroke="#fff" stroke-width="1.1" stroke-linecap="round"/>
    </g>
  </defs>

  <!-- arka plan isiltilari ve suzulen bulutlar -->
  <circle cx="180" cy="170" r="150" fill="url(#glowC)"/>
  <circle cx="560" cy="210" r="150" fill="url(#glowF)"/>
  <g fill="#94a3b8" fill-opacity="0.12">
    <g><ellipse cx="120" cy="40" rx="42" ry="10"/><ellipse cx="146" cy="34" rx="26" ry="9"/>
      <animateTransform attributeName="transform" type="translate" values="-60 0;780 0" dur="70s" repeatCount="indefinite"/></g>
    <g><ellipse cx="0" cy="70" rx="34" ry="8"/><ellipse cx="20" cy="64" rx="20" ry="7"/>
      <animateTransform attributeName="transform" type="translate" values="200 0;800 0;-100 0;200 0" keyTimes="0;0.6;0.6001;1" dur="90s" repeatCount="indefinite"/></g>
  </g>
  <g fill="#e2e8f0">
    <circle cx="300" cy="30" r="1.2"><animate attributeName="opacity" values="0.2;1;0.2" dur="3s" repeatCount="indefinite"/></circle>
    <circle cx="520" cy="54" r="1"><animate attributeName="opacity" values="1;0.2;1" dur="4s" repeatCount="indefinite"/></circle>
    <circle cx="660" cy="24" r="1.3"><animate attributeName="opacity" values="0.3;1;0.3" dur="2.6s" repeatCount="indefinite"/></circle>
    <circle cx="40" cy="110" r="1"><animate attributeName="opacity" values="0.2;0.9;0.2" dur="3.4s" repeatCount="indefinite"/></circle>
  </g>

  <!-- zemin -->
  <rect x="0" y="340" width="720" height="80" fill="url(#ground)" mask="url(#groundMask)"/>
  <line x1="0" y1="340" x2="720" y2="340" stroke="url(#groundLine)" stroke-width="2"/>
  <line x1="40" y1="352" x2="680" y2="352" stroke="#1e293b" stroke-width="1" stroke-dasharray="14 10">
    <animate attributeName="stroke-dashoffset" values="0;-48" dur="3s" repeatCount="indefinite"/>
  </line>

  <!-- bina: iskele + kat pencereleri + GGHub tabelasi -->
  <g>
    <rect x="330" y="210" width="190" height="130" rx="4" fill="url(#tower)" stroke="#334155"/>
    <g stroke="#475569" stroke-width="1.5" opacity="0.8">
      <line x1="322" y1="200" x2="322" y2="340"/><line x1="528" y1="200" x2="528" y2="340"/>
      <line x1="322" y1="280" x2="528" y2="280"/><line x1="322" y1="310" x2="528" y2="310"/>
      <line x1="322" y1="280" x2="352" y2="310"/><line x1="498" y1="280" x2="528" y2="310"/>
      <line x1="352" y1="310" x2="322" y2="340"/><line x1="528" y1="340" x2="498" y2="310"/>
    </g>
    <g fill="#38bdf8">
      <rect x="350" y="290" width="18" height="12" rx="2" opacity="0.15"><animate attributeName="opacity" values="0.15;0.9;0.9;0.15" keyTimes="0;0.1;0.6;1" dur="5s" begin="0s" repeatCount="indefinite"/></rect>
      <rect x="380" y="290" width="18" height="12" rx="2" opacity="0.15"><animate attributeName="opacity" values="0.15;0.9;0.9;0.15" keyTimes="0;0.1;0.6;1" dur="5s" begin="1s" repeatCount="indefinite"/></rect>
      <rect x="410" y="290" width="18" height="12" rx="2" opacity="0.15"><animate attributeName="opacity" values="0.15;0.9;0.9;0.15" keyTimes="0;0.1;0.6;1" dur="5s" begin="2s" repeatCount="indefinite"/></rect>
      <rect x="440" y="290" width="18" height="12" rx="2" opacity="0.15"><animate attributeName="opacity" values="0.15;0.9;0.9;0.15" keyTimes="0;0.1;0.6;1" dur="5s" begin="3s" repeatCount="indefinite"/></rect>
      <rect x="470" y="290" width="18" height="12" rx="2" opacity="0.15"><animate attributeName="opacity" values="0.15;0.9;0.9;0.15" keyTimes="0;0.1;0.6;1" dur="5s" begin="4s" repeatCount="indefinite"/></rect>
      <rect x="350" y="318" width="18" height="12" rx="2" opacity="0.15"><animate attributeName="opacity" values="0.15;0.8;0.8;0.15" keyTimes="0;0.1;0.6;1" dur="6s" begin="2.5s" repeatCount="indefinite"/></rect>
      <rect x="440" y="318" width="18" height="12" rx="2" opacity="0.15"><animate attributeName="opacity" values="0.15;0.8;0.8;0.15" keyTimes="0;0.1;0.6;1" dur="6s" begin="0.5s" repeatCount="indefinite"/></rect>
      <rect x="470" y="318" width="18" height="12" rx="2" opacity="0.15"><animate attributeName="opacity" values="0.15;0.8;0.8;0.15" keyTimes="0;0.1;0.6;1" dur="6s" begin="4.2s" repeatCount="indefinite"/></rect>
    </g>
    <rect x="400" y="318" width="28" height="22" rx="2" fill="#0f172a" stroke="#475569"/>
    <text x="425" y="262" text-anchor="middle" font-size="46" font-weight="800" font-family="inherit" letter-spacing="1" fill="url(#brand)">GGHub</text>
    <g clip-path="url(#signClip)">
      <rect x="300" y="215" width="60" height="60" fill="url(#shine)" opacity="0.9">
        <animateTransform attributeName="transform" type="translate" values="0 0;0 0;260 0" keyTimes="0;0.55;1" dur="4.5s" repeatCount="indefinite"/>
      </rect>
    </g>
  </g>

  <!-- binanin tepesine birakilan sandik (sahne 0.74'te belirir, dongu sonunda sonar) -->
  <use href="#crate" x="400" y="186" opacity="0">
    <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.739;0.74;0.93;1" dur="10s" repeatCount="indefinite"/>
  </use>
  <!-- yerdeki palet: vinc almadan once duruyor, yenisi geri geliyor -->
  <rect x="208" y="336" width="44" height="4" rx="1" fill="#78350f"/>
  <use href="#crate" x="230" y="312">
    <animate attributeName="opacity" values="1;1;0;0;1;1" keyTimes="0;0.219;0.22;0.86;0.92;1" dur="10s" repeatCount="indefinite"/>
  </use>

  <!-- kaynak kivilcimlari -->
  <g transform="translate(332 300)">
    <circle r="3" fill="#fde68a"><animate attributeName="opacity" values="1;0.3;1;0.6;1" dur="0.4s" repeatCount="indefinite"/></circle>
    <g fill="#fbbf24">
      <circle r="1.4"><animateTransform attributeName="transform" type="translate" values="0 0;-14 -10;-20 6" dur="0.9s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0.8;0" dur="0.9s" repeatCount="indefinite"/></circle>
      <circle r="1.2"><animateTransform attributeName="transform" type="translate" values="0 0;-8 -14;-12 4" dur="0.7s" begin="0.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0.8;0" dur="0.7s" begin="0.2s" repeatCount="indefinite"/></circle>
      <circle r="1"><animateTransform attributeName="transform" type="translate" values="0 0;-18 -4;-24 10" dur="1s" begin="0.45s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0.7;0" dur="1s" begin="0.45s" repeatCount="indefinite"/></circle>
    </g>
  </g>

  <!-- BUYUK VINC (sol) -->
  <g>
    <g stroke="#f59e0b" stroke-width="2.5" fill="none" stroke-linejoin="round">
      <line x1="100" y1="340" x2="100" y2="100"/><line x1="120" y1="340" x2="120" y2="100"/>
      <path d="M100 340L120 316L100 292L120 268L100 244L120 220L100 196L120 172L100 148L120 124L100 100"/>
      <!-- ana kol (jib) -->
      <line x1="110" y1="90" x2="470" y2="90"/><line x1="110" y1="100" x2="470" y2="100"/>
      <path d="M110 100L125 90L140 100L155 90L170 100L185 90L200 100L215 90L230 100L245 90L260 100L275 90L290 100L305 90L320 100L335 90L350 100L365 90L380 100L395 90L410 100L425 90L440 100L455 90L470 100"/>
      <!-- karsi kol -->
      <line x1="40" y1="90" x2="110" y2="90"/><line x1="40" y1="100" x2="110" y2="100"/>
      <path d="M40 100L55 90L70 100L85 90L100 100"/>
      <!-- tepe ve gergi halatlari -->
      <path d="M100 90L110 56L120 90"/>
    </g>
    <g stroke="#94a3b8" stroke-width="1" opacity="0.7"><line x1="110" y1="56" x2="470" y2="90"/><line x1="110" y1="56" x2="44" y2="90"/></g>
    <rect x="42" y="100" width="34" height="22" rx="2" fill="#475569"/>
    <rect x="122" y="100" width="22" height="18" rx="3" fill="#f59e0b"/><rect x="127" y="104" width="12" height="7" rx="1" fill="#0f172a" opacity="0.8"/>
    <circle cx="110" cy="54" r="3.5" fill="#ef4444"><animate attributeName="opacity" values="1;0.15;1" dur="1.4s" repeatCount="indefinite"/></circle>
    <circle cx="470" cy="88" r="3" fill="#ef4444"><animate attributeName="opacity" values="0.15;1;0.15" dur="1.4s" repeatCount="indefinite"/></circle>
    <!-- araba + halat + kanca + sandik -->
    <g>
      <animateTransform attributeName="transform" type="translate" values="${TROLLEY_X}" keyTimes="${CRANE_KEY_TIMES}" calcMode="spline" keySplines="${SPLINES}" dur="10s" repeatCount="indefinite"/>
      <rect x="-10" y="100" width="20" height="7" rx="2" fill="#e2e8f0"/>
      <g>
        <animateTransform attributeName="transform" type="rotate" values="-2.5 0 107;2.5 0 107;-2.5 0 107" dur="2.6s" calcMode="spline" keyTimes="0;0.5;1" keySplines="${EASE};${EASE}" repeatCount="indefinite"/>
        <line x1="-2" y1="107" x2="-2" y2="150" stroke="#cbd5e1" stroke-width="1.2"><animate attributeName="y2" values="${CABLE_Y}" keyTimes="${CRANE_KEY_TIMES}" calcMode="spline" keySplines="${SPLINES}" dur="10s" repeatCount="indefinite"/></line>
        <line x1="2" y1="107" x2="2" y2="150" stroke="#cbd5e1" stroke-width="1.2"><animate attributeName="y2" values="${CABLE_Y}" keyTimes="${CRANE_KEY_TIMES}" calcMode="spline" keySplines="${SPLINES}" dur="10s" repeatCount="indefinite"/></line>
        <g>
          <animateTransform attributeName="transform" type="translate" values="${LOAD_Y}" keyTimes="${CRANE_KEY_TIMES}" calcMode="spline" keySplines="${SPLINES}" dur="10s" repeatCount="indefinite"/>
          <rect x="-5" y="0" width="10" height="6" rx="2" fill="#f59e0b"/>
          <path d="M0 6v3a2.5 2.5 0 1 1-2.5 2.5" stroke="#e2e8f0" stroke-width="1.6" fill="none" stroke-linecap="round"/>
          <use href="#crate" x="0" y="12" opacity="0">
            <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.219;0.22;0.739;0.74;1" dur="10s" repeatCount="indefinite"/>
          </use>
        </g>
      </g>
    </g>
  </g>

  <!-- KUCUK VINC (sag): celik kiris tasir -->
  <g>
    <g stroke="#f59e0b" stroke-width="2" fill="none" stroke-linejoin="round">
      <line x1="612" y1="340" x2="612" y2="150"/><line x1="628" y1="340" x2="628" y2="150"/>
      <path d="M612 340L628 320L612 300L628 280L612 260L628 240L612 220L628 200L612 180L628 160L612 150"/>
      <line x1="540" y1="140" x2="680" y2="140"/><line x1="540" y1="148" x2="680" y2="148"/>
      <path d="M540 148L552 140L564 148L576 140L588 148L600 140L612 148L624 140L636 148L648 140L660 148L672 140L680 148"/>
      <path d="M612 140L620 116L628 140"/>
    </g>
    <g stroke="#94a3b8" stroke-width="1" opacity="0.7"><line x1="620" y1="116" x2="540" y2="140"/><line x1="620" y1="116" x2="680" y2="140"/></g>
    <rect x="660" y="148" width="22" height="16" rx="2" fill="#475569"/>
    <circle cx="620" cy="114" r="3" fill="#ef4444"><animate attributeName="opacity" values="1;0.15;1" dur="1.1s" repeatCount="indefinite"/></circle>
    <g>
      <animateTransform attributeName="transform" type="translate" values="590 0;552 0;552 0;590 0;590 0" keyTimes="0;0.35;0.5;0.85;1" calcMode="spline" keySplines="${EASE};${EASE};${EASE};${EASE}" dur="7s" repeatCount="indefinite"/>
      <rect x="-8" y="148" width="16" height="6" rx="2" fill="#e2e8f0"/>
      <g>
        <animateTransform attributeName="transform" type="rotate" values="2 0 154;-2 0 154;2 0 154" dur="2.2s" calcMode="spline" keyTimes="0;0.5;1" keySplines="${EASE};${EASE}" repeatCount="indefinite"/>
        <line x1="0" y1="154" x2="0" y2="196" stroke="#cbd5e1" stroke-width="1.2"><animate attributeName="y2" values="196;178;178;196;196" keyTimes="0;0.35;0.5;0.85;1" dur="7s" repeatCount="indefinite"/></line>
        <g>
          <animateTransform attributeName="transform" type="translate" values="0 196;0 178;0 178;0 196;0 196" keyTimes="0;0.35;0.5;0.85;1" dur="7s" repeatCount="indefinite"/>
          <path d="M0 0L-16 8M0 0L16 8" stroke="#cbd5e1" stroke-width="1"/>
          <rect x="-24" y="8" width="48" height="6" rx="1" fill="#f59e0b"/><rect x="-24" y="14" width="48" height="2" fill="#b45309"/>
        </g>
      </g>
    </g>
  </g>

  <!-- on plan: bariyer ve dubalar -->
  <rect x="22" y="356" width="120" height="14" rx="3" fill="url(#hazard)"/>
  <rect x="28" y="370" width="5" height="22" fill="#64748b"/><rect x="131" y="370" width="5" height="22" fill="#64748b"/>
  <circle cx="30" cy="352" r="4" fill="#f97316"><animate attributeName="opacity" values="1;0.2;1" dur="0.9s" repeatCount="indefinite"/></circle>
  <circle cx="134" cy="352" r="4" fill="#f97316"><animate attributeName="opacity" values="0.2;1;0.2" dur="0.9s" repeatCount="indefinite"/></circle>
  <g transform="translate(580 392)"><path d="M-12 0L-3 -34H3L12 0Z" fill="#f97316"/><rect x="-8" y="-20" width="16" height="5" fill="#fff" opacity="0.9"/><rect x="-14" y="0" width="28" height="4" rx="1" fill="#c2410c"/></g>
  <g transform="translate(650 392)"><path d="M-12 0L-3 -34H3L12 0Z" fill="#f97316"/><rect x="-8" y="-20" width="16" height="5" fill="#fff" opacity="0.9"/><rect x="-14" y="0" width="28" height="4" rx="1" fill="#c2410c"/></g>
</svg>`;

export function renderMaintenancePage(locale: MaintenanceLocale) {
    const t = COPY[locale];
    return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#020618">
<title>${t.docTitle}</title>
<link rel="icon" href="/icon-192.png">
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; }
  body {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 24px 16px; background: #020618; color: #e2e8f0;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background-image: radial-gradient(60rem 30rem at 15% -10%, rgba(34,211,238,.10), transparent 60%),
                      radial-gradient(50rem 30rem at 110% 110%, rgba(217,70,239,.10), transparent 60%);
  }
  main { width: 100%; max-width: 760px; text-align: center; }
  .logo { display: inline-block; font-size: 28px; font-weight: 800; letter-spacing: .5px; margin: 0 0 8px;
    background: linear-gradient(90deg,#22d3ee,#3b82f6,#d946ef); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .scene { display: block; width: 100%; height: auto; margin: 0 auto; }
  .badge { display: inline-flex; align-items: center; gap: 8px; margin-top: 8px; padding: 6px 12px; border-radius: 999px;
    font-size: 13px; font-weight: 600; color: #fde68a; background: rgba(245,158,11,.12); border: 1px solid rgba(245,158,11,.35); }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; animation: pulse 1.4s ease-in-out infinite; }
  h1 { margin: 16px 0 8px; font-size: clamp(28px, 6vw, 44px); line-height: 1.1; font-weight: 800; color: #f8fafc; }
  .lead { margin: 0 auto 6px; max-width: 560px; font-size: clamp(16px, 2.6vw, 19px); color: #cbd5e1; }
  .body { margin: 0 auto; max-width: 560px; font-size: 15px; color: #94a3b8; line-height: 1.55; }
  .bar { position: relative; overflow: hidden; height: 6px; max-width: 320px; margin: 24px auto 0; border-radius: 999px; background: rgba(148,163,184,.15); }
  .bar::after { content: ""; position: absolute; inset: 0; width: 40%; border-radius: inherit;
    background: linear-gradient(90deg,#22d3ee,#3b82f6,#d946ef); animation: slide 1.8s ease-in-out infinite; }
  footer { margin-top: 24px; font-size: 13px; color: #64748b; }
  @keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
  @media (prefers-reduced-motion: reduce) { .dot, .bar::after { animation: none; } .bar::after { width: 100%; } }
</style>
</head>
<body>
<main>
  <p class="logo">GGHub</p>
  ${SCENE_SVG(t.svgLabel)}
  <span class="badge"><span class="dot"></span>${t.badge}</span>
  <h1>${t.title}</h1>
  <p class="lead">${t.lead}</p>
  <p class="body">${t.body}</p>
  <div class="bar" aria-hidden="true"></div>
  <footer>${t.footer}</footer>
</main>
<script>
  try { if (matchMedia("(prefers-reduced-motion: reduce)").matches) document.querySelector(".scene").pauseAnimations(); } catch (e) {}
</script>
</body>
</html>`;
}
