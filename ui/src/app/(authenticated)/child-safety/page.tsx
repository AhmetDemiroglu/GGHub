"use client";

import { ShieldCheck, Ban, Flag, Scale, Mail, Check } from "lucide-react";
import { useCurrentLocale } from "@/core/contexts/locale-context";

type Section = { title: string; lead?: string; list?: string[]; after?: string };

const META = [
    { icon: Ban, color: "text-rose-400" },
    { icon: ShieldCheck, color: "text-emerald-400" },
    { icon: Flag, color: "text-amber-400" },
    { icon: Scale, color: "text-cyan-400" },
];

const COPY = {
    "en-US": {
        title: "Child Safety Standards",
        intro: "GGHub has zero tolerance for child sexual abuse and exploitation (CSAE). This page explains our standards and how to report concerns.",
        updated: "Last updated: 20 June 2026",
        contactTitle: "Child safety contact",
        contactLead: "To report a child safety concern, contact us at:",
        sections: [
            {
                title: "1. Our commitment",
                lead: "We strictly prohibit child sexual abuse and exploitation (CSAE) and child sexual abuse material (CSAM). Any such content or behavior is forbidden on GGHub and is removed.",
            },
            {
                title: "2. Prevention and moderation",
                lead: "We work to keep GGHub safe through:",
                list: [
                    "Tools to report content and users, and to block other users",
                    "Review of reported content by our moderators",
                    "Action on violations: content removal and suspension or permanent termination of accounts",
                ],
            },
            {
                title: "3. How to report",
                lead: "If you see content or behavior that puts a child at risk:",
                list: [
                    "Use the report option on a profile, comment, review, or list, in the app or on the web",
                    "Or email info@gghub.social with the subject “Child safety”",
                ],
                after: "We treat child safety reports as a priority and act on them quickly.",
            },
            {
                title: "4. Legal compliance",
                lead: "We comply with applicable child safety laws. When we become aware of apparent CSAM, we remove it and report it to the relevant authorities, including the National Center for Missing and Exploited Children (NCMEC) where applicable.",
            },
        ] as Section[],
    },
    tr: {
        title: "Çocuk Güvenliği Standartları",
        intro: "GGHub, çocukların cinsel istismarı ve sömürüsüne (CSAE) karşı sıfır tolerans uygular. Bu sayfa standartlarımızı ve nasıl bildirim yapılacağını anlatır.",
        updated: "Son güncelleme: 20 Haziran 2026",
        contactTitle: "Çocuk güvenliği iletişim",
        contactLead: "Çocuk güvenliğiyle ilgili bir endişeyi bildirmek için bize ulaş:",
        sections: [
            {
                title: "1. Taahhüdümüz",
                lead: "Çocukların cinsel istismarı ve sömürüsünü (CSAE) ve çocukların cinsel istismarı nitelikli materyali (CSAM) kesinlikle yasaklıyoruz. Bu tür içerik veya davranış GGHub'da yasaktır ve kaldırılır.",
            },
            {
                title: "2. Önleme ve moderasyon",
                lead: "GGHub'ı güvenli tutmak için:",
                list: [
                    "İçerik ve kullanıcıları bildirme, diğer kullanıcıları engelleme araçları sunarız",
                    "Bildirilen içerik moderatörlerimiz tarafından incelenir",
                    "İhlallerde harekete geçeriz: içerik kaldırma ve hesabı askıya alma veya kalıcı olarak kapatma",
                ],
            },
            {
                title: "3. Nasıl bildirilir",
                lead: "Bir çocuğu riske atan içerik veya davranış görürsen:",
                list: [
                    "Uygulamada veya web'de bir profil, yorum, değerlendirme ya da listedeki bildirme seçeneğini kullan",
                    "Ya da info@gghub.social adresine “Çocuk güvenliği” konusuyla e-posta gönder",
                ],
                after: "Çocuk güvenliği bildirimlerini öncelikli sayar ve hızla işleme alırız.",
            },
            {
                title: "4. Yasal uyumluluk",
                lead: "Geçerli çocuk güvenliği yasalarına uyarız. Açık bir CSAM tespit ettiğimizde içeriği kaldırır ve uygun olduğunda Ulusal Kayıp ve İstismara Uğrayan Çocuklar Merkezi (NCMEC) dahil ilgili yetkililere bildiririz.",
            },
        ] as Section[],
    },
} as const;

export default function ChildSafetyPage() {
    const locale = useCurrentLocale();
    const t = COPY[locale] ?? COPY["en-US"];

    return (
        <div className="w-full h-full p-5">
            <div className="space-y-6">
                {/* Hero */}
                <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/60 px-6 py-12 text-center">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(34,211,238,0.12),_transparent_60%)]"
                    />
                    <div className="relative flex flex-col items-center gap-4">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-cyan-500/15 text-emerald-400">
                            <ShieldCheck className="h-8 w-8" />
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
                                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/80" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : null}
                                    {s.after ? <p className="font-medium text-foreground/80">{s.after}</p> : null}
                                </div>
                            </section>
                        );
                    })}

                    {/* Contact */}
                    <section className="rounded-2xl border border-border/50 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 p-6 transition-colors hover:border-border">
                        <div className="flex items-center gap-3">
                            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/50 text-emerald-400">
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
            </div>
        </div>
    );
}
