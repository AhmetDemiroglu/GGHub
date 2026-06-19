"use client";

import { Trash2, Smartphone, Mail, Database, Scale, Check } from "lucide-react";
import { useCurrentLocale } from "@/core/contexts/locale-context";

type Section = { title: string; lead?: string; list?: string[]; after?: string };

const META = [
    { icon: Smartphone, color: "text-cyan-400" },
    { icon: Mail, color: "text-violet-400" },
    { icon: Database, color: "text-rose-400" },
    { icon: Scale, color: "text-emerald-400" },
];

const COPY = {
    "en-US": {
        title: "Delete Your Account & Data",
        intro: "You can permanently delete your GGHub account and all associated data at any time. This page explains how.",
        updated: "Last updated: 19 June 2026",
        contactTitle: "Questions?",
        contactLead: "For anything about account or data deletion, contact us at:",
        sections: [
            {
                title: "1. Delete in the app (fastest)",
                lead: "If you can sign in, you can delete your account directly in the app:",
                list: [
                    "Open GGHub and sign in",
                    "Go to Profile → Settings",
                    "Scroll to the “Danger Zone” section",
                    "Tap “Delete my account” and confirm",
                ],
                after: "Your account is deleted immediately, and the action cannot be undone.",
            },
            {
                title: "2. Request deletion by email",
                lead: "If you can no longer access the app, send us a deletion request:",
                list: [
                    "Email info@gghub.social from the address registered to your account",
                    "Use the subject line “Account deletion”",
                    "Include your username so we can locate the account",
                ],
                after: "After we verify ownership, your account and data are deleted within 30 days.",
            },
            {
                title: "3. What gets deleted",
                lead: "Deleting your account permanently removes:",
                list: [
                    "Your profile: username, email, bio, and photos",
                    "Your lists, follows, ratings, reviews, and comments",
                    "Your messages and notifications",
                ],
                after: "Your account is permanently anonymized. There is no undo.",
            },
            {
                title: "4. What we may retain",
                lead: "We only keep records we are legally required to retain (for example, to meet legal or security obligations). These are kept solely for the period the law requires and then deleted.",
            },
        ] as Section[],
    },
    tr: {
        title: "Hesabını ve Verilerini Sil",
        intro: "GGHub hesabını ve ona bağlı tüm verileri istediğin zaman kalıcı olarak silebilirsin. Bu sayfa nasıl yapacağını anlatır.",
        updated: "Son güncelleme: 19 Haziran 2026",
        contactTitle: "Soruların mı var?",
        contactLead: "Hesap veya veri silmeyle ilgili her şey için bize ulaş:",
        sections: [
            {
                title: "1. Uygulama içinden sil (en hızlısı)",
                lead: "Giriş yapabiliyorsan hesabını doğrudan uygulama içinden silebilirsin:",
                list: [
                    "GGHub'ı aç ve giriş yap",
                    "Profil → Ayarlar adımına git",
                    "“Tehlikeli Alan” bölümüne in",
                    "“Hesabımı sil” seçeneğine dokun ve onayla",
                ],
                after: "Hesabın anında silinir ve bu işlem geri alınamaz.",
            },
            {
                title: "2. E-posta ile silme talebi",
                lead: "Uygulamaya artık erişemiyorsan bize silme talebi gönder:",
                list: [
                    "Hesabına kayıtlı e-posta adresinden info@gghub.social adresine yaz",
                    "Konu satırına “Hesap silme” yaz",
                    "Hesabı bulabilmemiz için kullanıcı adını ekle",
                ],
                after: "Hesabın sahibi olduğunu doğruladıktan sonra hesabın ve verilerin 30 gün içinde silinir.",
            },
            {
                title: "3. Neler silinir",
                lead: "Hesabını silmek şunları kalıcı olarak kaldırır:",
                list: [
                    "Profilin: kullanıcı adı, e-posta, biyografi ve fotoğraflar",
                    "Listelerin, takiplerin, puanların, yorumların ve değerlendirmelerin",
                    "Mesajların ve bildirimlerin",
                ],
                after: "Hesabın kalıcı olarak anonimleştirilir. Geri alınamaz.",
            },
            {
                title: "4. Neleri saklayabiliriz",
                lead: "Yalnızca yasal olarak saklamak zorunda olduğumuz kayıtları (örneğin yasal veya güvenlik yükümlülüklerini karşılamak için) tutarız. Bunlar yalnızca yasanın gerektirdiği süre boyunca saklanır ve ardından silinir.",
            },
        ] as Section[],
    },
} as const;

export default function DataDeletionPage() {
    const locale = useCurrentLocale();
    const t = COPY[locale] ?? COPY["en-US"];

    return (
        <div className="w-full h-full p-5">
            <div className="space-y-6">
                {/* Hero */}
                <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/60 px-6 py-12 text-center">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.12),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(139,92,246,0.12),_transparent_60%)]"
                    />
                    <div className="relative flex flex-col items-center gap-4">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/15 to-violet-500/15 text-rose-400">
                            <Trash2 className="h-8 w-8" />
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
                                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-rose-400/80" />
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
                    <section className="rounded-2xl border border-border/50 bg-gradient-to-br from-rose-500/5 to-violet-500/5 p-6 transition-colors hover:border-border">
                        <div className="flex items-center gap-3">
                            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/50 text-rose-400">
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
