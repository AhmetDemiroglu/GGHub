"use client";

import { Shield, Info, Database, Target, Cookie, Share2, Clock, UserCheck, Lock, RefreshCw, Mail, Check } from "lucide-react";
import { AppDownloadCTA } from "@core/components/other/public/app-cta";
import { useCurrentLocale } from "@/core/contexts/locale-context";

type Section = { title: string; lead?: string; list?: string[]; after?: string };

const META = [
    { icon: Info, color: "text-cyan-400" },
    { icon: Database, color: "text-violet-400" },
    { icon: Target, color: "text-amber-400" },
    { icon: Cookie, color: "text-orange-400" },
    { icon: Share2, color: "text-blue-400" },
    { icon: Clock, color: "text-emerald-400" },
    { icon: UserCheck, color: "text-fuchsia-400" },
    { icon: Lock, color: "text-rose-400" },
    { icon: RefreshCw, color: "text-teal-400" },
];

const COPY = {
    "en-US": {
        title: "Privacy Policy",
        intro: "We explain in plain language what data we process, why, and how. We do not sell your data; we use it only to provide the service.",
        updated: "Last updated: 17 June 2026",
        contactTitle: "10. Contact",
        contactLead: "For privacy questions or requests, write to us:",
        sections: [
            { title: "1. Purpose", lead: "This policy explains what information you share when using the GGHub platform, and how and why it is processed. The privacy and security of your personal data is our priority." },
            {
                title: "2. Data We Collect",
                lead: "When you use the platform, the following types of data may be collected:",
                list: [
                    "Account information: username, email, profile details",
                    "Social sign-in: your name and email when you continue with Google or Apple",
                    "Usage data: lists you create, follows, ratings, and reviews",
                    "Technical data: IP address, device and browser info, session time",
                    "Cookie data: to keep your session active and remember preferences",
                ],
            },
            {
                title: "3. Purposes of Processing",
                list: [
                    "Running membership and sign-in processes",
                    "Providing list, follow, rating, review, and notification features",
                    "Keeping your account secure",
                    "Monitoring and improving platform performance",
                    "Meeting legal obligations",
                ],
            },
            { title: "4. Cookies", lead: "GGHub uses cookies to keep your session active, remember your preferences, and produce usage statistics. You can block cookies in your browser settings, but some features may be limited." },
            { title: "5. Data Sharing", lead: "Your personal data is not sold to third parties. Data may only be shared with infrastructure providers necessary to deliver the service (hosting, email, authentication). It may be shared with official authorities upon a lawful request." },
            { title: "6. Data Retention", lead: "While your account is active, the data required for it to function is retained. When you delete your account, your data is permanently deleted within a reasonable time, except for records that must be kept by law." },
            {
                title: "7. Your Rights",
                lead: "You can make a request about the following at any time:",
                list: [
                    "Learn what data we hold about you",
                    "Request correction of inaccurate or incomplete data",
                    "Request deletion of your account and data",
                    "Learn the purposes your data is used for",
                ],
                after: "You can also delete your account yourself in-app via Profile, Settings.",
            },
            { title: "8. Security", lead: "Reasonable technical and administrative measures are applied to protect your data against unauthorized access. However, no transmission over the internet can be guaranteed to be completely secure." },
            { title: "9. Policy Changes", lead: "This privacy policy may be updated from time to time. A change in the date at the top means the new version is in effect." },
        ] as Section[],
    },
    tr: {
        title: "Gizlilik Politikası",
        intro: "Hangi verileri, neden ve nasıl işlediğimizi açık bir dille anlatıyoruz. Verilerini satmıyor, sadece hizmeti sunmak için kullanıyoruz.",
        updated: "Son güncelleme: 17 Haziran 2026",
        contactTitle: "10. İletişim",
        contactLead: "Gizlilikle ilgili soruların veya taleplerin için bize yaz:",
        sections: [
            { title: "1. Amaç", lead: "Bu politika, GGHub platformunu kullanırken paylaştığın bilgilerin hangi amaçlarla ve nasıl işlendiğini açıklar. Kişisel verilerinin gizliliği ve güvenliği bizim için önceliklidir." },
            {
                title: "2. Toplanan Veriler",
                lead: "Platformu kullandığında aşağıdaki veri türleri toplanabilir:",
                list: [
                    "Hesap bilgileri: kullanıcı adı, e-posta, profil bilgileri",
                    "Sosyal giriş bilgileri: Google veya Apple ile devam ettiğinde ad ve e-posta",
                    "Kullanım verileri: oluşturulan listeler, takipler, puanlar ve yorumlar",
                    "Teknik veriler: IP adresi, cihaz ve tarayıcı bilgisi, oturum zamanı",
                    "Çerez verileri: oturumun açık kalması ve tercihlerin hatırlanması için",
                ],
            },
            {
                title: "3. Verilerin İşlenme Amaçları",
                list: [
                    "Üyelik ve giriş süreçlerini yürütmek",
                    "Liste, takip, puanlama, yorum ve bildirim özelliklerini sunmak",
                    "Hesabının güvenliğini sağlamak",
                    "Platform performansını izlemek ve geliştirmek",
                    "Yasal yükümlülükleri yerine getirmek",
                ],
            },
            { title: "4. Çerezler", lead: "GGHub; oturumunu açık tutmak, tercihlerini hatırlamak ve kullanım istatistiği oluşturmak için çerezler kullanır. Tarayıcı ayarlarından çerezleri engelleyebilirsin; ancak bazı özellikler kısıtlanabilir." },
            { title: "5. Verilerin Paylaşılması", lead: "Kişisel verilerin üçüncü kişilere satılmaz. Veriler yalnızca hizmetin sunulması için gerekli altyapı sağlayıcılarıyla (barındırma, e-posta, kimlik doğrulama servisleri gibi) paylaşılabilir. Yasal bir talep olması halinde resmi mercilerle paylaşım yapılabilir." },
            { title: "6. Veri Saklama Süresi", lead: "Hesabın aktif olduğu sürece, hesabın çalışması için gerekli veriler saklanır. Hesabını sildiğinde, yasal olarak saklanması gereken kayıtlar hariç olmak üzere verilerin makul süre içinde kalıcı olarak silinir." },
            {
                title: "7. Kullanıcı Hakların",
                lead: "Aşağıdaki konularda her zaman talepte bulunabilirsin:",
                list: [
                    "Hakkında hangi verilerin tutulduğunu öğrenme",
                    "Yanlış veya eksik verilerin düzeltilmesini isteme",
                    "Hesabının ve verilerinin silinmesini talep etme",
                    "Verilerinin hangi amaçlarla kullanıldığını öğrenme",
                ],
                after: "Hesabını uygulama içinden Profil, Ayarlar adımıyla kendin de silebilirsin.",
            },
            { title: "8. Güvenlik", lead: "Verilerinin yetkisiz erişime karşı korunması için makul teknik ve idari tedbirler uygulanır. Ancak internet üzerinden yapılan hiçbir aktarımın tamamen güvenli olduğu garanti edilemez." },
            { title: "9. Politika Değişiklikleri", lead: "Bu gizlilik politikası zaman zaman güncellenebilir. Sayfanın üstündeki tarihin değişmesi, yeni sürümün yürürlükte olduğu anlamına gelir." },
        ] as Section[],
    },
} as const;

