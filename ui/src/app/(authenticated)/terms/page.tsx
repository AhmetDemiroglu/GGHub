"use client";

import { FileText, Handshake, Gamepad2, UserCog, ShieldAlert, MessageSquare, Flag, Copyright, Plug, AlertTriangle, LogOut, Scale, X } from "lucide-react";
import { AppDownloadCTA } from "@core/components/other/public/app-cta";
import { useCurrentLocale } from "@/core/contexts/locale-context";

type Section = { title: string; lead?: string; list?: string[]; deny?: boolean; after?: string };

const META = [
    { icon: Handshake, color: "text-cyan-400" },
    { icon: Gamepad2, color: "text-violet-400" },
    { icon: UserCog, color: "text-amber-400" },
    { icon: ShieldAlert, color: "text-rose-400" },
    { icon: MessageSquare, color: "text-blue-400" },
    { icon: Flag, color: "text-orange-400" },
    { icon: Copyright, color: "text-fuchsia-400" },
    { icon: Plug, color: "text-emerald-400" },
    { icon: AlertTriangle, color: "text-amber-400" },
    { icon: LogOut, color: "text-teal-400" },
];

const COPY = {
    "en-US": {
        title: "Terms of Use",
        intro: "Rules everyone follows so the GGHub community stays fair, safe, and fun. By using the platform you accept these terms.",
        updated: "Last updated: 17 June 2026",
        lawTitle: "11. Governing Law and Jurisdiction",
        lawBody: "These terms of use are governed by Turkish Law. Disputes are resolved under the general jurisdiction rules of the Code of Civil Procedure no. 6100.",
        sections: [
            { title: "1. Parties and Acceptance", lead: "These terms apply to everyone who accesses or registers on the GGHub platform. By using the platform you declare that you have read, understood, and accepted these terms. The terms may be updated from time to time; a change in the date above means the new version is in effect." },
            { title: "2. Scope of Service", lead: "GGHub is an online platform that lets users create and share game lists, follow other players, and build game-focused social interactions. New features may be added or existing ones changed." },
            {
                title: "3. Membership and Account Security",
                list: [
                    "You are responsible for providing accurate, up-to-date information when registering.",
                    "Keeping your account credentials confidential is your responsibility.",
                    "You are responsible for all activity carried out through your account.",
                    "If you notice unauthorized use, you must notify us within a reasonable time.",
                    "Fake accounts may be suspended or permanently closed.",
                ],
            },
            {
                title: "4. Prohibited Behavior",
                lead: "You may not use the platform in violation of the law, public order, or these terms. The following are strictly prohibited:",
                deny: true,
                list: [
                    "Posts containing insults, threats, harassment, or hate speech",
                    "Illegal content, or content that infringes copyright or others' privacy",
                    "Spam, automated messages, or misleading redirection",
                    "Attempts to test or weaken platform security",
                    "Using or impersonating another user without permission",
                ],
            },
            { title: "5. User Content", lead: "You are responsible for the lists, reviews, profile information, and other content you share, and you accept that it does not infringe the rights of third parties. By uploading content, you allow it to be displayed and stored for the purpose of providing the service; this permission does not transfer ownership to GGHub." },
            {
                title: "6. Content Moderation and Reporting",
                lead: "GGHub has zero tolerance for objectionable content and abusive behavior. To keep the community safe:",
                list: [
                    "You can report any content or profile via the Report option in its menu.",
                    "You can block users who bother you.",
                    "Reports are reviewed by our team; we act on violating content and accounts within 24 hours.",
                    "Content that breaks the rules may be removed without prior notice.",
                ],
            },
            { title: "7. Intellectual Property", lead: "The design, name, logo, software, and visual elements of the platform belong to GGHub. They may not be copied, sold, redistributed, or used to create derivative works without written permission." },
            { title: "8. Third-Party Services", lead: "The platform may obtain data from third-party services (such as game catalogs or authentication services) for some features. The relevant provider is responsible for the content and continuity of those services." },
            { title: "9. Limitation of Liability", lead: "The platform is provided as is. GGHub cannot be held liable for indirect damages arising from access interruptions, maintenance, technical faults, or data loss. You use the platform at your own responsibility." },
            { title: "10. Termination and Account Closure", lead: "You can terminate your account at any time from within the app. GGHub also reserves the right to terminate accounts that violate community rules, pose a security risk, or are found to be malicious." },
        ] as Section[],
    },
    tr: {
        title: "Kullanım Şartları",
        intro: "GGHub topluluğunun adil, güvenli ve keyifli kalması için herkesin uyduğu kurallar. Platformu kullanarak bu şartları kabul etmiş olursun.",
        updated: "Son güncelleme: 17 Haziran 2026",
        lawTitle: "11. Uygulanacak Hukuk ve Yetki",
        lawBody: "Bu kullanım şartları Türk Hukukuna tabidir. Uyuşmazlıkların çözümünde 6100 sayılı Hukuk Muhakemeleri Kanunu'nun genel yetki kuralları uygulanır.",
        sections: [
            { title: "1. Taraflar ve Kabul", lead: "Bu şartlar, GGHub platformuna erişen veya kayıt olan herkes için geçerlidir. Platformu kullanarak şartları okuduğunu, anladığını ve kabul ettiğini beyan etmiş olursun. Şartlar zaman zaman güncellenebilir; üstteki tarihin değişmesi yeni sürümün yürürlükte olduğu anlamına gelir." },
            { title: "2. Hizmetin Konusu", lead: "GGHub; kullanıcıların oyun listeleri oluşturmasına, bunları paylaşmasına, diğer oyuncuları takip etmesine ve oyun odaklı sosyal etkileşim kurmasına imkan veren çevrimiçi bir platformdur. Yeni özellikler eklenebilir veya mevcut özellikler değiştirilebilir." },
            {
                title: "3. Üyelik ve Hesap Güvenliği",
                list: [
                    "Kayıt olurken doğru ve güncel bilgi vermekle yükümlüsün.",
                    "Hesap bilgilerinin gizliliğini korumak senin sorumluluğundadır.",
                    "Hesabın üzerinden yapılan tüm işlemlerden sen sorumlu olursun.",
                    "Yetkisiz bir kullanım fark edersen makul sürede bize bildirmelisin.",
                    "Sahte hesaplar askıya alınabilir veya kalıcı olarak kapatılabilir.",
                ],
            },
            {
                title: "4. Yasaklı Davranışlar",
                lead: "Platformu hukuka, kamu düzenine ve bu şartlara aykırı kullanamazsın. Aşağıdakiler kesinlikle yasaktır:",
                deny: true,
                list: [
                    "Hakaret, tehdit, taciz ve nefret söylemi içeren paylaşımlar",
                    "Yasadışı, telif hakkını veya başkalarının gizliliğini ihlal eden içerik",
                    "Spam, otomatik mesaj veya yanıltıcı yönlendirme",
                    "Platformun güvenliğini test etme veya zayıflatma girişimleri",
                    "Başka bir kullanıcıyı izinsiz kullanma veya taklit etme",
                ],
            },
            { title: "5. Kullanıcı İçerikleri", lead: "Paylaştığın listeler, yorumlar, profil bilgileri ve diğer içeriklerin sorumluluğu sana aittir ve bunların üçüncü kişilerin haklarını ihlal etmediğini kabul edersin. İçerik yükleyerek, bunun hizmetin sunulması amacıyla görüntülenmesine ve saklanmasına izin verirsin; bu izin içeriğin mülkiyetinin GGHub'a geçtiği anlamına gelmez." },
            {
                title: "6. İçerik Moderasyonu ve Raporlama",
                lead: "GGHub, uygunsuz içeriğe ve kötü niyetli davranışa karşı sıfır tolerans uygular. Topluluğu güvende tutmak için:",
                list: [
                    "Her içeriği ve profili menüden Raporla seçeneğiyle bildirebilirsin.",
                    "Rahatsız eden kullanıcıları engelleyebilirsin.",
                    "Bildirimler ekibimizce incelenir; ihlal eden içerik ve hesaplara karşı 24 saat içinde işlem yapılır.",
                    "Kurallara aykırı içerik bildirim yapılmadan da kaldırılabilir.",
                ],
            },
            { title: "7. Fikri Mülkiyet Hakları", lead: "Platformun tasarımı, adı, logosu, yazılımı ve görsel unsurları GGHub'a aittir. Yazılı izin olmadan kopyalanamaz, satılamaz, yeniden dağıtılamaz veya türev çalışmalar yapılamaz." },
            { title: "8. Üçüncü Taraf Hizmetler", lead: "Platform bazı özellikler için üçüncü taraf servislerden (oyun katalogları, kimlik doğrulama hizmetleri gibi) veri alabilir. Bu servislerin içerik ve sürekliliğinden ilgili sağlayıcı sorumludur." },
            { title: "9. Sorumluluğun Sınırlandırılması", lead: "Platform olduğu gibi sunulur. Erişim kesintileri, bakım çalışmaları, teknik arızalar veya veri kaybı gibi durumlardan doğan dolaylı zararlardan GGHub sorumlu tutulamaz. Platformu kendi sorumluluğunda kullanırsın." },
            { title: "10. Fesih ve Hesap Kapatma", lead: "Dilediğin zaman hesabını uygulama içinden sonlandırabilirsin. GGHub da topluluk kurallarını ihlal eden, güvenlik riski oluşturan veya kötü niyetli olduğu tespit edilen hesapları sonlandırma hakkına sahiptir." },
        ] as Section[],
    },
} as const;