export default function PrivacyPage() {
    const locale = useCurrentLocale();
    const t = COPY[locale] ?? COPY["en-US"];

    return (
        <div className="w-full h-full p-5">
            <div className="space-y-6">
                {/* Hero */}
                <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/60 px-6 py-12 text-center">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(139,92,246,0.12),_transparent_60%)]"
                    />
                    <div className="relative flex flex-col items-center gap-4">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/15 to-violet-500/15 text-cyan-400">
                            <Shield className="h-8 w-8" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t.title}</h1>
                        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{t.intro}</p>
                        <p className="text-xs text-muted-foreground/70">{t.updated}</p>
                    </div>
                </section>

                {/* Sections */}
                <div className="grid gap-4 md:grid-cols-2">
                    {t.sections.map((s, i) => {
                        const Icon = META[i].icon;
                        return (
                            <section key={s.title} className="rounded-2xl border border-border/50 bg-card/60 p-6 transition-colors hover:border-border">
                                <div className="flex items-center gap-3">
                                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/50 ${META[i].color}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <h2 className="text-base font-semibold tracking-tight">{s.title}</h2>
                                </div>
                                <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                                    {s.lead ? <p>{s.lead}</p> : null}
                                    {s.list ? (
                                        <ul className="space-y-2">
                                            {s.list.map((item) => (
                                                <li key={item} className="flex items-start gap-2.5">
                                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400/80" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : null}
                                    {s.after ? <p>{s.after}</p> : null}
                                </div>
                            </section>
                        );
                    })}

                    {/* İletişim, 9'un yanındaki boşluğu doldurur */}
                    <section className="rounded-2xl border border-border/50 bg-gradient-to-br from-cyan-500/5 to-violet-500/5 p-6 transition-colors hover:border-border">
                        <div className="flex items-center gap-3">
                            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/50 text-cyan-400">
                                <Mail className="h-5 w-5" />
                            </div>
                            <h2 className="text-base font-semibold tracking-tight">{t.contactTitle}</h2>
                        </div>
                        <div className="mt-4 text-sm leading-relaxed text-muted-foreground">
                            <p>
                                {t.contactLead}{" "}
                                <a href="mailto:info@gghub.social" className="font-medium text-primary hover:underline">
                                    info@gghub.social
                                </a>
                            </p>
                        </div>
                    </section>
                </div>

                <AppDownloadCTA />
            </div>
        </div>
    );
}