export default function TermsPage() {
    const locale = useCurrentLocale();
    const t = COPY[locale] ?? COPY["en-US"];

    return (
        <div className="w-full h-full p-5">
            <div className="space-y-6">
                {/* Hero */}
                <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/60 px-6 py-12 text-center">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.12),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(34,211,238,0.12),_transparent_60%)]"
                    />
                    <div className="relative flex flex-col items-center gap-4">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/15 to-cyan-500/15 text-violet-400">
                            <FileText className="h-8 w-8" />
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
                                            {s.list.map((item) =>
                                                s.deny ? (
                                                    <li key={item} className="flex items-start gap-2.5">
                                                        <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-400/80" />
                                                        <span>{item}</span>
                                                    </li>
                                                ) : (
                                                    <li key={item} className="flex items-start gap-2.5">
                                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/70" />
                                                        <span>{item}</span>
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    ) : null}
                                    {s.after ? <p>{s.after}</p> : null}
                                </div>
                            </section>
                        );
                    })}

                    {/* Uygulanacak hukuk, full width */}
                    <div className="md:col-span-2 rounded-2xl border border-border/50 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 p-6">
                        <div className="flex items-start gap-4">
                            <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/50 text-violet-400">
                                <Scale className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold tracking-tight">{t.lawTitle}</h2>
                                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.lawBody}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <AppDownloadCTA />
            </div>
        </div>
    );
}
